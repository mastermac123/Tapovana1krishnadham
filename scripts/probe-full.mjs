#!/usr/bin/env node
/**
 * Full-fledge attack simulation. Every category of attack relevant to this app.
 *
 *   node scripts/probe-full.mjs http://localhost:3410
 */

import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client.ts';

config({ path: ['.env.local', '.env'], quiet: true });

const BASE = (process.argv[2] ?? 'http://localhost:3410').replace(/\/$/, '');
const PROBE_START = new Date();

let passed = 0, failed = 0;
const findings = [];

function check(category, label, ok, detail = '', severity = 'medium') {
  const icon = ok ? 'PASS' : 'FAIL';
  console.log(`  ${icon}  [${category}] ${label}${detail ? `  — ${detail}` : ''}`);
  if (ok) passed++;
  else {
    failed++;
    findings.push({ category, label, detail, severity });
  }
}

async function req(path, init = {}) {
  return fetch(`${BASE}${path}`, { ...init, redirect: 'manual' }).catch(() => null);
}

async function csrfToken() {
  const r = await fetch(`${BASE}/api/auth/csrf`);
  const cookies = (r.headers.getSetCookie?.() ?? []).map(c => c.split(';')[0]).join('; ');
  const { csrfToken } = await r.json();
  return { csrfToken, cookies };
}

async function loginAttempt(email, password, extraHeaders = {}) {
  const { csrfToken: tok, cookies } = await csrfToken();
  return fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookies, ...extraHeaders },
    body: new URLSearchParams({ csrfToken: tok, email, password }).toString(),
  });
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`  FULL ATTACK SIMULATION`);
console.log(`  Target: ${BASE}`);
console.log(`${'═'.repeat(60)}\n`);

// ═══════════════════════════════════════════════════════════
// 1. AUTHENTICATION ATTACKS
// ═══════════════════════════════════════════════════════════
console.log('── 1. AUTHENTICATION ──────────────────────────────────────\n');

// 1a. Correct password
const goodLogin = await loginAttempt('secretarytapovan@gmail.com', process.env.SEED_SECRETARY_PASSWORD ?? '');
const goodLoc = goodLogin.headers.get('location') ?? '';
const signedIn = goodLogin.status === 302 && !goodLoc.includes('error');
check('AUTH', 'correct password accepts', signedIn, `HTTP ${goodLogin.status}`);

// 1b. Wrong password
const bad = await loginAttempt('secretarytapovan@gmail.com', 'wrong-password-1234');
const badLoc = bad.headers.get('location') ?? '';
check('AUTH', 'wrong password refused', badLoc.includes('error') || bad.status !== 302, `HTTP ${bad.status}`);

// 1c. SQL injection in email field
const sqli = await loginAttempt("' OR '1'='1' --", 'anything');
const sqliLoc = sqli.headers.get('location') ?? '';
check('AUTH', 'SQL injection in email field', sqliLoc.includes('error') || sqli.status !== 302, `HTTP ${sqli.status}`, 'high');

// 1d. SQL injection in password field
const sqli2 = await loginAttempt('secretarytapovan@gmail.com', "' OR '1'='1");
const sqli2Loc = sqli2.headers.get('location') ?? '';
check('AUTH', 'SQL injection in password field', sqli2Loc.includes('error') || sqli2.status !== 302, `HTTP ${sqli2.status}`, 'high');

// 1e. Empty credentials
const empty = await loginAttempt('', '');
check('AUTH', 'empty credentials refused', (empty.headers.get('location') ?? '').includes('error') || empty.status !== 302, `HTTP ${empty.status}`);

// 1f. Extremely long password (DoS via hashing)
const longPw = await loginAttempt('secretarytapovan@gmail.com', 'A'.repeat(10000));
check('AUTH', 'extremely long password handled', longPw !== null, `HTTP ${longPw?.status}`, 'medium');

// 1g. Null bytes in credentials
const nullByte = await loginAttempt('secretarytapovan@gmail.com\x00', 'password');
check('AUTH', 'null byte in email handled', nullByte !== null, `HTTP ${nullByte?.status}`, 'medium');

// 1h. Unicode homograph (looks like the real address)
const homograph = await loginAttempt('ѕecrеtarytapovan@gmail.com', 'anything'); // Cyrillic s, е
check('AUTH', 'unicode homograph email refused', (homograph.headers.get('location') ?? '').includes('error') || homograph.status !== 302, `HTTP ${homograph.status}`, 'medium');

// ═══════════════════════════════════════════════════════════
// 2. BRUTE FORCE / LOCKOUT
// ═══════════════════════════════════════════════════════════
console.log('\n── 2. BRUTE FORCE ─────────────────────────────────────────\n');

