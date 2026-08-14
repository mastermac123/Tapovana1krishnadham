import type { Metadata } from 'next';
import Reveal from '@/components/motion/Reveal';
import MapBand from '@/components/ui/MapBand';
import PageHeader from '@/components/ui/PageHeader';

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
];

/**
 * The land, itemised.
 *
 * A single total invites the question "made up of what?", and for a society
 * heading into redevelopment that question matters: the recreation ground, the
 * undivided share of the internal road and the setback are each held on
 * different terms. The four figures add to 3,935.33 exactly.
 */
const LAND = [
  { label: 'Society land', value: '2,954.06' },
  { label: 'Recreation ground', value: '565.23' },
  { label: 'Undivided right in internal road land', value: '248.89' },
  { label: 'Road setback area', value: '167.15' },
];

const LAND_TOTAL = '3,935.33';

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
            It is administered by an elected managing committee that meets through
            the year and reports to the general body. Its present work is the
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
              Rani Sati Marg Extn., W.E. Highway,
              <br />
              Malad (E), Mumbai 400097
            </span>
          </Reveal>
        </div>
      </section>

      <section
        className="section-split section-split--inner"
        style={{ borderBottom: '1px solid #E2DDD2' }}
      >
        <Reveal>
          <span style={eyebrow}>Land</span>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {LAND.map((item) => (
            <Reveal key={item.label} className="detail-row">
              <span className="detail-row__label">{item.label}</span>
              <span className="detail-row__value" style={{ fontSize: 22 }}>
                {item.value}
                <span
                  style={{
                    marginLeft: 10,
                    fontSize: 12.5,
                    fontWeight: 300,
                    color: '#5C5A55',
                  }}
                >
                  sq. m.
                </span>
              </span>
            </Reveal>
          ))}

          <Reveal
            className="detail-row"
            style={{ borderTop: '1px solid #17342C', borderBottom: '1px solid #E2DDD2' }}
          >
            <span className="detail-row__label" style={{ color: '#17342C' }}>
              Total in society possession
            </span>
            <span className="detail-row__value">
              {LAND_TOTAL}
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 12.5,
                  fontWeight: 300,
                  color: '#5C5A55',
                }}
              >
                sq. m.
              </span>
            </span>
          </Reveal>
        </div>
      </section>

      <section
        className="section-split section-split--inner"
        style={{ borderBottom: '1px solid #E2DDD2' }}
      >
        <Reveal>
          <span style={eyebrow}>What a society is</span>
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
            A society is a group of people who live in a shared place, keep common
            relationships, and follow the same rules and culture. It is a collection
            of individuals united by certain relations and ways of behaving, who
            share that culture and deal with one another daily.
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
            It relies on connection, communication and cooperation &mdash; to help
            the people in it survive, grow, and live together peacefully.
          </p>
        </Reveal>
      </section>

      <MapBand height={560} style={{ borderBottom: '1px solid #E2DDD2' }} />
    </>
  );
}
