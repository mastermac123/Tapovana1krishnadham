import Reveal from '@/components/motion/Reveal';
import WordRise from '@/components/motion/WordRise';

/**
 * The forest header every inner page opens with — about, committee, notice
 * board, contact. Prototype: a 60vh flex column, bottom aligned, eyebrow above
 * a Display L heading whose words rise on reveal.
 */
const eyebrowStyle = {
  margin: 0,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.32em',
  textTransform: 'uppercase' as const,
  color: '#B08D57',
};

export default function PageHeader({
  eyebrow,
  title,
  maxWidth,
}: {
  eyebrow: string;
  /**
   * Omit to open the page on the eyebrow alone.
   *
   * When it is left out the eyebrow becomes the h1 rather than disappearing:
   * the page still needs exactly one top-level heading for screen readers and
   * for search results, even when the design does not want a large line.
   */
  title?: string;
  /** The prototype caps some of these headings and lets others run full width. */
  maxWidth?: number;
}) {
  return (
    <section
      data-dark
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        // Without a heading the band has far less to hold, and the prototype's
        // 60vh would read as an empty green panel rather than an opening.
        minHeight: title ? '60vh' : 'clamp(200px, 26vh, 300px)',
        padding: title
          ? 'clamp(140px, 14vw, 200px) var(--section-x) clamp(56px, 6vw, 90px)'
          : 'clamp(110px, 11vw, 150px) var(--section-x) clamp(40px, 4vw, 58px)',
        background: '#17342C',
        color: '#F8F6F1',
      }}
    >
      <Reveal style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        {title ? (
          <>
            <span style={eyebrowStyle}>{eyebrow}</span>
            <h1
              style={{
                margin: 0,
                maxWidth,
                fontFamily: 'var(--font-display)',
                fontWeight: 300,
                fontSize: 'var(--text-display-l)',
                lineHeight: 0.98,
                letterSpacing: '-0.02em',
              }}
            >
              <WordRise text={title} />
            </h1>
          </>
        ) : (
          <h1 style={eyebrowStyle}>{eyebrow}</h1>
        )}
      </Reveal>
    </section>
  );
}
