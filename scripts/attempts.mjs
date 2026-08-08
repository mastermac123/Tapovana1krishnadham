#!/usr/bin/env node
/**
 * Recent sign-in attempts. Useful when someone reports being locked out, and
 * for checking whether the lockout is behaving.
 *
 *   node scripts/attempts.mjs
 */

import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client.ts';

config({ path: ['.env.local', '.env'], quiet: true });

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const rows = await db.loginAttempt.findMany({
  orderBy: { createdAt: 'desc' },
  take: 20,
});

console.log('\nMost recent first:\n');
for (const r of rows) {
  const when = r.createdAt.toISOString().replace('T', ' ').slice(0, 19);
  console.log(
    `  ${when}  ${r.success ? 'OK    ' : 'FAILED'}  ${r.ip.padEnd(16)} ${r.email ?? ''}`
  );
}

const ok = rows.filter((r) => r.success).length;
console.log(`\n${ok} succeeded, ${rows.length - ok} failed\n`);

await db.$disconnect();
