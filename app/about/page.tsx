import type { Metadata } from 'next';
import Reveal from '@/components/motion/Reveal';
import ImageBand from '@/components/ui/ImageBand';
import PageHeader from '@/components/ui/PageHeader';
import { MAP_GRID } from '@/lib/patterns';

/** Prototype `sc-if value="{{ isAbout }}"`. */

export const metadata: Metadata = {
  title: 'About us — Tapovan A-1 Krishnadham',
  description:
    'Registered in 1998 and governed since by an elected managing committee.',
};

const eyebrow = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.3em',
  textTransform: 'uppercase' as const,
  color: '#B08D57',
};

const REGISTRATION = [
  {
    label: 'Registered name',
    value: 'Tapovan A‑1 Krishnadham Co‑op. Housing Society Ltd.',
  },
  { label: 'Registration number', value: 'MUM/W‑P/HSG/TC/11827/2002‑03' },
  { label: 'Date of registration', value: '1998' },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About us"
        title={'Twenty‑eight years on the same lane.'}
        maxWidth={900}
      />

      <section
        className="section-split section-split--inner"
        style={{ borderBottom: '1px solid #E2DDD2' }}
      >
        <Reveal>
          <span style={eyebrow}>History</span>
        </Reveal>

        <Reveal
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 34,
            maxWidth: 720,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 19,
              fontWeight: 300,
              lineHeight: 1.8,
              color: '#3A3833',
              textWrap: 'pretty',
            }}
          >
            Tapovan A&#8209;1 was completed and occupied in 1998, and registered the
            same year as a co&#8209;operative housing society. The wing has stood
            since with its original fa&ccedil;ade, its courtyard and its single lift
            lobby.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 16.5,
              fontWeight: 300,
              lineHeight: 1.85,
              color: '#5C5A55',
              textWrap: 'pretty',
            }}
          >
            The society is administered by an elected managing committee that meets
            through the year and reports to the general body. Its present work is the
            redevelopment of the wing, conducted through open tender, with every
            quotation and set of minutes published on this site.
          </p>
        </Reveal>
      </section>

      <section
        className="section-split section-split--inner"
        style={{ borderBottom: '1px solid #E2DDD2' }}
      >
        <Reveal>
          <span style={eyebrow}>Registration</span>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {REGISTRATION.map((item) => (
            <Reveal key={item.label} className="detail-row">
              <span className="detail-row__label">{item.label}</span>
              <span className="detail-row__value">{item.value}</span>
            </Reveal>
          ))}

          <Reveal className="detail-row" style={{ borderBottom: '1px solid #E2DDD2' }}>
            <span className="detail-row__label">Registered address</span>
            <span className="detail-row__value" style={{ lineHeight: 1.35 }}>
              Tapovan A&#8209;1, Krishnadham,
              <br />
              Rani Sati Marg Extension, W.E. Highway,
              <br />
              Malad (E)
            </span>
          </Reveal>
        </div>
      </section>

      <ImageBand
        reveal
        height={560}
        ground="#EDE8DD"
        pattern={MAP_GRID}
        amount={0.1}
        inset="-12% 0"
        caption={'Google map — registered address'}
        captionColor="rgba(36, 36, 36, 0.45)"
        rule
        style={{ borderBottom: '1px solid #E2DDD2' }}
      />
    </>
  );
}
