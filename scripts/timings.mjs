#!/usr/bin/env node
/**
 * How long each page takes to answer, and where it ran.
 *
 *   node scripts/timings.mjs https://tapovana1krishnadham.vercel.app
 *
 * Three passes per page: the first pays for a cold function, the later ones
 * show the steady state. The x-vercel-id header names the edge and the region
 * the code executed in — when those differ, and the database sits somewhere
 * else again, that distance is usually the whole story.
 */

const base = (process.argv[2] ?? 'http://localhost:3410').replace(/\/$/, '');
const pages = ['/', '/about', '/notices', '/committee', '/contact', '/login'];

console.log(`\n${base}\n`);

let region = '';

for (const page of pages) {
  const times = [];
  for (let i = 0; i < 3; i += 1) {
    const t0 = performance.now();
    const res = await fetch(`${base}${page}`, { cache: 'no-store' }).catch(() => null);
    times.push(Math.round(performance.now() - t0));
    if (res && !region) region = res.headers.get('x-vercel-id') ?? '';
  }
  const best = Math.min(...times);
  const flag = best > 800 ? '  <-- slow' : '';
  console.log(
    `  ${page.padEnd(12)} best ${String(best).padStart(5)}ms   (${times.join(', ')})${flag}`
  );
}

if (region) {
  const hops = region.split('::');
  console.log(`\n  edge: ${hops[0]}   executed in: ${hops[1] ?? hops[0]}`);
}
console.log('');
