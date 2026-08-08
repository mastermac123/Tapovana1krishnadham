#!/usr/bin/env node
/**
 * Drives the whole secretary journey against a running dev server:
 * sign in, publish, read on the public board, download, edit, delete.
 *
 *   npm run dev                      (in another terminal)
 *   node scripts/test-e2e.mjs        (defaults to http://localhost:3000)
 *   node scripts/test-e2e.mjs http://localhost:3410
 *
 * Runs server-side, so it is not subject to browser CORS — a pass here proves
 * the application logic; it does not prove the bucket's CORS policy. Use the
 * browser for that.
 *
 * Cleans up after itself: the document it publishes is deleted at the end.
 */

import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client.ts';

config({ path: ['.env.local', '.env'], quiet: true });

const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');

/**
 * The sign-in address comes from the database, not from .env.local — the
 * secretary can change it at /desk/account, which leaves the env file stale.
 */
const meta = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const account = await meta.secretary.findFirst({ select: { email: true } });
await meta.$disconnect();

const EMAIL = account?.email;
const PASSWORD = process.env.SEED_SECRETARY_PASSWORD;

let failed = 0;
function check(label, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  if (!ok) failed += 1;
  return ok;
}

/** Minimal cookie jar — Node's fetch does not keep cookies between calls. */
const jar = new Map();
function remember(res) {
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function call(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    redirect: 'manual',
    headers: { ...(init.headers ?? {}), cookie: cookieHeader() },
  });
  remember(res);
  return res;
}

const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  'latin1'
);
const TITLE = `End-to-end test ${Date.now()}`;

console.log(`\nTarget: ${BASE}\nAccount: ${EMAIL}\n`);

if (!EMAIL || !PASSWORD) {
  console.error('SEED_SECRETARY_EMAIL / SEED_SECRETARY_PASSWORD missing.');
  process.exit(1);
}

let documentId;

try {
  // 1 — the desk must be shut to anonymous callers
  const shut = await call('/desk/circular');
  check(
    'desk refuses an anonymous request',
    shut.status === 307 || shut.status === 302,
    `HTTP ${shut.status}`
  );

  // 2 — sign in
  const csrfRes = await call('/api/auth/csrf');
  const { csrfToken } = await csrfRes.json();
  check('got a CSRF token', Boolean(csrfToken));

  const signIn = await call('/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      csrfToken,
      email: EMAIL,
      password: PASSWORD,
      callbackUrl: BASE,
    }).toString(),
  });
  const signedIn = [...jar.keys()].some((k) => k.includes('session-token'));
  check('signed in', signedIn, `HTTP ${signIn.status}`);
  if (!signedIn) throw new Error('no session cookie — cannot continue');

  // 3 — the desk now opens
  const desk = await call('/desk/circular');
  check('desk opens for the secretary', desk.status === 200, `HTTP ${desk.status}`);

  // 4 — signed upload URL
  const urlRes = await call('/api/documents/upload-url', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'CIRCULAR',
      fileName: 'e2e-test.pdf',
      contentType: 'application/pdf',
      size: PDF.length,
    }),
  });
  const signed = await urlRes.json();
  check('got a signed upload URL', urlRes.status === 200 && Boolean(signed.url));
  check('URL carries no premature checksum', !String(signed.url).includes('x-amz-checksum'));

  // 5 — upload straight to R2
  const put = await fetch(signed.url, {
    method: 'PUT',
    body: PDF,
    headers: { 'content-type': 'application/pdf' },
  });
  check('uploaded to R2', put.ok, `HTTP ${put.status}`);

  // 6 — publish
  const pub = await call('/api/documents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'CIRCULAR',
      title: TITLE,
      description: 'Created by scripts/test-e2e.mjs',
      fileKey: signed.key,
      fileName: 'e2e-test.pdf',
    }),
  });
  const created = await pub.json();
  documentId = created.id;
  check('published', pub.status === 201 && Boolean(documentId), `HTTP ${pub.status}`);

  // 7 — visible on the public board, with no session
  const publicJar = new Map(jar);
  jar.clear();
  const board = await call('/notices');
  const boardHtml = await board.text();
  check('appears on the public notice board', boardHtml.includes(TITLE));

  // 8 — download redirects to a signed R2 URL
  const dl = await call(`/api/documents/${documentId}/download`);
  const location = dl.headers.get('location') ?? '';
  check(
    'download redirects to a signed URL',
    (dl.status === 302 || dl.status === 307) && location.includes('X-Amz-Signature'),
    `HTTP ${dl.status}`
  );
  const file = await fetch(location);
  const body = Buffer.from(await file.arrayBuffer());
  check('downloaded bytes match', file.ok && body.equals(PDF), `${body.length} bytes`);

  // restore the session for the write operations
  jar.clear();
  for (const [k, v] of publicJar) jar.set(k, v);

  // 9 — a stranger must not be able to edit
  const strangerJar = new Map(jar);
  jar.clear();
  const noAuth = await call(`/api/documents/${documentId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'hijacked' }),
  });
  check('anonymous edit refused', noAuth.status === 401, `HTTP ${noAuth.status}`);
  jar.clear();
  for (const [k, v] of strangerJar) jar.set(k, v);

  // 10 — edit
  const edited = `${TITLE} (edited)`;
  const patch = await call(`/api/documents/${documentId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: edited }),
  });
  check('edited', patch.status === 200, `HTTP ${patch.status}`);

  const after = await call('/notices');
  check('edit shows on the board', (await after.text()).includes(edited));

  // 11 — a file whose bytes disagree with its type must be refused
  const badUrl = await call('/api/documents/upload-url', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'CIRCULAR',
      fileName: 'not-really.pdf',
      contentType: 'application/pdf',
      size: 20,
    }),
  });
  const bad = await badUrl.json();
  await fetch(bad.url, {
    method: 'PUT',
    body: Buffer.from('\x7fELF\x02\x01\x01this is a binary'),
    headers: { 'content-type': 'application/pdf' },
  });
  const rejected = await call('/api/documents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'CIRCULAR',
      title: 'should never appear',
      description: '',
      fileKey: bad.key,
      fileName: 'not-really.pdf',
    }),
  });
  check(
    'executable disguised as PDF is refused',
    rejected.status === 400,
    `HTTP ${rejected.status}`
  );
} catch (e) {
  failed += 1;
  console.log(`  FAIL  threw — ${e.message}`);
} finally {
  if (documentId) {
    const del = await call(`/api/documents/${documentId}`, { method: 'DELETE' });
    check('deleted', del.status === 200, `HTTP ${del.status}`);
    const gone = await call('/notices');
    check('gone from the board', !(await gone.text()).includes(TITLE));
  }
}

console.log(failed ? `\n${failed} check(s) failed.\n` : '\nEverything works.\n');
process.exitCode = failed ? 1 : 0;
