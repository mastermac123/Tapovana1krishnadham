import type { Metadata } from 'next';
import Reveal from '@/components/motion/Reveal';
import LinkRule from '@/components/ui/LinkRule';
import PageHeader from '@/components/ui/PageHeader';
import Row from '@/components/ui/Row';
import { documentCounts, documentsFor, parseNoticeType } from '@/lib/documents';
import { NOTICE_MENU, noticeHref } from '@/lib/site';
import { canPreviewInline } from '@/lib/uploads';

/** Prototype `sc-if value="{{ isDocs }}"`. */

export const metadata: Metadata = {
  title: 'Notice board — Tapovan A-1 Krishnadham',
  description:
    'Circulars, redevelopment quotations and meeting minutes, published together and never withdrawn.',
};

const NOTE =
  'Circulars, redevelopment quotations and meeting minutes are published here together and are never withdrawn.';

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>;
}) {
  const { type } = await searchParams;
  const filter = parseNoticeType(type);

  const [counts, shown] = await Promise.all([
    documentCounts(),
    documentsFor(filter),
  ]);
  const total = counts.all;

  return (
    <>
      <PageHeader
        eyebrow="Notice board"
        title="Every paper the committee has put on record."
        maxWidth={940}
      />

      <section className="section-split section-split--inner">
        <Reveal style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
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
              {shown.length} of {total} published
            </span>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 300,
                lineHeight: 1.8,
                color: '#5C5A55',
              }}
            >
              {NOTE}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {NOTICE_MENU.map((item) => {
              const active = item.type === filter;
              return (
                <LinkRule
                  key={item.type}
                  href={noticeHref(item.type)}
                  plain
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 16,
                    alignItems: 'baseline',
                    padding: '16px 0',
                    borderTop: '1px solid #E2DDD2',
                    fontSize: 11.5,
                    fontWeight: 500,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: active ? '#17342C' : '#5C5A55',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <span>{item.label}</span>
                    <span
                      style={{
                        height: 1,
                        background: active ? '#B08D57' : 'transparent',
                      }}
                    />
                  </span>
                  <span style={{ fontSize: 11, color: '#B08D57' }}>
                    {counts[item.type]}
                  </span>
                </LinkRule>
              );
            })}
            <div style={{ height: 1, background: '#E2DDD2' }} />
          </div>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {shown.map((doc) => (
            <Reveal key={doc.id}>
              <Row style={{ padding: '38px 0' }}>
                <span
                  style={{
                    flex: '0 0 120px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    fontSize: 12.5,
                    letterSpacing: '0.14em',
                  }}
                >
                  <span style={{ color: '#B08D57' }}>{doc.date}</span>
                  <span style={{ color: '#5C5A55' }}>{doc.time}</span>
                </span>

                <span
                  style={{
                    flex: '3 1 300px',
                    minWidth: 260,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 500,
                      letterSpacing: '0.24em',
                      textTransform: 'uppercase',
                      color: '#5C5A55',
                    }}
                  >
                    {doc.tag}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 32,
                      lineHeight: 1.2,
                    }}
                  >
                    {doc.title}
                  </span>
                </span>

                <span
                  style={{
                    flex: '2 1 240px',
                    minWidth: 220,
                    fontSize: 14,
                    fontWeight: 300,
                    lineHeight: 1.75,
                    color: '#5C5A55',
                  }}
                >
                  {doc.description}
                </span>

                {/* Both hit the same endpoint, which answers with a five-minute
                    signed URL. Preview is offered only for formats a browser
                    can actually render; DOCX always downloads. */}
                <div className="row__actions row__actions--wide">
                  {canPreviewInline(doc.mimeType) ? (
                    <LinkRule native href={`/api/documents/${doc.id}/download?inline=1`}>
                      Preview
                    </LinkRule>
                  ) : null}
                  <LinkRule native href={`/api/documents/${doc.id}/download`}>
                    Download
                  </LinkRule>
                </div>
              </Row>
            </Reveal>
          ))}
          <div style={{ height: 1, background: '#E2DDD2' }} />
        </div>
      </section>
    </>
  );
}
