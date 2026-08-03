import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { signDownload } from '@/lib/r2';
import { canPreviewInline } from '@/lib/uploads';

export const runtime = 'nodejs';

/**
 * Redirects to a short-lived signed URL for the file.
 *
 * Public on purpose: residents read the notice board without an account, and
 * the documents are published to be read. What is *not* public is the bucket —
 * the object key never leaves the server, the URL expires in five minutes, and
 * a deleted document stops resolving immediately.
 *
 * `?inline=1` shows the file in the browser where the format allows it.
 * Anything else downloads, which is also what keeps an uploaded image from
 * being rendered on our own origin.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const document = await db.document.findFirst({
    where: { id, deletedAt: null },
    select: { fileKey: true, fileName: true, mimeType: true },
  });

  if (!document) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const wantsInline = new URL(request.url).searchParams.get('inline') === '1';
  const inline = wantsInline && canPreviewInline(document.mimeType);

  try {
    const url = await signDownload(document.fileKey, document.fileName, inline);
    // 302, and explicitly uncacheable: the URL it points at expires.
    return NextResponse.redirect(url, {
      status: 302,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    console.error('could not sign download', id, e);
    return NextResponse.json(
      { error: 'That file is temporarily unavailable.' },
      { status: 503 }
    );
  }
}
