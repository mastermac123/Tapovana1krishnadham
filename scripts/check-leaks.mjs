#!/usr/bin/env node
/**
 * Searches the built client bundles for anything secret.
 *
 *   npm run build && node scripts/check-leaks.mjs
 *
 * Everything under .next/static is downloaded by every visitor's browser. A
 * secret that reaches it is public, whatever the server does. Run this before
 * any deploy.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from 'dotenv';

config({ path: ['.env.local', '.env'], quiet: true });

const STATIC_DIR = path.join(import.meta.dirname, '..', '.next', 'static');

/** Name -> the value that must never appear in a client bundle. */
const SECRETS = [
  'R2_SECRET_ACCESS_KEY',
  'R2_ACCESS_KEY_ID',
  'AUTH_SECRET',
  'RESEND_API_KEY',
  'SEED_SECRETARY_PASSWORD',
];

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const watched = SECRETS.map((name) => ({ name, value: process.env[name] })).filter(
  (s) => s.value && s.value.length > 8
);

// The database password sits inside the connection string.
const dbUrl = process.env.DATABASE_URL ?? '';
const dbPassword = dbUrl.match(/\/\/[^:]+:([^@]+)@/)?.[1];
if (dbPassword) watched.push({ name: 'DATABASE_URL password', value: dbPassword });

let scanned = 0;
const found = [];

for await (const file of walk(STATIC_DIR)) {
  if (!/\.(js|mjs|css|map|json)$/.test(file)) continue;
  scanned += 1;
  const text = await readFile(file, 'utf8').catch(() => '');
  for (const secret of watched) {
    if (text.includes(secret.value)) {
      found.push({ secret: secret.name, file: path.relative(STATIC_DIR, file) });
    }
  }
}

console.log(`\nScanned ${scanned} client files for ${watched.length} secrets.\n`);

if (found.length === 0) {
  console.log('  No secret appears in any client bundle.\n');
} else {
  for (const f of found) console.log(`  LEAKED  ${f.secret}  in  ${f.file}`);
  console.log('');
}

process.exitCode = found.length ? 1 : 0;
