'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

import ButtonGhost from '@/components/ui/ButtonGhost';
import ButtonSolid from '@/components/ui/ButtonSolid';
import Field from '@/components/ui/Field';
import { ALLOWED_MIME, MAX_UPLOAD_BYTES } from '@/lib/uploads';
import type { DocSlug } from '@/lib/doc-types';

/**
 * Publishing, in three moves:
 *
 *   1. ask the server for a signed URL
 *   2. PUT the file straight to R2 — never through the app, which would cap
 *      every upload at the platform's request-body limit
 *   3. tell the server it landed, which verifies the bytes and creates the row
 *
 * If step 3 rejects the file, the server deletes the object. A failed publish
 * leaves nothing behind in the bucket.
 */

const TYPE_TO_DB: Record<DocSlug, 'CIRCULAR' | 'QUOTATION' | 'MINUTES'> = {
  circular: 'CIRCULAR',
  quotation: 'QUOTATION',
  minutes: 'MINUTES',
};

function readableSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'done'; message: string };

export default function PublishForm({ slug }: { slug: DocSlug }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const busy = status.kind === 'working';

  function pickFile(e: ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0] ?? null;
    setStatus({ kind: 'idle' });

    if (chosen && chosen.size > MAX_UPLOAD_BYTES) {
      setFile(null);
      setStatus({
        kind: 'error',
        message: `That file is ${readableSize(chosen.size)}. The limit is 200 MB.`,
      });
      return;
    }

    setFile(chosen);
  }

  async function publish(formData: FormData) {
    const title = String(formData.get('title') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();

    if (!title) {
      setStatus({ kind: 'error', message: 'Give the document a title.' });
      return;
    }
    if (!file) {
      setStatus({ kind: 'error', message: 'Choose a file to publish.' });
      return;
    }

    const contentType = file.type;
    if (!(ALLOWED_MIME as readonly string[]).includes(contentType)) {
      setStatus({
        kind: 'error',
        message: 'Only PDF, Word documents and images can be published.',
      });
      return;
    }

    try {
      setStatus({ kind: 'working', message: 'Preparing…' });

      const signed = await fetch('/api/documents/upload-url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: TYPE_TO_DB[slug],
          fileName: file.name,
          contentType,
          size: file.size,
        }),
      });

      if (!signed.ok) {
        const { error } = await signed.json().catch(() => ({ error: '' }));
        throw new Error(error || 'Could not start the upload.');
      }

      const { url, key } = (await signed.json()) as { url: string; key: string };

      setStatus({
        kind: 'working',
        message: `Uploading ${readableSize(file.size)}…`,
      });

      const put = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'content-type': contentType },
      });

      if (!put.ok) {
        throw new Error(
          `The upload was refused (${put.status}). If this keeps happening, check the bucket's CORS policy.`
        );
      }

      setStatus({ kind: 'working', message: 'Checking the file…' });

      const published = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: TYPE_TO_DB[slug],
          title,
          description,
          fileKey: key,
          fileName: file.name,
        }),
      });

      if (!published.ok) {
        const { error } = await published.json().catch(() => ({ error: '' }));
        throw new Error(error || 'That document could not be published.');
      }

      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      titleRef.current?.reset();
      setStatus({ kind: 'done', message: 'Published. It is on the site now.' });
      router.refresh();
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Something went wrong.',
      });
    }
  }

  return (
    <form ref={titleRef} action={publish} style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      <Field
        label="Title"
        name="title"
        gap={12}
        placeholder="Notice of the annual general meeting"
        inputStyle={{
          fontFamily: 'var(--font-display)',
          fontSize: 26,
          fontWeight: 300,
        }}
      />
      <Field
        label="Description"
        name="description"
        gap={12}
        textarea
        rows={4}
        placeholder="One or two sentences, as it will appear beneath the title."
        inputStyle={{ fontSize: 16, lineHeight: 1.8 }}
      />

      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED_MIME.join(',')}
        onChange={pickFile}
        style={{ display: 'none' }}
      />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '20px 30px',
          paddingTop: 8,
        }}
      >
        <ButtonGhost
          label={file ? 'Change file' : 'Choose file'}
          borderColor="#C9C2B2"
          color="#17342C"
          fill="#17342C"
          gap={40}
          arrow={false}
          swapFrom="#17342C"
          swapTo="#F8F6F1"
          onClick={() => fileRef.current?.click()}
          style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}
        />
        <ButtonSolid
          type="submit"
          disabled={busy}
          label={busy ? 'Working' : 'Publish'}
          background="#17342C"
          color="#F8F6F1"
          padding="21px 30px"
          style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}
        />
      </div>

      {file ? (
        <p style={{ margin: 0, fontSize: 13, fontWeight: 300, color: '#5C5A55' }}>
          {file.name} &middot; {readableSize(file.size)}
        </p>
      ) : null}

      {status.kind !== 'idle' ? (
        <p
          role="status"
          style={{
            margin: 0,
            maxWidth: 460,
            fontSize: 13,
            lineHeight: 1.7,
            color: status.kind === 'error' ? '#8C4A3A' : '#5C5A55',
          }}
        >
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
