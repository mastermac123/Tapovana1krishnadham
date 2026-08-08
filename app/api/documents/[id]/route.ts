import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

import {
  notFound,
  parseBody,
  requireSecretary,
  unauthorized,
} from '@/lib/api';
import { db } from '@/lib/db';
import { DOCUMENTS_TAG } from '@/lib/documents';
import { updateDocumentSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/** Editing a document changes its wording only — never the file behind it. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireSecretary())) return unauthorized();

  const { id } = await params;
  const parsed = await parseBody(request, updateDocumentSchema);
  if ('error' in parsed) return parsed.error;

  const existing = await db.document.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) return notFound('That document no longer exists.');

  await db.document.update({ where: { id }, data: parsed.data });

  revalidateTag(DOCUMENTS_TAG);
  revalidatePath('/notices');
  revalidatePath('/');
  return NextResponse.json({ ok: true });
}

/**
 * Hides the document. The R2 object is deliberately left in place — see
 * CLAUDE.md. These are the society's legal records, and a misclick must not be
 * the end of a signed set of minutes.
 *
 * Restoring is `deletedAt: null`; erasing for real is a separate operation
 * that does not exist yet, and should not be a button on this desk.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireSecretary())) return unauthorized();

  const { id } = await params;
  const existing = await db.document.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) return notFound('That document no longer exists.');

  await db.document.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidateTag(DOCUMENTS_TAG);
  revalidatePath('/notices');
  revalidatePath('/');
  return NextResponse.json({ ok: true });
}
