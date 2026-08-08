#!/usr/bin/env node
/**
 * Prints the committee exactly as stored, in display order.
 *
 *   node scripts/peek-committee.mjs
 *
 * The desk form uses uncontrolled inputs with defaultValue, so what the boxes
 * show after a save is not proof of what was written. This is.
 */

import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client.ts';

config({ path: ['.env.local', '.env'], quiet: true });

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const members = await db.committeeMember.findMany({
  orderBy: { order: 'asc' },
  select: { order: true, designation: true, name: true, flatNumber: true },
});

console.log('\nCommittee as stored:\n');
for (const m of members) {
  console.log(`  ${m.order}  ${m.designation.padEnd(12)} ${m.name.padEnd(22)} ${m.flatNumber}`);
}
console.log(`\n${members.length} members\n`);

await db.$disconnect();