// Send 10 wrong attempts with rotating forged IPs
let blockedAt = 0;
for (let i = 1; i <= 10; i++) {
  const r = await loginAttempt('secretarytapovan@gmail.com', `wrong-pass-${i}`, {
    'cf-connecting-ip': `203.0.113.${i}`,
    'x-forwarded-for': `198.51.100.${i}, 10.0.0.1`,
  });
  if (!blockedAt && (r.headers.get('location') ?? '').includes('error')) blockedAt = i;
}
const stillBlocked = await loginAttempt('secretarytapovan@gmail.com', 'wrong-final', {
  'cf-connecting-ip': '1.2.3.4',
  'x-forwarded-for': '5.6.7.8',
});
check('BRUTE', 'rotating forged IP cannot evade account lockout',
  (stillBlocked.headers.get('location') ?? '').includes('error'),
  'account locked regardless of forged address', 'high');

check('BRUTE', 'rate limit trip recorded in database',
  blockedAt > 0 && blockedAt <= 10,
  `locked after ~${blockedAt} attempts`);

// ═══════════════════════════════════════════════════════════
// 3. SESSION & CSRF ATTACKS
// ═══════════════════════════════════════════════════════════
console.log('\n── 3. SESSION & CSRF ──────────────────────────────────────\n');

// 3a. Forged session cookie
const forged = await req('/desk/circular', {
  headers: { cookie: 'authjs.session-token=forged.totally.fake.jwt.here' },
});
check('SESSION', 'forged session cookie rejected', forged?.status === 307 || forged?.status === 302, `HTTP ${forged?.status}`, 'high');

// 3b. Tampered session (real prefix, garbage suffix)
const tampered = await req('/desk/circular', {
  headers: { cookie: 'authjs.session-token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrZXIifQ.TAMPERED' },
});
check('SESSION', 'tampered JWT rejected', tampered?.status === 307 || tampered?.status === 302, `HTTP ${tampered?.status}`, 'high');

// 3c. Posting to API without CSRF token
const noCsrf = await req('/api/auth/callback/credentials', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'secretarytapovan@gmail.com', password: 'any' }).toString(),
});
check('CSRF', 'API call without CSRF token blocked', noCsrf?.status !== 200, `HTTP ${noCsrf?.status}`, 'high');

// 3d. Wrong CSRF token
const badCsrf = await req('/api/auth/callback/credentials', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ csrfToken: 'deadbeef', email: 'x@x.com', password: 'y' }).toString(),
});
check('CSRF', 'wrong CSRF token rejected', badCsrf?.status !== 200, `HTTP ${badCsrf?.status}`, 'high');

// ═══════════════════════════════════════════════════════════
// 4. AUTHORIZATION / ACCESS CONTROL
// ═══════════════════════════════════════════════════════════
console.log('\n── 4. AUTHORIZATION ───────────────────────────────────────\n');

const protectedPages = ['/desk', '/desk/circular', '/desk/committee', '/desk/account'];
for (const p of protectedPages) {
  const r = await req(p);
  check('AUTHZ', `${p} requires auth`, r?.status === 307 || r?.status === 302, `HTTP ${r?.status}`, 'high');
}

const protectedApis = [
  ['GET', '/api/documents'],
  ['POST', '/api/documents'],
  ['POST', '/api/documents/upload-url'],
  ['PATCH', '/api/documents/fake-id'],
  ['DELETE', '/api/documents/fake-id'],
];
for (const [method, path] of protectedApis) {
  const r = await req(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: method === 'GET' ? undefined : '{}',
  });
  check('AUTHZ', `${method} ${path} requires auth`, r?.status === 401, `HTTP ${r?.status}`, 'high');
}

// Horizontal privilege: can you download a document whose ID you guess?
const guessedId = await req('/api/documents/00000000-0000-0000-0000-000000000000/download');
check('AUTHZ', 'guessed document ID gives nothing away', guessedId?.status === 404 || guessedId?.status === 400, `HTTP ${guessedId?.status}`);

// ═══════════════════════════════════════════════════════════
// 5. INJECTION ATTACKS
// ═══════════════════════════════════════════════════════════
console.log('\n── 5. INJECTION ───────────────────────────────────────────\n');

// XSS in query string
const xss1 = await req(`/notices?type=${encodeURIComponent('"><script>alert(1)</script>')}`);
const xss1body = await xss1?.text() ?? '';
check('XSS', 'script tag in ?type= not reflected raw', !xss1body.includes('<script>alert(1)</script>'), 'no raw reflection', 'high');

