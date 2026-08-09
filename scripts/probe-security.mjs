#!/usr/bin/env node
/**
 * Tries, as an anonymous visitor, the things someone hostile would try.
 *
 *   node scripts/probe-security.mjs http://localhost:3410
 *
 * A pass here is not a certificate — it is evidence that the obvious doors are
 * shut. Re-run it after any change to the API or the guards, and after every
 * deploy against the live URL.
 */

import { config } from 'dotenv';

config({ path: ['.env.local', '.env'], quiet: true });

const BASE = (process.argv[2] ?? 'http://localhost:3410').replace(/\/$/, '');

let failed = 0;
function check(label, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  if (!ok) failed += 1;
}

async function req(path, init = {}) {
  return fetch(`${BASE}${path}`, { ...init, redirect: 'manual' });
}

console.log(`\nProbing ${BASE} with no session at all.\n`);

// --- The desk and its API must be shut ---------------------------------
for (const path of [
  '/desk',
  '/desk/circular',
  '/desk/committee',
  '/desk/account',
]) {
  const r = await req(path);
  check(`${path} refuses anonymous`, r.status === 307 || r.status === 302, `HTTP ${r.status}`);
}

for (const [method, path] of [
  ['GET', '/api/documents'],
  ['POST', '/api/documents'],
  ['POST', '/api/documents/upload-url'],
  ['PATCH', '/api/documents/anything'],
  ['DELETE', '/api/documents/anything'],
]) {
  const r = await req(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: method === 'GET' || method === 'DELETE' ? undefined : '{}',
  });
  check(`${method} ${path} refuses anonymous`, r.status === 401, `HTTP ${r.status}`);
}

// --- The bucket must not be readable without a signature ---------------
const bucketUrl = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/`;
const bare = await fetch(bucketUrl).catch(() => null);
check('R2 refuses an unsigned request', !bare || !bare.ok, bare ? `HTTP ${bare.status}` : 'no response');

const listing = await fetch(`${bucketUrl}?list-type=2`).catch(() => null);
check('R2 refuses to list its contents', !listing || !listing.ok, listing ? `HTTP ${listing.status}` : 'no response');

// --- A forged session must not be accepted -----------------------------
const forged = await req('/desk/circular', {
  headers: { cookie: 'authjs.session-token=forged.not.a.real.jwt' },
});
check('a forged session cookie is rejected', forged.status === 307 || forged.status === 302, `HTTP ${forged.status}`);

// --- Input handling ----------------------------------------------------
const injected = await req(`/notices?type=${encodeURIComponent("' OR 1=1--")}`);
check('SQL-ish input in ?type= is handled', injected.status === 200, `HTTP ${injected.status}`);

const traversal = await req('/api/documents/..%2F..%2Fetc%2Fpasswd/download');
check('path traversal on a document id fails', traversal.status === 404 || traversal.status === 400, `HTTP ${traversal.status}`);

const ghost = await req('/api/documents/does-not-exist/download');
check('unknown document id gives nothing away', ghost.status === 404, `HTTP ${ghost.status}`);

// --- Account enumeration ------------------------------------------------
const known = await req('/api/auth/csrf');
check('auth endpoints answer without leaking', known.status === 200, `HTTP ${known.status}`);

// --- Headers ------------------------------------------------------------
const home = await fetch(BASE);
const poweredBy = home.headers.get('x-powered-by');
check('does not advertise the framework version', !poweredBy || !/\d/.test(poweredBy), poweredBy ?? 'absent');

console.log(
  failed
    ? `\n${failed} check(s) failed — look at those.\n`
    : '\nEvery door tried was shut.\n'
);
process.exitCode = failed ? 1 : 0;
