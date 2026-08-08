#!/usr/bin/env node
/**
 * Removes every secretary account except the one you name.
 *
 *   node scripts/prune-secretaries.mjs keep@address.com
 *
 * There should only ever be one. A duplicate can appear if `db:seed` ran while
 * SEED_SECRETARY_EMAIL was stale — an extra account that can publish and delete
 * every document is worth noticing and removing.
 */

import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client.ts';

config({ path: ['.env.local', '.env'], quiet: true });

const keep = process.argv[2]?.trim().toLowerCase();
if (!keep) {
  console.error('Usage: node scripts/prune-secretaries.mjs keep@address.com');
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const all = await db.secretary.findMany({ select: { id: true, email: true } });
const keeper = all.find((a) => a.email === keep);

if (!keeper) {
  console.error(`\nNo account with ${keep}. Nothing removed. Accounts found:`);
  for (const a of all) console.error(`  ${a.email}`);
  await db.$disconnect();
  process.exit(1);
}

const doomed = all.filter((a) => a.id !== keeper.id);

for (const a of doomed) {
  await db.secretary.delete({ where: { id: a.id } });
  console.log(`removed  ${a.email}`);
}

console.log(`\nkept     ${keeper.email}`);
console.log(`${doomed.length} removed, 1 remaining\n`);

await db.$disconnect();
