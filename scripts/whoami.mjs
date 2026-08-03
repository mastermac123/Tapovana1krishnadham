#!/usr/bin/env node
/**
 * Prints the secretary account's sign-in address and the committee count.
 * No secrets in the output — safe to share.
 *
 *   node scripts/whoami.mjs
 */

import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client.ts';

config({ path: ['.env.local', '.env'], quiet: true });

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const secretaries = await db.secretary.findMany({
  select: { email: true, createdAt: true, updatedAt: true },
});

console.log('\nSecretary accounts:');
for (const s of secretaries) {
  console.log(`  ${s.email}   created ${s.createdAt.toISOString().slice(0, 10)}`);
}

console.log(`\nCommittee members: ${await db.committeeMember.count()}`);
console.log(`Documents:         ${await db.document.count()}`);
console.log(`Reset codes:       ${await db.passwordReset.count()}`);
console.log(`Login attempts:    ${await db.loginAttempt.count()}\n`);

await db.$disconnect();
