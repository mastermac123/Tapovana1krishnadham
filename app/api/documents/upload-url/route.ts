import { NextResponse } from 'next/server';

import { badRequest, parseBody, requireSecretary, unauthorized } from '@/lib/api';
import { signUpload } from '@/lib/r2';
import { buildObjectKey } from '@/lib/uploads';
import { uploadUrlSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * Step 1 of publishing: hand back a one-shot URL the browser can PUT to.
 *
 * The key is generated here, never accepted from the client — otherwise a
 * caller could choose where in the bucket to write and overwrite an existing
 * document. Content type and length are baked into the signature, so the URL
 * cannot be reused for a different or larger file than was asked for.
 *
 * The declared content type is still only a claim at this point. It is checked
 * against the actual bytes in POST /api/documents, before anything is
 * published.
 */
export async function POST(request: Request) {
  if (!(await requireSecretary())) return unauthorized();

  const parsed = await parseBody(request, uploadUrlSchema);
  if ('error' in parsed) return parsed.error;

  const { type, fileName, contentType, size } = parsed.data;
  const key = buildObjectKey(type, fileName, contentType);

  try {
    const url = await signUpload(key, contentType, size);
    return NextResponse.json({ url, key });
  } catch (e) {
    console.error('could not sign upload', e);
    return badRequest('Storage is not reachable. Check the R2 configuration.');
  }
}
