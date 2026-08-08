import type { Metadata } from 'next';
import Reveal from '@/components/motion/Reveal';
import ImageBand from '@/components/ui/ImageBand';
import PageHeader from '@/components/ui/PageHeader';
import { MAP_GRID } from '@/lib/patterns';

/** Prototype `sc-if value="{{ isAbout }}"`. */

export const metadata: Metadata = {
  title: 'About us — Tapovan A-1 Krishnadham',
  description:
    'Registered in December 2002 and governed since by an elected managing committee.',
};

const eyebrow = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.3em',
  textTransform: 'uppercase' as const,
  color: '#B08D57',
};

/** Every value here comes from the society's own "About us" record. */
const REGISTRATION = [
  {
    label: 'Registered name',
    value: 'Tapovan A‑1 Krishnadham Co‑op. Hsg. Society Ltd.',
  },
  { label: 'Registration number', value: 'Mum/W.P./HSG/TC/11827/2002‑03' },
  { label: 'Date of registration', value: '11 December 2002' },
  { label: 'Members', value: 'Seventy‑two flats, ground plus seven floors' },
  { label: 'Land held', value: '3,935.33 sq. m. in the society’s possession' },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About us"
        /* Phrased by date rather than by a count of years, so it cannot quietly
           go stale on an anniversary the way "Twenty-three years" would. */
        title={'On the same lane since 2002.'}
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
            Tapovan A&#8209;1 Krishnadham was registered as a co&#8209;operative
            housing society on 11 December 2002. The wing rises ground plus seven
            floors and holds seventy&#8209;two flats, set back from Rani Sati Marg
            Extension behind its own courtyard.
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
            The society holds 3,935.33 square metres in all &mdash; the plot itself,
            its recreation ground, an undivided share of the internal road and the
            road setback. It is administered by an elected managing committee that
            meets through the year and reports to the general body. Its present work
            is the redevelopment of the wing, conducted through open tender, with
            every quotation and set of minutes published on this site.
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
              Rani Sati Marg Extn., W.E. Highway,
              <br />
              Malad (E), Mumbai 400097
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
