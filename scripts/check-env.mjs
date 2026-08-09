#!/usr/bin/env node
/**
 * Reports which variables in .env.local are filled in, without printing any
 * value. Safe to run and safe to paste the output of anywhere.
 *
 *   node scripts/check-env.mjs
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const KEYS = [
  'R2_ACCOUNT_ID',
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'DATABASE_URL',
  'AUTH_SECRET',
  'SEED_SECRETARY_EMAIL',
  'SEED_SECRETARY_PASSWORD',
  'RESEND_API_KEY',
  'EMAIL_FROM',
];

/** Password reset is the only thing these two affect. */
const OPTIONAL = new Set(['RESEND_API_KEY', 'EMAIL_FROM']);

const ENV_PATH = path.join(import.meta.dirname, '..', '.env.local');

let source;
try {
  source = await readFile(ENV_PATH, 'utf8');
} catch {
  console.error('.env.local not found. Copy .env.example to .env.local first.');
  process.exit(1);
}

let missing = 0;
for (const key of KEYS) {
  const match = source.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm'));
  const value = match ? match[1] : '';
  if (!value && !OPTIONAL.has(key)) missing += 1;
  const state = value ? 'set' : OPTIONAL.has(key) ? 'empty (reset disabled)' : 'EMPTY';
  console.log(`  ${key.padEnd(26)} ${state}`);
}

console.log(
  missing ? `\n${missing} still empty.` : '\nAll set — tell Claude "done".'
);
process.exitCode = missing ? 1 : 0;
