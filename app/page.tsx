import Hero from '@/components/home/Hero';
import Reveal from '@/components/motion/Reveal';
import WordRise from '@/components/motion/WordRise';
import ButtonGhost from '@/components/ui/ButtonGhost';
import ImageBand from '@/components/ui/ImageBand';
import LinkRule from '@/components/ui/LinkRule';
import MapBand from '@/components/ui/MapBand';
import Row from '@/components/ui/Row';
import { latestDocuments } from '@/lib/documents';
import { fromDbType } from '@/lib/doc-types';
import { COURTYARD_WEAVE, ENTRANCE_WEAVE } from '@/lib/patterns';
import { buildingPhoto } from '@/lib/photos';

/** Prototype `sc-if value="{{ isHome }}"`. */

/**
 * Prerendered, and rebuilt when the documents tag is invalidated — which
 * publishing, editing and deleting all do. Rendering this on every request
 * instead cost about 600ms a visit for data that changes a few times a month.
 */

const eyebrow = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.3em',
  textTransform: 'uppercase' as const,
  color: '#B08D57',
};

/** From the society's own "About us" record. */
const FIGURES = [
  { value: '72', label: 'Flats' },
  { value: 'G + 7', label: 'Floors' },
  { value: '3,935', label: 'Sq. metres held' },
  { value: '2002', label: 'Registered' },
];

const linkLabel = {
  alignSelf: 'flex-start' as const,
  gap: 8,
  fontSize: 11.5,
  fontWeight: 500,
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
};

export default async function HomePage() {
  const latest = await latestDocuments(3);
  const photo = buildingPhoto();

  return (
    <>
      <Hero photo={photo} />

      {/* 01 — The society */}
      <section className="section-split" style={{ borderBottom: '1px solid #E2DDD2' }}>
        <Reveal style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={eyebrow}>01 &mdash; The society</span>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 60 }}>
          <Reveal>
            <h2
              style={{
                margin: 0,
                maxWidth: 900,
                fontFamily: 'var(--font-display)',
                fontWeight: 300,
                fontSize: 'var(--text-display-m)',
                lineHeight: 1.06,
                letterSpacing: '-0.015em',
              }}
            >
              <WordRise text="One wing on a quiet lane, held in common by the families who live in it." />
            </h2>
          </Reveal>

          <Reveal
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 'clamp(40px, 6vw, 90px)',
              paddingTop: 44,
              borderTop: '1px solid #E2DDD2',
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
              Krishnadham was registered in December 2002 and has been governed
              since by an elected managing committee. The society is now preparing
              for redevelopment, and every document in that process is published
              here.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
              <LinkRule href="/about" style={linkLabel}>
                About the society
              </LinkRule>
              <LinkRule href="/committee" style={linkLabel}>
                Committee members
              </LinkRule>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Full-bleed courtyard */}
      {/* The photograph appears once, in the hero. This band keeps the
          prototype's woven ground and its drift, and carries the society's own
          figures rather than a caption announcing a missing photograph. */}
      <ImageBand
        minHeight={560}
        ground="#EDE8DD"
        pattern={COURTYARD_WEAVE}
        amount={0.16}
        inset="-16% 0"
      >
        <div className="figures">
          <Reveal className="figures__grid">
            {FIGURES.map((figure) => (
              <span key={figure.label} className="figures__item">
                <span className="figures__value">{figure.value}</span>
                <span className="figures__label">{figure.label}</span>
              </span>
            ))}
          </Reveal>
        </div>
      </ImageBand>

      {/* 02 — Notice board */}
      <section className="section-split" style={{ borderBottom: '1px solid #E2DDD2' }}>
        <Reveal style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={eyebrow}>02 &mdash; Notice board</span>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 300,
              lineHeight: 1.8,
              color: '#5C5A55',
            }}
          >
            The three most recent papers &mdash; circulars, quotations and minutes,
            together.
          </p>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {latest.map((doc) => (
            <Reveal key={doc.id}>
              <Row style={{ padding: '36px 0' }}>
                <span
                  style={{
                    flex: '0 0 120px',
                    fontSize: 12.5,
                    letterSpacing: '0.14em',
                    color: '#B08D57',
                  }}
                >
                  {doc.date}
                </span>
                <span
                  style={{
                    flex: '3 1 300px',
                    minWidth: 260,
                    fontFamily: 'var(--font-display)',
                    fontSize: 30,
                    lineHeight: 1.2,
                  }}
                >
                  {doc.title}
                </span>
                <span
                  style={{
                    flex: '2 1 220px',
                    minWidth: 200,
                    fontSize: 14,
                    fontWeight: 300,
                    lineHeight: 1.7,
                    color: '#5C5A55',
                  }}
                >
                  {doc.description}
                </span>
                <div className="row__actions">
                  <LinkRule href={`/notices?type=${fromDbType(doc.type)}`}>
                    {doc.tag} &rarr;
                  </LinkRule>
                </div>
              </Row>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Speak to the office */}
      <section className="band-split" data-dark>
        <div className="band-split__copy">
          <Reveal>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontWeight: 300,
                fontSize: 'clamp(34px, 4.2vw, 60px)',
                lineHeight: 1.04,
              }}
            >
              <WordRise text="Speak to the office." />
            </h2>
          </Reveal>

          <Reveal style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            <p
              style={{
                margin: 0,
                maxWidth: 420,
                fontSize: 17,
                fontWeight: 300,
                lineHeight: 1.8,
                color: 'rgba(248, 246, 241, 0.7)',
              }}
            >
              The committee is reachable by email through the day; correspondence
              goes to the registered society address.
            </p>
            <ButtonGhost
              href="/contact"
              label="Contact details"
              style={{ alignSelf: 'flex-start' }}
            />
          </Reveal>
        </div>

        <MapBand minHeight={620} />
      </section>
    </>
  );
}
