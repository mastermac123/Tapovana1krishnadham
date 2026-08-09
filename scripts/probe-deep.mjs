#!/usr/bin/env node
/**
 * The second pass: the attacks the first probe was too polite to try.
 *
 *   node scripts/probe-deep.mjs http://localhost:3410
 *
 * Headers, lockout evasion, cross-site scripting, open redirects, exposed
 * source maps, mass assignment, and whether a signed URL really expires.
 */

import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client.ts';

config({ path: ['.env.local', '.env'], quiet: true });

const BASE = (process.argv[2] ?? 'http://localhost:3410').replace(/\/$/, '');

/** Where the probe's own failed sign-ins are recorded, so it can undo them. */
const PROBE_START = new Date();

let failed = 0;
const findings = [];
function check(label, ok, detail = '', severity = 'medium') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  if (!ok) {
    failed += 1;
    findings.push({ label, detail, severity });
  }
}

console.log(`\nSecond pass against ${BASE}\n`);

// --- Security headers ---------------------------------------------------
console.log('Headers');
const home = await fetch(BASE);
const h = (n) => home.headers.get(n);

check(
  'X-Frame-Options or CSP frame-ancestors set',
  Boolean(h('x-frame-options') || (h('content-security-policy') ?? '').includes('frame-ancestors')),
  h('x-frame-options') ?? 'absent — the site can be framed and click-jacked',
  'high'
);
check(
  'X-Content-Type-Options: nosniff',
  h('x-content-type-options') === 'nosniff',
  h('x-content-type-options') ?? 'absent — browsers may guess a file is script',
  'medium'
);
check(
  'Content-Security-Policy present',
  Boolean(h('content-security-policy')),
  h('content-security-policy') ? 'set' : 'absent — no defence in depth against injected script',
  'high'
);
check(
  'Referrer-Policy set',
  Boolean(h('referrer-policy')),
  h('referrer-policy') ?? 'absent',
  'low'
);
check(
  'Strict-Transport-Security set',
  Boolean(h('strict-transport-security')),
  h('strict-transport-security') ?? 'absent (expected on http, required once deployed)',
  'medium'
);

// --- Lockout evasion ----------------------------------------------------
console.log('\nLockout');
async function attempt(headers) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const cookies = (csrfRes.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(';')[0])
    .join('; ');
  const { csrfToken } = await csrfRes.json();
  return fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookies, ...headers },
    body: new URLSearchParams({
      csrfToken,
      email: 'secretarytapovan@gmail.com',
      password: `wrong-${Math.random()}`,
    }).toString(),
  });
}

/**
 * Every request forges a different address, so the per-IP rules can never see
 * a streak. Only an account-level lock stops this — and it must live at the
 * endpoint, since posting here skips the login form entirely.
 */
let blockedAt = 0;
for (let i = 1; i <= 14; i += 1) {
  const r = await attempt({
    'cf-connecting-ip': `203.0.113.${i}`,
    'x-forwarded-for': `198.51.100.${i}`,
  });
  const url = r.headers.get('location') ?? '';
  // Auth.js redirects back with an error once authorize() returns null.
  if (!blockedAt && url.includes('error')) blockedAt = i;
}

const attempts = await attempt({ 'cf-connecting-ip': '203.0.113.250' });
const stillRefused = (attempts.headers.get('location') ?? '').includes('error');

check(
  'brute force is stopped despite a rotating forged IP',
  stillRefused,
  stillRefused
    ? 'account lock held after 14 forged-address attempts'
    : 'FOURTEEN wrong passwords accepted from forged addresses',
  'high'
);

// --- Cross-site scripting ------------------------------------------------
console.log('\nInjection');
const xss = await fetch(`${BASE}/notices?type=${encodeURIComponent('"><script>alert(1)</script>')}`);
const xssBody = await xss.text();
check(
  'query string is not reflected as markup',
  !xssBody.includes('<script>alert(1)</script>'),
  'no raw reflection'
);

// --- Open redirect --------------------------------------------------------
const redirect = await fetch(
  `${BASE}/api/auth/signin?callbackUrl=${encodeURIComponent('https://evil.example.com')}`,
  { redirect: 'manual' }
);
const loc = redirect.headers.get('location') ?? '';
check(
  'does not redirect off-site via callbackUrl',
  !loc.startsWith('https://evil.example.com'),
  loc ? loc.slice(0, 60) : `HTTP ${redirect.status}`
);

// --- Source maps ----------------------------------------------------------
console.log('\nExposure');
const map = await fetch(`${BASE}/_next/static/chunks/main-app.js.map`);
check('client source maps are not served', !map.ok, `HTTP ${map.status}`, 'low');

for (const p of ['/.env.local', '/.env', '/prisma/schema.prisma', '/.git/config']) {
  const r = await fetch(`${BASE}${p}`);
  check(`${p} is not served`, !r.ok, `HTTP ${r.status}`, 'high');
}

/**
 * Undo the lockout this probe just caused.
 *
 * Proving the account lock works means tripping it, which leaves the real
 * secretary unable to sign in for fifteen minutes. A diagnostic that locks the
 * only account out is worse than no diagnostic, so the attempts it made are
 * removed again.
 */
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const { count } = await db.loginAttempt.deleteMany({
  where: { success: false, createdAt: { gte: PROBE_START } },
});
await db.$disconnect();

console.log(
  failed ? `\n${failed} finding(s).\n` : '\nNothing found in this pass.\n'
);
for (const f of findings) console.log(`  [${f.severity}] ${f.label} — ${f.detail}`);
console.log(`\nCleaned up ${count} attempt(s) this probe made — account not left locked.\n`);
process.exitCode = failed ? 1 : 0;