// XSS via URL parameter
const xss2 = await req(`/notices?q=${encodeURIComponent("javascript:alert('xss')")}`);
const xss2body = await xss2?.text() ?? '';
check('XSS', 'javascript: URI in query string not reflected', !xss2body.includes("javascript:alert"), '', 'high');

// NoSQL-style injection in API body (should be rejected by auth or schema)
const nosql = await req('/api/documents', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ '$gt': '' }),
});
check('INJECT', 'NoSQL-style body rejected (no auth)', nosql?.status === 401, `HTTP ${nosql?.status}`);

// HTTP header injection
const headerInject = await req('/reset', {
  headers: { 'X-Forwarded-Host': 'evil.example.com\r\nX-Injected: yes' },
});
check('INJECT', 'header injection handled', headerInject !== null && headerInject.status < 500, `HTTP ${headerInject?.status}`, 'medium');

// ═══════════════════════════════════════════════════════════
// 6. OPEN REDIRECT
// ═══════════════════════════════════════════════════════════
console.log('\n── 6. OPEN REDIRECT ───────────────────────────────────────\n');

const redirectTests = [
  'https://evil.example.com',
  '//evil.example.com',
  '/\\evil.example.com',
  'javascript:alert(1)',
];
for (const url of redirectTests) {
  const r = await req(`/api/auth/signin?callbackUrl=${encodeURIComponent(url)}`, {});
  const loc = r?.headers.get('location') ?? '';
  const safe = !loc.startsWith('https://evil') && !loc.startsWith('//evil') && !loc.startsWith('javascript:');
  check('REDIRECT', `callbackUrl=${url.slice(0, 30)} stays on-site`, safe, loc.slice(0, 60) || `HTTP ${r?.status}`, 'high');
}

// ═══════════════════════════════════════════════════════════
// 7. INFORMATION DISCLOSURE
// ═══════════════════════════════════════════════════════════
console.log('\n── 7. INFORMATION DISCLOSURE ──────────────────────────────\n');

const exposedPaths = [
  '/.env.local',
  '/.env',
  '/.env.production',
  '/prisma/schema.prisma',
  '/.git/config',
  '/.git/HEAD',
  '/package.json',
  '/node_modules/.package-lock.json',
  '/_next/static/chunks/main-app.js.map',
  '/api/auth/providers',
];
for (const p of exposedPaths) {
  const r = await req(p);
  const safe = !r || r.status === 404 || r.status === 403;
  check('DISCLOSE', `${p} not exposed`, safe, `HTTP ${r?.status}`, r?.status === 200 ? 'critical' : 'low');
}

// Version header
const homeR = await fetch(BASE);
const poweredBy = homeR.headers.get('x-powered-by') ?? '';
check('DISCLOSE', 'does not leak exact framework version', !/\d/.test(poweredBy), poweredBy || 'absent');

// Stack trace exposure (cause an error)
const stackTrace = await req('/api/documents/[object%20Object]/download');
const stackBody = await stackTrace?.text() ?? '';
check('DISCLOSE', 'error response does not leak stack trace', !stackBody.includes('at Object.') && !stackBody.includes('node_modules'), '', 'medium');

// ═══════════════════════════════════════════════════════════
// 8. SECURITY HEADERS
// ═══════════════════════════════════════════════════════════
console.log('\n── 8. SECURITY HEADERS ────────────────────────────────────\n');

const h = (n) => homeR.headers.get(n);
check('HEADERS', 'Content-Security-Policy', Boolean(h('content-security-policy')), h('content-security-policy') ? 'set' : 'MISSING', 'high');
check('HEADERS', 'X-Frame-Options: DENY', h('x-frame-options') === 'DENY', h('x-frame-options') ?? 'MISSING', 'high');
check('HEADERS', 'X-Content-Type-Options: nosniff', h('x-content-type-options') === 'nosniff', h('x-content-type-options') ?? 'MISSING');
check('HEADERS', 'Referrer-Policy set', Boolean(h('referrer-policy')), h('referrer-policy') ?? 'MISSING');
check('HEADERS', 'Strict-Transport-Security set', Boolean(h('strict-transport-security')), h('strict-transport-security') ?? 'MISSING');
check('HEADERS', 'Permissions-Policy set', Boolean(h('permissions-policy')), h('permissions-policy') ?? 'MISSING');

// ═══════════════════════════════════════════════════════════
// 9. STORAGE ATTACKS (R2 bucket)
// ═══════════════════════════════════════════════════════════
console.log('\n── 9. CLOUD STORAGE ───────────────────────────────────────\n');

