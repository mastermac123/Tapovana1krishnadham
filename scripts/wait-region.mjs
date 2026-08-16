#!/usr/bin/env node
/**
 * Waits for a deployment to start serving from the expected region.
 *
 *   node scripts/wait-region.mjs https://tapovana1krishnadham.vercel.app sin1
 *
 * Reads x-vercel-id from a dynamic page — a static one is served from the edge
 * cache and reports only the edge, which is not the question being asked.
 */

const base = (process.argv[2] ?? '').replace(/\/$/, '');
const want = process.argv[3] ?? 'sin1';

if (!base) {
  console.error('usage: node scripts/wait-region.mjs <url> [region]');
  process.exit(1);
}

for (let i = 1; i <= 12; i += 1) {
  const t0 = performance.now();
  const res = await fetch(`${base}/notices`, { cache: 'no-store' }).catch(() => null);
  const ms = Math.round(performance.now() - t0);
  const id = res?.headers.get('x-vercel-id') ?? '';
  const ran = id.split('::')[1] ?? id.split('::')[0] ?? 'unknown';

  console.log(`  ${String(i).padStart(2)}. ran in ${ran.padEnd(6)} ${String(ms).padStart(5)}ms`);

  if (ran === want) {
    console.log(`\n  now serving from ${want}\n`);
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 15_000));
}

console.log(`\n  still not ${want} — the region setting has not taken effect.\n`);
process.exitCode = 1;
