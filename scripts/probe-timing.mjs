#!/usr/bin/env node
/**
 * Times the reset form against a real address and a fake one.
 *
 *   node scripts/probe-timing.mjs http://localhost:3410
 *
 * Identical wording is not enough. If a real account costs a password hash and
 * a call to the email provider while an unknown one returns straight away, the
 * clock says which addresses exist just as plainly as the text would have.
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
const real = (await db.secretary.findFirst({ select: { email: true } }))?.email;

/** Finds the server-action id the reset page posts to. */
const page = await fetch(`${BASE}/reset`);
const html = await page.text();
const ids = [...html.matchAll(/"([0-9a-f]{40,})"/g)].map((m) => m[1]);

async function timeRequest(email, actionId) {
  const body = new FormData();
  body.set('1_email', email);
  body.set('0', '["$K1"]');
  const t0 = performance.now();
  const res = await fetch(`${BASE}/reset`, {
    method: 'POST',
    headers: { 'next-action': actionId, origin: BASE },
    body,
  });
  await res.text();
  return performance.now() - t0;
}

let actionId = ids[0];
let usable = false;

// Warm the route so compilation is not counted.
for (const id of ids.slice(0, 4)) {
  const ms = await timeRequest(`warm-${Date.now()}@example.com`, id);
  if (ms > 0) {
    actionId = id;
    usable = true;
    break;
  }
}

if (!usable || !real) {
  console.log('\nCould not drive the reset form — skipping.\n');
  await db.$disconnect();
  process.exit(0);
}

console.log(`\nTiming ${BASE}/reset\n`);

const fake = [];
const known = [];
for (let i = 0; i < 4; i += 1) {
  fake.push(await timeRequest(`nobody-${Date.now()}-${i}@example.com`, actionId));
  known.push(await timeRequest(real, actionId));
}

const median = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
const f = median(fake);
const k = median(known);
const gap = Math.abs(k - f);

console.log(`  unknown address   ${f.toFixed(0)} ms`);
console.log(`  real address      ${k.toFixed(0)} ms`);
console.log(`  difference        ${gap.toFixed(0)} ms\n`);

// Anything past a couple of hundred milliseconds is trivially measurable over
// the internet, jitter and all.
const leaks = gap > 200;
console.log(
  leaks
    ? `  FAIL  the clock reveals which addresses exist (${gap.toFixed(0)} ms apart)\n`
    : '  PASS  no usable timing difference\n'
);

await db.passwordReset.deleteMany({ where: { createdAt: { gte: START } } });
await db.$disconnect();
process.exitCode = leaks ? 1 : 0;
