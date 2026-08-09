#!/usr/bin/env node
/**
 * Recent password-reset codes, without revealing any of them.
 *
 *   node scripts/peek-resets.mjs
 *
 * Codes are stored hashed, so this can only show that one was issued, when it
 * expires and whether it has been spent — which is what you want when someone
 * says "the email never arrived".
 */

import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client.ts';

config({ path: ['.env.local', '.env'], quiet: true });

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const rows = await db.passwordReset.findMany({
  orderBy: { createdAt: 'desc' },
  take: 5,
});

if (rows.length === 0) {
  console.log('\nNo reset codes have ever been issued.\n');
} else {
  console.log('\nMost recent first:\n');
  for (const r of rows) {
    const when = r.createdAt.toISOString().replace('T', ' ').slice(0, 19);
    const live = !r.usedAt && r.expiresAt > new Date();
    console.log(
      `  ${when}  ${r.email.padEnd(30)} ${live ? 'LIVE ' : r.usedAt ? 'spent' : 'expired'}  attempts ${r.attempts}`
    );
  }
  console.log('');
}

await db.$disconnect();
