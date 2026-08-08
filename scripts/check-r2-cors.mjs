#!/usr/bin/env node
/**
 * Prints the bucket's current CORS policy.
 *
 *   node scripts/check-r2-cors.mjs
 *
 * "Failed to fetch" when publishing almost always means the origin you are
 * browsing from is missing from AllowedOrigins. The browser blocks the upload
 * before it leaves, so nothing reaches Cloudflare and there is no server log
 * to look at — this is the way to see the cause.
 */

import { config } from 'dotenv';
import { GetBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';

config({ path: ['.env.local', '.env'], quiet: true });

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

try {
  const res = await client.send(
    new GetBucketCorsCommand({ Bucket: process.env.R2_BUCKET })
  );

  const rules = res.CORSRules ?? [];
  if (rules.length === 0) {
    console.log('\nNo CORS rules are set. Uploads from a browser cannot work.\n');
  } else {
    console.log('\nAllowed origins:\n');
    for (const rule of rules) {
      for (const o of rule.AllowedOrigins ?? []) console.log(`  ${o}`);
      console.log(`\n  methods: ${(rule.AllowedMethods ?? []).join(', ')}`);
      console.log(`  headers: ${(rule.AllowedHeaders ?? []).join(', ')}\n`);
    }
  }
} catch (e) {
  const code = e?.Code ?? e?.name ?? 'unknown';
  if (code === 'NoSuchCORSConfiguration') {
    console.log('\nNo CORS policy exists on this bucket. That is the problem.\n');
  } else if (code === 'AccessDenied') {
    console.log(
      '\nThis API token cannot read bucket settings — it is scoped to objects only.\n' +
        'Check the policy in the Cloudflare dashboard instead.\n'
    );
  } else {
    console.log(`\nCould not read CORS: ${code} — ${e?.message ?? ''}\n`);
  }
}
