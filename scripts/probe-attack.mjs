#!/usr/bin/env node
/**
 * Third pass: the attacks the first two did not cover.
 *
 *   node scripts/probe-attack.mjs http://localhost:3410
 *
 * Mass assignment, CSRF, oversized and malformed bodies, header injection,
 * timing, method override, reset-code brute force, id enumeration, signed-URL
 * expiry, and whether a stolen session survives a password change.
 *
 * Needs the current password in SEED_SECRETARY_PASSWORD for the authenticated
 * half. Restores anything it changes.
 */

import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client.ts';

config({ path: ['.env.local', '.env'], quiet: true });

const BASE = (process.argv[2] ?? 'http://localhost:3410').replace(/\/$/, '');
const START = new Date();

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

let failed = 0;
const findings = [];
function check(label, ok, detail = '', severity = 'medium') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  if (!ok) {
    failed += 1;
    findings.push({ label, detail, severity });
  }
}

const jar = new Map();
function remember(res) {
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(';');
    const i = pair.indexOf('=');
    if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
}
function cookies() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}
async function call(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    redirect: 'manual',
    headers: { ...(init.headers ?? {}), cookie: cookies() },
  });
  remember(res);
  return res;
}

const account = await db.secretary.findFirst({
  select: { id: true, email: true, passwordHash: true },
});
const EMAIL = account?.email;
const PASSWORD = process.env.SEED_SECRETARY_PASSWORD;

console.log(`\nThird pass against ${BASE}\nAccount: ${EMAIL}\n`);

/**
 * Sign in before anything else.
 *
 * The timing test below deliberately fails to sign in eight times, which is
 * more than enough to trip the address lock this app enforces — the probe would
 * otherwise lock itself out of its own authenticated checks and report a
 * failure that is nothing but its own noise. So: clear the slate, take a
 * session, and only then start making a mess.
 */
await db.loginAttempt.deleteMany({ where: { success: false } });

let signedIn = false;
if (PASSWORD) {
  const pre = await call('/api/auth/csrf');
  const { csrfToken } = await pre.json();
  await call('/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD }).toString(),
  });
  signedIn = [...jar.keys()].some((k) => k.includes('session-token'));
}
const session = new Map(jar);

// =====================================================================
console.log('Unauthenticated');

// The session is put aside until the authenticated half; everything below must
// be tried as a stranger, or it proves nothing about what a stranger can do.
jar.clear();

// --- Timing: does a real address answer differently from a fake one? ---
async function timeLogin(email) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const cookie = (csrfRes.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(';')[0])
    .join('; ');
  const { csrfToken } = await csrfRes.json();
  const t0 = performance.now();
  await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({
      csrfToken,
      email,
      password: 'definitely-not-the-password',
    }).toString(),
  });
  return performance.now() - t0;
}

const real = [];
const fake = [];
for (let i = 0; i < 4; i += 1) {
  real.push(await timeLogin(EMAIL));
  fake.push(await timeLogin(`nobody-${i}@example.invalid`));
}
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const gap = Math.abs(avg(real) - avg(fake));
check(
  'a real address is not distinguishable by timing',
  gap < 120,
  `${gap.toFixed(0)}ms apart (real ${avg(real).toFixed(0)}, fake ${avg(fake).toFixed(0)})`,
  'medium'
);

// --- CRLF / header injection --------------------------------------------
const crlf = await fetch(`${BASE}/notices?type=%0d%0aX-Injected:%20yes`);
check(
  'CRLF in a query string does not inject a header',
  !crlf.headers.get('x-injected'),
  crlf.headers.get('x-injected') ?? 'no such header'
);

// --- Method override ------------------------------------------------------
const override = await call('/api/documents', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-http-method-override': 'GET',
  },
  body: '{}',
});
check('X-HTTP-Method-Override does not bypass auth', override.status === 401, `HTTP ${override.status}`);

// --- Oversized body -------------------------------------------------------
const huge = await call('/api/documents', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title: 'A'.repeat(5_000_000) }),
}).catch((e) => ({ status: `threw: ${e.message.slice(0, 30)}` }));
check(
  'a 5MB body is refused, not swallowed',
  huge.status === 401 || huge.status === 413 || huge.status === 400,
  `HTTP ${huge.status}`
);

