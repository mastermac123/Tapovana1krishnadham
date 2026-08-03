import { notFound } from 'next/navigation';
import Reveal from '@/components/motion/Reveal';
import WordRise from '@/components/motion/WordRise';
import PublishForm from '@/components/desk/PublishForm';
import LinkRule from '@/components/ui/LinkRule';
import Row from '@/components/ui/Row';
import { TYPE_LABEL, documentsOfType, toDbType } from '@/lib/documents';
import type { NoticeType } from '@/lib/site';

/** Prototype `sc-if value="{{ isDesk }}"` — the publishing view. */

const SLUGS = ['circular', 'quotation', 'minutes'] as const;

function isSlug(v: string): v is Exclude<NoticeType, 'all'> {
  return (SLUGS as readonly string[]).includes(v);
}

export default async function DeskTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type: slug } = await params;
  if (!isSlug(slug)) notFound();

  const type = toDbType(slug);
  const docs = await documentsOfType(type);

  return (
    <>
      <Reveal
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 40,
          paddingBottom: 34,
          borderBottom: '1px solid #E2DDD2',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: '#B08D57',
            }}
          >
            Publish
          </span>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontWeight: 300,
              fontSize: 'clamp(32px, 3.6vw, 52px)',
              lineHeight: 1.02,
            }}
          >
            <WordRise text={TYPE_LABEL[type]} />
          </h1>
        </div>
        <span style={{ fontSize: 13, fontWeight: 300, color: '#5C5A55' }}>
          {docs.length} published &middot; stored permanently
        </span>
      </Reveal>

      <Reveal className="desk__form">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          <PublishForm slug={slug} />
        </div>

        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            padding: '34px 30px',
            background: '#FFFFFF',
            border: '1px solid #E9E4D9',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: '#B08D57',
            }}
          >
            Recorded automatically
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 300,
              lineHeight: 1.85,
              color: '#5C5A55',
            }}
          >
            Upload date and time are stamped on publication. Files remain on the site
            permanently and can be edited or deleted only from this desk.
          </span>
        </aside>
      </Reveal>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {docs.map((doc) => (
          <Reveal key={doc.id}>
            <Row style={{ padding: '30px 0', rowGap: 16 }}>
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
                <span style={{ color: '#B08D57' }}>{doc.date}</span>
                <span style={{ color: '#5C5A55' }}>{doc.time}</span>
              </span>

              <span
                style={{
                  flex: '1 1 300px',
                  minWidth: 260,
                  fontFamily: 'var(--font-display)',
                  fontSize: 26,
                  lineHeight: 1.25,
                }}
              >
                {doc.title}
              </span>

              {/* TODO(phase 2): PATCH and DELETE /api/documents/[id]. */}
              <div className="row__actions">
                <LinkRule>Edit</LinkRule>
                <LinkRule style={{ color: '#8C4A3A' }}>Delete</LinkRule>
              </div>
            </Row>
          </Reveal>
        ))}
        <div style={{ height: 1, background: '#E2DDD2' }} />
      </div>
    </>
  );
}