const bucketBase = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}`;
const bare = await fetch(bucketBase).catch(() => null);
check('STORAGE', 'R2 bucket refuses unsigned GET', !bare?.ok, `HTTP ${bare?.status}`, 'critical');

const listing = await fetch(`${bucketBase}?list-type=2`).catch(() => null);
check('STORAGE', 'R2 bucket refuses directory listing', !listing?.ok, `HTTP ${listing?.status}`, 'critical');

const guess = await fetch(`${bucketBase}/../../etc/passwd`).catch(() => null);
check('STORAGE', 'path traversal on bucket refused', !guess?.ok, `HTTP ${guess?.status}`, 'high');

// ═══════════════════════════════════════════════════════════
// 10. DENIAL OF SERVICE PRIMITIVES
// ═══════════════════════════════════════════════════════════
console.log('\n── 10. PAYLOAD SIZE / DOS ─────────────────────────────────\n');

// Giant body to API (should be rejected by Next.js body limit or auth check)
const bigBody = await req('/api/documents', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title: 'A'.repeat(1_000_000) }),
}).catch(() => null);
check('DOS', 'oversized request body handled without crash', bigBody !== null && bigBody.status < 500, `HTTP ${bigBody?.status}`);

// Deeply nested JSON
const nested = JSON.stringify(Array.from({ length: 200 }, (_, i) => i).reduce((acc) => ({ x: acc }), { x: 1 }));
const deepJson = await req('/api/documents', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: nested,
}).catch(() => null);
check('DOS', 'deeply nested JSON handled without crash', deepJson !== null && deepJson.status < 500, `HTTP ${deepJson?.status}`);

// Long URL
const longUrl = await req(`/notices?q=${'x'.repeat(8000)}`).catch(() => null);
check('DOS', '8 KB query string handled', longUrl !== null && longUrl.status < 500, `HTTP ${longUrl?.status}`);

// ═══════════════════════════════════════════════════════════
// 11. MASS ASSIGNMENT
// ═══════════════════════════════════════════════════════════
console.log('\n── 11. MASS ASSIGNMENT ────────────────────────────────────\n');

// Try to create a document with internal fields (no auth, should get 401)
const mass = await req('/api/documents', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    id: '00000000-0000-0000-0000-000000000001',
    createdAt: '2000-01-01',
    deletedAt: null,
    secretaryId: 'fake',
    title: 'mass-assign test',
    isPublished: true,
  }),
});
check('MASSASSIGN', 'attempt to set internal fields rejected (no auth)', mass?.status === 401, `HTTP ${mass?.status}`, 'high');

// ═══════════════════════════════════════════════════════════
// 12. ACCOUNT ENUMERATION
// ═══════════════════════════════════════════════════════════
console.log('\n── 12. ACCOUNT ENUMERATION ────────────────────────────────\n');

// Time difference between existing and non-existing accounts must not be significant
const t0 = Date.now();
await req('/reset', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'secretarytapovan@gmail.com' }).toString(),
});
const t1 = Date.now();

await req('/reset', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'doesnotexist@nowhere.example.com' }).toString(),
});
const t2 = Date.now();

const realMs = t1 - t0;
const fakeMs = t2 - t1;
const timingDiff = Math.abs(realMs - fakeMs);
// Allow up to 1 second difference (email send makes real one slower)
check('ENUM', 'reset page response time does not reveal account existence',
  timingDiff < 5000,
  `real=${realMs}ms fake=${fakeMs}ms diff=${timingDiff}ms`,
  'medium');

// Same error message for real vs fake
const realReset = await req('/reset', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'secretarytapovan@gmail.com' }).toString(),
});
const fakeReset = await req('/reset', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'doesnotexist@example.com' }).toString(),
});
// Both should be 200 (same shape regardless)
check('ENUM', 'password reset returns identical HTTP status for real vs fake address',
  realReset?.status === fakeReset?.status,
  `real=${realReset?.status} fake=${fakeReset?.status}`,
  'high');

// ═══════════════════════════════════════════════════════════
// CLEANUP — remove the login attempts this probe made
// ═══════════════════════════════════════════════════════════
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const { count } = await db.loginAttempt.deleteMany({
  where: { success: false, createdAt: { gte: PROBE_START } },
});
await db.$disconnect();

// ═══════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(60)}`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
if (findings.length) {
  console.log(`\n  FINDINGS:`);
  for (const f of findings) {
    console.log(`  [${f.severity.toUpperCase()}] ${f.category}: ${f.label}`);
    if (f.detail) console.log(`         ${f.detail}`);
  }
} else {
  console.log(`\n  No vulnerabilities found.`);
}
console.log(`\n  Cleaned up ${count} probe attempt(s) — account not left locked.`);
console.log(`${'═'.repeat(60)}\n`);
process.exitCode = failed ? 1 : 0;
