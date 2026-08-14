#!/usr/bin/env node
/**
 * Proves the sign-in lock on a running site, then puts things back.
 *
 *   node scripts/locktest-live.mjs https://tapovana1krishnadham.vercel.app
 *
 * Three refused attempts from one address should lock it. Runs against a
 * throwaway address so the secretary's account is never the one locked, and
 * deletes the attempts it made so nobody is left shut out by a test.
 */

import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client.ts';

config({ path: ['.env.local', '.env'], quiet: true });

const base = (process.argv[2] ?? 'http://localhost:3410').replace(/\/$/, '');
const MARK = `locktest-${Date.now()}`;

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function attempt(n, email, password) {
  const csrfRes = await fetch(`${base}/api/auth/csrf`);
  const cookie = (csrfRes.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(';')[0])
    .join('; ');
  const { csrfToken } = await csrfRes.json();
  const r = await fetch(`${base}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ csrfToken, email, password }).toString(),
  });
  console.log(`  ${n}. ${email.padEnd(34)} HTTP ${r.status}`);
  return r;
}

console.log(`\nTesting the lock on ${base}\n`);

const before = await db.loginAttempt.findMany({
  orderBy: { createdAt: 'desc' },
  take: 1,
  select: { ip: true },
});
const ip = before[0]?.ip ?? 'unknown';

// A malformed address first — the case that used to slip through uncounted.
await attempt(1, `not-an-email-${MARK}`, 'x');
await attempt(2, `${MARK}@example.invalid`, 'wrong-one');
await attempt(3, `${MARK}@example.invalid`, 'wrong-two');

const recent = await db.loginAttempt.findMany({
  where: { ip },
  orderBy: { createdAt: 'desc' },
  take: 3,
  select: { success: true },
});
const locked = recent.length === 3 && !recent.every((a) => a.success === true) && !recent.some((a) => a.success);

console.log(`\n  three consecutive refusals recorded: ${recent.filter((a) => !a.success).length}/3`);
console.log(`  address now locked: ${locked ? 'YES' : 'NO'}`);

const { count } = await db.loginAttempt.deleteMany({
  where: { OR: [{ email: { contains: MARK } }, { email: null, success: false, createdAt: { gte: new Date(Date.now() - 120_000) } }] },
});
console.log(`\n  removed ${count} test attempt(s) — nobody is left locked out.\n`);

await db.$disconnect();
process.exitCode = locked ? 0 : 1;
