#!/usr/bin/env node
/**
 * Times a sign-in attempt, which is the slowest thing the site does.
 *
 *   node scripts/time-login.mjs https://tapovana1krishnadham.vercel.app
 *
 * A refusal is the honest thing to measure: it checks three throttle tables,
 * verifies a password hash, and records the attempt. Deliberately stays under
 * the three-strike limit, and removes what it recorded.
 */

import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client.ts';

config({ path: ['.env.local', '.env'], quiet: true });

const base = (process.argv[2] ?? 'http://localhost:3410').replace(/\/$/, '');
const MARK = `timing-${Date.now()}`;

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

console.log(`\nSign-in timing against ${base}\n`);

const times = [];
for (let i = 1; i <= 2; i += 1) {
  const csrfRes = await fetch(`${base}/api/auth/csrf`);
  const cookie = (csrfRes.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(';')[0])
    .join('; ');
  const { csrfToken } = await csrfRes.json();

  const t0 = performance.now();
  await fetch(`${base}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({
      csrfToken,
      email: `${MARK}@example.invalid`,
      password: 'wrong',
    }).toString(),
  });
  const ms = Math.round(performance.now() - t0);
  times.push(ms);
  console.log(`  attempt ${i}: ${ms}ms`);
}

console.log(`\n  best: ${Math.min(...times)}ms`);

const { count } = await db.loginAttempt.deleteMany({
  where: { email: { contains: MARK } },
});
console.log(`  cleaned up ${count} attempt(s)\n`);

await db.$disconnect();
