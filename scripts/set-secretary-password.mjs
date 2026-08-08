#!/usr/bin/env node
/**
 * Sets a new password on the secretary account.
 *
 *   node scripts/set-secretary-password.mjs
 *
 * Prompts in your own terminal — the password is never typed into a chat, a
 * command line (where it would land in shell history), or a shared file.
 *
 * Normally this is done from /desk/account, which requires knowing the current
 * password. This is the way back in when that has been lost.
 */

import { createInterface } from 'node:readline/promises';
import { readFile, writeFile } from 'node:fs/promises';
import { stdin, stdout } from 'node:process';
import path from 'node:path';
import { config } from 'dotenv';
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client.ts';

config({ path: ['.env.local', '.env'], quiet: true });

/** Must match lib/auth.ts and prisma/seed.ts. */
const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/**
 * Neon's free tier suspends the database when idle, and the first connection
 * while it is waking can be refused outright. Retrying a few times turns a
 * confusing ECONNREFUSED into a short pause.
 */
async function withRetry(fn, tries = 5) {
  for (let i = 1; i <= tries; i += 1) {
    try {
      return await fn();
    } catch (e) {
      const cold =
        String(e?.code ?? '') === 'ECONNREFUSED' ||
        /ECONNREFUSED|Can't reach database/i.test(String(e?.message ?? ''));
      if (!cold || i === tries) throw e;
      console.log(`  database asleep, retrying (${i}/${tries - 1})…`);
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

const accounts = await withRetry(() =>
  db.secretary.findMany({ select: { id: true, email: true } })
);

if (accounts.length !== 1) {
  console.error(
    accounts.length === 0
      ? 'No secretary account exists. Run `npm run db:seed`.'
      : `There are ${accounts.length} accounts; this script handles one.`
  );
  await db.$disconnect();
  process.exit(1);
}

const [account] = accounts;
console.log(`\nAccount: ${account.email}\n`);

/**
 * Passing the password as an argument is convenient but leaves it in shell
 * history, so it is only for getting back in when locked out. Prefer the
 * prompt, and change it afterwards from /desk/account.
 */
let next = process.argv[2]?.trim();

if (!next) {
  const rl = createInterface({ input: stdin, output: stdout });
  next = (await rl.question('New password (12+ characters): ')).trim();
  rl.close();
}

if (next.length < 12) {
  console.error('\nToo short — at least 12 characters. Nothing was changed.\n');
  await db.$disconnect();
  process.exit(1);
}

await db.secretary.update({
  where: { id: account.id },
  data: { passwordHash: await hash(next, ARGON2) },
});

console.log('\nPassword changed. Sign in with:');
console.log(`  ${account.email}`);
console.log('  the password you just typed\n');

// Keep .env.local truthful, so the file stays a usable reminder.
const envPath = path.join(import.meta.dirname, '..', '.env.local');
try {
  const source = await readFile(envPath, 'utf8');
  const updated = source.replace(
    /^SEED_SECRETARY_PASSWORD\s*=.*$/m,
    `SEED_SECRETARY_PASSWORD="${next}"`
  );
  if (updated !== source) {
    await writeFile(envPath, updated, 'utf8');
    console.log('.env.local updated to match.\n');
  }
} catch {
  /* Not fatal — the database is what actually matters. */
}

await db.$disconnect();
