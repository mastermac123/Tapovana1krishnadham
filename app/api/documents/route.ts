import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { badRequest, parseBody, requireSecretary, unauthorized } from '@/lib/api';
import { db } from '@/lib/db';
import { deleteObject, headObject, readObjectPrefix } from '@/lib/r2';
import { MAX_UPLOAD_BYTES, sniffMime } from '@/lib/uploads';
import { publishSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * Step 2 of publishing: verify what actually landed in R2, then record it.
 *
 * Because the browser uploads straight to R2, the server never sees the bytes
 * in flight — so it reads the first 8 KB back out and sniffs them. A file whose
 * contents disagree with its declared type, or which is missing or oversized,
 * is deleted from the bucket and never becomes a Document row.
 *
 * That ordering matters: an object with no row is invisible and gets cleaned
 * up, whereas a row with no valid object would be a broken download on the
 * public notice board.
 */
export async function POST(request: Request) {
  if (!(await requireSecretary())) return unauthorized();

  const parsed = await parseBody(request, publishSchema);
  if ('error' in parsed) return parsed.error;

  const { type, title, description, fileKey, fileName } = parsed.data;

  const reject = async (message: string) => {
    await deleteObject(fileKey).catch((e) =>
      console.error('could not clean up rejected upload', fileKey, e)
    );
    return badRequest(message);
  };

  const head = await headObject(fileKey);
  if (!head) return badRequest('That upload did not arrive. Try again.');

  if (head.size === 0) return reject('That file is empty.');
  if (head.size > MAX_UPLOAD_BYTES) {
    return reject('That file is larger than the 200 MB limit.');
  }

  const prefix = await readObjectPrefix(fileKey);
  if (!prefix) return reject('That upload could not be read back.');

  const actual = sniffMime(prefix);
  if (!actual) {
    return reject('That file is not a PDF, Word document or image.');
  }

  try {
    const document = await db.document.create({
      data: {
        type,
        title,
        description,
        fileKey,
        fileName,
        fileSize: head.size,
        // The sniffed type, never the browser's claim.
        mimeType: actual,
      },
    });

    revalidatePath('/notices');
    revalidatePath('/');
    return NextResponse.json({ id: document.id }, { status: 201 });
  } catch (e) {
    console.error('could not record document', e);
    return reject('That document could not be saved.');
  }
}

/** The published documents, newest first. Optionally one type only. */
export async function GET(request: Request) {
  if (!(await requireSecretary())) return unauthorized();

  const type = new URL(request.url).searchParams.get('type');
  const documents = await db.document.findMany({
    where: {
      deletedAt: null,
      ...(type === 'CIRCULAR' || type === 'QUOTATION' || type === 'MINUTES'
        ? { type }
        : {}),
    },
    orderBy: { uploadedAt: 'desc' },
  });

  return NextResponse.json({ documents });
}
