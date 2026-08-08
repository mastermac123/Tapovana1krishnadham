#!/usr/bin/env node
/**
 * Proves the R2 bucket is genuinely reachable and correctly configured.
 *
 *   node scripts/test-r2.mjs
 *
 * Uploads a tiny PDF through a signed URL, reads it back, checks the ranged
 * read the publish path depends on, fetches it through a signed download URL,
 * then deletes it and confirms it is gone. Leaves nothing behind.
 *
 * Kept as a diagnostic: run it whenever uploads start failing to find out
 * whether the problem is the bucket or the app.
 */

import { config } from 'dotenv';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
  // Must match lib/r2.ts, or this diagnostic tests something the app does not do.
  requestChecksumCalculation: 'WHEN_REQUIRED',
});

/** Smallest thing that is genuinely a PDF by magic bytes. */
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  'latin1'
);

const key = `_diagnostics/round-trip-${Date.now()}.pdf`;
let failed = 0;

function check(label, ok, detail = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  if (!ok) failed += 1;
}

console.log(`\nBucket: ${BUCKET}\nKey:    ${key}\n`);

try {
  // 1 — signed upload, exactly as the browser would use it
  const putUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: 'application/pdf',
      ContentLength: PDF.length,
    }),
    { expiresIn: 300 }
  );
  check('signed an upload URL', Boolean(putUrl));
  // A checksum baked in at signing time is computed over an empty payload, so
  // R2 would reject the browser's real upload for not matching it.
  check(
    'upload URL carries no premature checksum',
    !putUrl.includes('x-amz-checksum'),
    putUrl.includes('x-amz-checksum') ? 'checksum present — uploads will fail' : ''
  );

  const put = await fetch(putUrl, {
    method: 'PUT',
    body: PDF,
    headers: { 'content-type': 'application/pdf' },
  });
  check('uploaded through the signed URL', put.ok, `HTTP ${put.status}`);
  if (!put.ok) console.log(`        ${(await put.text()).slice(0, 300)}`);

  // 2 — the size check the publish path makes
  const head = await client.send(
    new HeadObjectCommand({ Bucket: BUCKET, Key: key })
  );
  check('read size back', head.ContentLength === PDF.length, `${head.ContentLength} bytes`);

  // 3 — the ranged read the magic-byte verification depends on
  const ranged = await client.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key, Range: 'bytes=0-7' })
  );
  const prefix = Buffer.from(await ranged.Body.transformToByteArray());
  check('ranged read returned the header', prefix.toString('latin1').startsWith('%PDF'), prefix.toString('latin1'));

  // 4 — signed download, as a resident would receive it
  const getUrl = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentDisposition: "inline; filename*=UTF-8''test.pdf",
    }),
    { expiresIn: 300 }
  );
  const got = await fetch(getUrl);
  const body = Buffer.from(await got.arrayBuffer());
  check('downloaded through the signed URL', got.ok && body.equals(PDF), `HTTP ${got.status}, ${body.length} bytes`);
  check(
    'download carried the filename header',
    (got.headers.get('content-disposition') ?? '').includes('test.pdf')
  );

  // 5 — the bucket must not be readable without a signature
  const bare = await fetch(
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${key}`
  );
  check('unsigned request is refused', !bare.ok, `HTTP ${bare.status}`);
} catch (e) {
  failed += 1;
  console.log(`  FAIL  threw — ${e.name}: ${e.message}`);
} finally {
  // 6 — clean up whatever happened above
  try {
    await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    let gone = false;
    try {
      await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch {
      gone = true;
    }
    check('deleted, and confirmed gone', gone);
  } catch (e) {
    check('cleanup', false, e.message);
  }
}

console.log(
  failed ? `\n${failed} check(s) failed.\n` : '\nR2 is connected and working.\n'
);
process.exitCode = failed ? 1 : 0;