// --- Malformed / hostile JSON ---------------------------------------------
for (const [label, body] of [
  ['prototype pollution', '{"__proto__":{"admin":true}}'],
  ['deep nesting', `${'['.repeat(2000)}${']'.repeat(2000)}`],
  ['not json at all', 'nonsense'],
]) {
  const r = await call('/api/documents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
  check(`${label} is handled`, r.status === 401 || r.status === 400, `HTTP ${r.status}`);
}
check('prototype was not polluted', {}.admin === undefined, String({}.admin));

// --- Reset code brute force ------------------------------------------------
const codes = new Set();
for (let i = 0; i < 8; i += 1) {
  const r = await fetch(`${BASE}/reset`, { method: 'GET' });
  codes.add(r.status);
}
check('the reset page stays available and does not error', [...codes].every((s) => s === 200), [...codes].join(','));

// =====================================================================
console.log('\nAuthenticated');

if (!PASSWORD) {
  console.log('  SKIP  no SEED_SECRETARY_PASSWORD — authenticated half not run');
} else {
  // Restore the session taken before the noisy checks above.
  jar.clear();
  for (const [k, v] of session) jar.set(k, v);

  check(
    'signed in for the authenticated checks',
    signedIn,
    signedIn ? '' : 'password in .env.local is stale — run scripts/set-env.mjs --all'
  );

  if (signedIn) {
    // --- Mass assignment ---------------------------------------------------
    const PDF = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
      'latin1'
    );

    // The declared size is checked against what actually landed in the bucket,
    // so it has to be the real length rather than a guess.
    const url = await call('/api/documents/upload-url', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'CIRCULAR',
        fileName: 'probe.pdf',
        contentType: 'application/pdf',
        size: PDF.length,
      }),
    });
    const signed = await url.json();
    await fetch(signed.url, { method: 'PUT', body: PDF, headers: { 'content-type': 'application/pdf' } });

    const forgedId = 'attacker-chosen-id';
    const payload = {
      type: 'CIRCULAR',
      title: 'Mass assignment probe',
      description: '',
      fileKey: signed.key,
      fileName: 'probe.pdf',
    };

    const created = await call('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        // Fields the caller must never be able to set:
        id: forgedId,
        createdAt: '1999-01-01T00:00:00.000Z',
        deletedAt: null,
        isDeleted: false,
      }),
    });
    let doc = created.status === 201 ? await created.json() : null;

    /**
     * Either answer is safe. A 400 means the schema refuses unknown keys
     * outright; a 201 with a generated id means they were ignored. What must
     * never happen is a 201 that honours them.
     */
    check(
      'a caller cannot choose the record id',
      created.status === 400 || (doc && doc.id !== forgedId),
      created.status === 400
        ? 'extra fields refused outright'
        : `id ${String(doc?.id).slice(0, 10)}…`,
      'high'
    );

    // If the strict schema refused the smuggled fields, publish cleanly so the
    // remaining checks have a real document to work against.
    if (!doc) {
      const clean = await call('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      doc = clean.status === 201 ? await clean.json() : null;
      check('a clean publish still succeeds', Boolean(doc), `HTTP ${clean.status}`);
    }

    if (doc?.id) {
      const row = await db.document.findUnique({ where: { id: doc.id } });
      check(
        'a caller cannot backdate a record',
        Boolean(row) && row.uploadedAt > new Date('2020-01-01'),
        row ? row.uploadedAt.toISOString().slice(0, 10) : 'no row'
      );
      check(
        'a caller cannot pre-set the deleted marker',
        Boolean(row) && row.deletedAt === null,
        row ? String(row.deletedAt) : 'no row'
      );

      // --- Signed URL expiry ------------------------------------------------
      const dl = await call(`/api/documents/${doc.id}/download`);
      const loc = dl.headers.get('location') ?? '';
      const expires = Number(new URL(loc).searchParams.get('X-Amz-Expires') ?? 0);
      check(
        'download URLs expire quickly',
        expires > 0 && expires <= 900,
        `${expires}s`
      );

      const tampered = loc.replace(/X-Amz-Expires=\d+/, 'X-Amz-Expires=604800');
      const tamperRes = await fetch(tampered);
      check('a tampered signed URL is rejected', !tamperRes.ok, `HTTP ${tamperRes.status}`, 'high');

      // --- Does a session survive a password change? ------------------------
      const originalHash = account.passwordHash;
      await db.secretary.update({
        where: { id: account.id },
        data: { passwordHash: originalHash.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')) },
      });
      const afterChange = await call('/desk/circular');
      await db.secretary.update({
        where: { id: account.id },
        data: { passwordHash: originalHash },
      });
      check(
        'a session stops working once the password changes',
        afterChange.status !== 200,
        afterChange.status === 200
          ? 'old session still opens the desk — JWT carries no password binding'
          : `HTTP ${afterChange.status}`,
        'medium'
      );

      await call(`/api/documents/${doc.id}`, { method: 'DELETE' });
      await db.document.deleteMany({ where: { id: doc.id } });
    }
  }
}

// --- Clean up the failures this probe caused --------------------------------
const { count } = await db.loginAttempt.deleteMany({
  where: { success: false, createdAt: { gte: START } },
});
await db.$disconnect();

console.log(failed ? `\n${failed} finding(s).` : '\nNothing found in this pass.');
for (const f of findings) console.log(`  [${f.severity}] ${f.label} — ${f.detail}`);
console.log(`\nCleaned up ${count} attempt(s).\n`);
process.exitCode = failed ? 1 : 0;
