#!/usr/bin/env node
/**
 * Changes the secretary account's sign-in address.
 *
 *   node scripts/set-secretary-email.mjs new@address.com
 *
 * Normally this is done from /desk/account, which requires the current
 * password. This exists for the case that comes first: fixing the address
 * before anyone has ever signed in.
 *
 * It also rewrites SEED_SECRETARY_EMAIL in .env.local, so a later `db:seed`
 * matches the existing account instead of creating a second one.
 */

import { config } from 'dotenv';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client.ts';

config({ path: ['.env.local', '.env'], quiet: true });

const next = process.argv[2]?.trim().toLowerCase();

if (!next || !next.includes('@')) {
  console.error('Usage: node scripts/set-secretary-email.mjs new@address.com');
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const accounts = await db.secretary.findMany({ select: { id: true, email: true } });

if (accounts.length === 0) {
  console.error('No secretary account exists. Run `npm run db:seed` first.');
  await db.$disconnect();
  process.exit(1);
}

if (accounts.length > 1) {
  console.error(
    `There are ${accounts.length} secretary accounts, so this script cannot tell which to change:`
  );
  for (const a of accounts) console.error(`  ${a.email}`);
  await db.$disconnect();
  process.exit(1);
}

const [account] = accounts;

if (account.email === next) {
  console.log(`Already ${next}. Nothing to do.`);
} else {
  await db.secretary.update({ where: { id: account.id }, data: { email: next } });
  console.log(`Sign-in address changed:\n  ${account.email}\n  -> ${next}`);
}

// Keep the seed in step, so re-seeding never forks a second account.
const envPath = path.join(import.meta.dirname, '..', '.env.local');
try {
  const source = await readFile(envPath, 'utf8');
  const updated = source.replace(
    /^SEED_SECRETARY_EMAIL\s*=.*$/m,
    `SEED_SECRETARY_EMAIL="${next}"`
  );
  if (updated !== source) {
    await writeFile(envPath, updated, 'utf8');
    console.log('SEED_SECRETARY_EMAIL in .env.local updated to match.');
  }
} catch {
  console.log('Could not update .env.local — change SEED_SECRETARY_EMAIL by hand.');
}

await db.$disconnect();
