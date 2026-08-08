#!/usr/bin/env node
/**
 * Times the database round trip, so page latency can be attributed properly.
 *
 *   node scripts/bench-db.mjs
 */

import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client.ts';

config({ path: ['.env.local', '.env'], quiet: true });

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function time(label, fn, runs = 5) {
  await fn(); // warm the connection
  const times = [];
  for (let i = 0; i < runs; i += 1) {
    const t0 = performance.now();
    await fn();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(runs / 2)];
  console.log(`  ${label.padEnd(26)} ${median.toFixed(0)} ms (median of ${runs})`);
}

console.log('\nDatabase round trip:\n');
await time('SELECT 1', () => db.$queryRaw`SELECT 1`);
await time('committee findMany', () => db.committeeMember.findMany());
await time('document groupBy', () =>
  db.document.groupBy({ by: ['type'], _count: { _all: true } })
);
console.log('');

await db.$disconnect();
