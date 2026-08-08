#!/usr/bin/env node
/**
 * Sets the bucket's CORS policy.
 *
 *   node scripts/set-r2-cors.mjs                          (localhost only)
 *   node scripts/set-r2-cors.mjs https://your.vercel.app   (adds a domain)
 *
 * The browser uploads straight to R2, so R2 must be told which origins are
 * allowed to PUT to it. Without a matching rule the upload is blocked before
 * it ever leaves the browser, with an error that does not say why.
 *
 * Run this again after deploying, with the live domain.
 */

import { config } from 'dotenv';
import { PutBucketCorsCommand, GetBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';

config({ path: ['.env.local', '.env'], quiet: true });

const need = (k) => {
  const v = process.env[k];
  if (!v) {
    console.error(`${k} is not set in .env.local`);
    process.exit(1);
  }
  return v;
};

const BUCKET = need('R2_BUCKET');
const client = new S3Client({
  region: 'auto',
  endpoint: `https://${need('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: need('R2_ACCESS_KEY_ID'),
    secretAccessKey: need('R2_SECRET_ACCESS_KEY'),
  },
});

/** Every port the dev server realistically lands on, plus anything passed in. */
const origins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3300',
  'http://localhost:3410',
  ...process.argv.slice(2).map((o) => o.trim().replace(/\/$/, '')),
];

await client.send(
  new PutBucketCorsCommand({
    Bucket: BUCKET,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: origins,
          AllowedMethods: ['PUT', 'GET'],
          AllowedHeaders: ['content-type'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  })
);

const current = await client.send(new GetBucketCorsCommand({ Bucket: BUCKET }));

console.log(`\nCORS policy on ${BUCKET}:\n`);
for (const rule of current.CORSRules ?? []) {
  for (const origin of rule.AllowedOrigins ?? []) console.log(`  ${origin}`);
  console.log(`  methods: ${(rule.AllowedMethods ?? []).join(', ')}\n`);
}
