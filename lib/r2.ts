import 'server-only';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cloudflare R2, over the S3 API.
 *
 * The bucket is private. Nothing is ever publicly addressable: every read and
 * every write goes through a short-lived signed URL minted here, so the
 * credentials never leave the server and a leaked link expires on its own.
 *
 * Uploads go browser -> R2 directly. Routing them through the app would cap
 * every file at the platform request-body limit (4.5 MB on Vercel), which is
 * far below what a scanned tender document needs. The trade-off is that the
 * server never sees the bytes in flight, so `readObjectPrefix` re-reads the
 * head of the finished object to verify its magic bytes before the document is
 * ever published. See lib/uploads.ts.
 */

const UPLOAD_URL_TTL = 300; // 5 minutes to start and finish a PUT
const DOWNLOAD_URL_TTL = 300; // 5 minutes; the browser follows it immediately

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill in the Cloudflare R2 credentials.`
    );
  }
  return value;
}

let client: S3Client | undefined;

function r2(): S3Client {
  if (client) return client;
  client = new S3Client({
    // R2 is region-agnostic; the S3 SDK still demands a value.
    region: 'auto',
    endpoint: `https://${required('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required('R2_ACCESS_KEY_ID'),
      secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
    },
    /**
     * Recent SDK versions add a CRC32 checksum to every PutObject by default.
     * On a *presigned* URL that checksum is computed at signing time — when
     * there is no payload — so it signs the checksum of nothing, and R2 then
     * rejects the browser's real upload for not matching. WHEN_REQUIRED keeps
     * checksums for calls that genuinely need them and leaves presigned PUTs
     * alone.
     */
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
  return client;
}

function bucket(): string {
  return required('R2_BUCKET');
}

/**
 * A one-shot URL the browser may PUT to.
 *
 * Content type and length are baked into the signature, so the URL cannot be
 * reused to upload a different kind of file, or a larger one, than the request
 * that produced it.
 */
export async function signUpload(
  key: string,
  contentType: string,
  contentLength: number
): Promise<string> {
  return getSignedUrl(
    r2(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
    { expiresIn: UPLOAD_URL_TTL }
  );
}

/**
 * A one-shot URL to read an object.
 *
 * `filename` sets the download name so residents get
 * "Minutes — June.pdf" rather than the internal key. `inline` shows the file in
 * the browser where the format allows it; everything else is forced to
 * download rather than rendered, which also stops an uploaded SVG or HTML
 * masquerading as a document from executing on our origin.
 */
export async function signDownload(
  key: string,
  filename: string,
  inline: boolean
): Promise<string> {
  const disposition = inline ? 'inline' : 'attachment';
  // RFC 5987 — keeps non-ASCII titles intact without breaking the header.
  const encoded = encodeURIComponent(filename);

  return getSignedUrl(
    r2(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentDisposition: `${disposition}; filename*=UTF-8''${encoded}`,
    }),
    { expiresIn: DOWNLOAD_URL_TTL }
  );
}

/** Size and type as R2 actually stored them, for post-upload verification. */
export async function headObject(
  key: string
): Promise<{ size: number; contentType?: string } | null> {
  try {
    const res = await r2().send(
      new HeadObjectCommand({ Bucket: bucket(), Key: key })
    );
    return { size: res.ContentLength ?? 0, contentType: res.ContentType };
  } catch {
    return null;
  }
}

/**
 * The first `length` bytes of an object, for magic-byte sniffing. A ranged GET
 * so verifying a 200 MB upload costs one small read, not a full download.
 */
export async function readObjectPrefix(
  key: string,
  length = 8192
): Promise<Uint8Array | null> {
  try {
    const res = await r2().send(
      new GetObjectCommand({
        Bucket: bucket(),
        Key: key,
        Range: `bytes=0-${length - 1}`,
      })
    );
    const bytes = await res.Body?.transformToByteArray();
    return bytes ?? null;
  } catch {
    return null;
  }
}

/**
 * Hard-erases an object. Deleting a *document* does not call this — that path
 * hides the row and leaves the file recoverable (see CLAUDE.md). This is for
 * cleaning up uploads that failed verification and were never published.
 */
export async function deleteObject(key: string): Promise<void> {
  await r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
