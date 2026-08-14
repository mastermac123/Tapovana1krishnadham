#!/usr/bin/env node
/**
 * Fills in the blanks in .env.local.
 *
 * Prompts for every variable that is still empty and writes the answers
 * straight to disk. Secrets never travel through a chat window, a shared
 * document, or a synced folder — they go from your clipboard to the file and
 * stop there.
 *
 *   node scripts/set-env.mjs
 *
 * Re-runnable: values that are already set are left alone unless you pass
 * --all, which re-prompts for everything.
 */

import { createInterface } from 'node:readline/promises';
import { readFile, writeFile } from 'node:fs/promises';
import { stdin, stdout, argv } from 'node:process';
import path from 'node:path';

const ENV_PATH = path.join(import.meta.dirname, '..', '.env.local');
const REPROMPT_ALL = argv.includes('--all');

/**
 * Values may also be given as `--NAME=value`, which skips the prompt for that
 * one. Convenient, but it leaves the value in your shell history — fine for
 * something you are about to rotate anyway, worth avoiding otherwise.
 */
const fromArgs = new Map(
  argv
    .filter((a) => a.startsWith('--') && a.includes('=') && a !== '--all')
    .map((a) => {
      const eq = a.indexOf('=');
      return [a.slice(2, eq), a.slice(eq + 1)];
    })
);

/** Prompt text per variable, in the order they are asked. */
const PROMPTS = {
  R2_ACCESS_KEY_ID: 'Cloudflare R2 — Access Key ID',
  R2_SECRET_ACCESS_KEY: 'Cloudflare R2 — Secret Access Key',
  DATABASE_URL: 'Neon — pooled connection string (host contains "-pooler")',
  SEED_SECRETARY_EMAIL: 'Secretary sign-in email',
  SEED_SECRETARY_PASSWORD: 'Secretary password (12+ characters)',
  // Either provider works; Brevo is preferred because it verifies a single
  // sender address rather than a whole domain, and so can deliver to whatever
  // address the next secretary uses. Leave the other blank.
  BREVO_API_KEY: 'Brevo API key, starts xkeysib- (reset email) — blank to skip',
  RESEND_API_KEY: 'Resend API key, starts re_ — blank if using Brevo',
  EMAIL_FROM: 'Send FROM — the address verified with your provider',
};

/** Shows enough to confirm the right thing landed, never the whole value. */
function mask(value) {
  if (value.length <= 8) return '*'.repeat(value.length);
  return `${value.slice(0, 4)}${'*'.repeat(12)}${value.slice(-4)}`;
}

function readValue(source, key) {
  const match = source.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm'));
  return match ? match[1] : '';
}

function writeValue(source, key, value) {
  const line = `${key}="${value}"`;
  const pattern = new RegExp(`^${key}\\s*=.*$`, 'm');
  return pattern.test(source) ? source.replace(pattern, line) : `${source}\n${line}\n`;
}

const problems = [];

function validate(key, value) {
  if (!value) return 'must not be empty';
  if (key === 'DATABASE_URL' && !value.startsWith('postgres')) {
    return 'should start with postgresql://';
  }
  if (key === 'SEED_SECRETARY_PASSWORD' && value.length < 12) {
    return 'must be at least 12 characters';
  }
  if (key === 'SEED_SECRETARY_EMAIL' && !value.includes('@')) {
    return 'does not look like an email address';
  }
  return null;
}

let source;
try {
  source = await readFile(ENV_PATH, 'utf8');
} catch {
  console.error(
    `.env.local not found at ${ENV_PATH}\nCopy .env.example to .env.local first.`
  );
  process.exit(1);
}

const rl = createInterface({ input: stdin, output: stdout });

console.log('\nPaste each value and press Enter. Blank keeps the current one.\n');

for (const [key, label] of Object.entries(PROMPTS)) {
  const given = fromArgs.get(key);
  if (given !== undefined) {
    const problem = validate(key, given);
    if (problem) problems.push(`${key} ${problem}`);
    source = writeValue(source, key, given);
    console.log(`  ${key.padEnd(24)} set from argument  ${mask(given)}`);
    continue;
  }

  const current = readValue(source, key);
  if (current && !REPROMPT_ALL) {
    console.log(`  ${key.padEnd(24)} already set  ${mask(current)}`);
    continue;
  }

  const answer = (await rl.question(`  ${label}\n  ${key} = `)).trim();
  console.log('');

  if (!answer) {
    // Mail is optional until the society sets up a sender, and only one of the
    // two providers is ever needed.
    const optional =
      key === 'BREVO_API_KEY' ||
      key === 'RESEND_API_KEY' ||
      key === 'EMAIL_FROM';
    if (!current && !optional) problems.push(`${key} left empty`);
    continue;
  }

  const problem = validate(key, answer);
  if (problem) problems.push(`${key} ${problem}`);

  source = writeValue(source, key, answer);
}

rl.close();
await writeFile(ENV_PATH, source, 'utf8');

console.log('\nSaved to .env.local\n');
for (const key of Object.keys(PROMPTS)) {
  const value = readValue(source, key);
  console.log(`  ${key.padEnd(24)} ${value ? mask(value) : 'STILL EMPTY'}`);
}

if (problems.length) {
  console.log('\nNeeds attention:');
  for (const p of problems) console.log(`  - ${p}`);
  process.exitCode = 1;
} else {
  console.log('\nAll set. Tell Claude "done".');
}
