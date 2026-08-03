import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Reveal from '@/components/motion/Reveal';
import ImageBand from '@/components/ui/ImageBand';
import PageHeader from '@/components/ui/PageHeader';
import { MAP_GRID } from '@/lib/patterns';

/** Prototype `sc-if value="{{ isContact }}"`. */

export const metadata: Metadata = {
  title: 'Contact — Tapovan A-1 Krishnadham',
  description: 'The registered address and email of the society.',
};

/**
 * The society publishes no telephone numbers; correspondence goes to the
 * registered address or the society email.
 */
const DETAILS: {
  label: string;
  value: ReactNode;
  wrap?: boolean;
  /** Set on the address, which takes the About page's multi-line treatment. */
  multiline?: boolean;
}[] = [
  {
    label: 'Registered address',
    multiline: true,
    value: (
      <>
        Tapovan A&#8209;1, Krishnadham,
        <br />
        Rani Sati Marg Extension, W.E. Highway,
        <br />
        Malad (E)
      </>
    ),
  },
  {
    label: 'Society email',
    value: 'secretarytapovan@gmail.com',
    wrap: true,
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader eyebrow="Contact" title="Two ways to reach us." />

      <section
        className="section-split section-split--inner"
        style={{ borderBottom: '1px solid #E2DDD2' }}
      >
        <Reveal>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: '#B08D57',
            }}
          >
            Details
          </span>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {DETAILS.map((item, i) => (
            <Reveal
              key={item.label}
              className="detail-row detail-row--contact"
              style={
                i === DETAILS.length - 1
                  ? { borderBottom: '1px solid #E2DDD2' }
                  : undefined
              }
            >
              <span className="detail-row__label">{item.label}</span>
              <span
                className="detail-row__value"
                style={{
                  ...(item.multiline
                    ? { lineHeight: 1.35 }
                    : {
                        fontSize: item.wrap
                          ? 'clamp(24px, 2.8vw, 40px)'
                          : 'clamp(26px, 2.8vw, 40px)',
                      }),
                  ...(item.wrap ? { wordBreak: 'break-word' as const } : {}),
                }}
              >
                {item.value}
              </span>
            </Reveal>
          ))}
        </div>
      </section>

      <ImageBand
        reveal
        height={620}
        ground="#EDE8DD"
        pattern={MAP_GRID}
        amount={0.1}
        inset="-12% 0"
        caption={'Google map — society address'}
        captionColor="rgba(36, 36, 36, 0.45)"
        rule
      />
    </>
  );
}
