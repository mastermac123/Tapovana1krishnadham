'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import ButtonSolid from '@/components/ui/ButtonSolid';
import Field from '@/components/ui/Field';
import LinkRule from '@/components/ui/LinkRule';
import Row from '@/components/ui/Row';

/**
 * One published document on the desk, in either of two states.
 *
 * Editing changes the wording only — never the file behind it. Replacing a
 * document means publishing the new one and deleting the old, so the record of
 * what was circulated on a given date stays honest.
 *
 * Deleting hides the row and leaves the R2 object in place, so a misclick on a
 * signed set of minutes is recoverable.
 */
export default function DeskDocumentRow({
  id,
  date,
  time,
  title,
  description,
}: {
  id: string;
  date: string;
  time: string;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function save(formData: FormData) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: String(formData.get('title') ?? '').trim(),
          description: String(formData.get('description') ?? '').trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: '' }));
        throw new Error(body.error || 'That change could not be saved.');
      }
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: '' }));
        throw new Error(body.error || 'That document could not be removed.');
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
      setConfirming(false);
    }
  }

  const stamp = (
    <span
      style={{
        flex: '0 0 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        fontSize: 12,
        letterSpacing: '0.14em',
      }}
    >
      <span style={{ color: '#B08D57' }}>{date}</span>
      <span style={{ color: '#5C5A55' }}>{time}</span>
    </span>
  );

  if (editing) {
    return (
      <div style={{ padding: '30px 0', borderTop: '1px solid #E2DDD2' }}>
        <form action={save} style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <Field
            label="Title"
            name="title"
            gap={12}
            defaultValue={title}
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
            rows={3}
            defaultValue={description}
            inputStyle={{ fontSize: 16, lineHeight: 1.8 }}
          />

          {error ? (
            <p style={{ margin: 0, fontSize: 13, color: '#8C4A3A' }}>{error}</p>
          ) : null}

          <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
            <ButtonSolid
              type="submit"
              disabled={busy}
              label={busy ? 'Saving' : 'Save changes'}
              background="#17342C"
              color="#F8F6F1"
              padding="18px 26px"
            />
            <LinkRule
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              Cancel
            </LinkRule>
          </div>
        </form>
      </div>
    );
  }

  return (
    <Row style={{ padding: '30px 0', rowGap: 16 }}>
      {stamp}

      <span
        style={{
          flex: '1 1 300px',
          minWidth: 260,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            lineHeight: 1.25,
          }}
        >
          {title}
        </span>
        {error ? (
          <span style={{ fontSize: 12.5, color: '#8C4A3A' }}>{error}</span>
        ) : null}
      </span>

      <div className="row__actions">
        {confirming ? (
          <>
            <span style={{ color: '#5C5A55' }}>Remove it?</span>
            <LinkRule style={{ color: '#8C4A3A' }} onClick={remove}>
              {busy ? 'Removing' : 'Yes, remove'}
            </LinkRule>
            <LinkRule onClick={() => setConfirming(false)}>Keep</LinkRule>
          </>
        ) : (
          <>
            <LinkRule onClick={() => setEditing(true)}>Edit</LinkRule>
            <LinkRule
              style={{ color: '#8C4A3A' }}
              onClick={() => setConfirming(true)}
            >
              Delete
            </LinkRule>
          </>
        )}
      </div>
    </Row>
  );
}
