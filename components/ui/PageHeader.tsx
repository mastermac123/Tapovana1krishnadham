import Reveal from '@/components/motion/Reveal';
import WordRise from '@/components/motion/WordRise';

/**
 * The forest header every inner page opens with — about, committee, notice
 * board, contact. Prototype: a 60vh flex column, bottom aligned, eyebrow above
 * a Display L heading whose words rise on reveal.
 */
export default function PageHeader({
  eyebrow,
  title,
  maxWidth,
}: {
  eyebrow: string;
  title: string;
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
        minHeight: '60vh',
        padding:
          'clamp(140px, 14vw, 200px) var(--section-x) clamp(56px, 6vw, 90px)',
        background: '#17342C',
        color: '#F8F6F1',
      }}
    >
      <Reveal style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: '#B08D57',
          }}
        >
          {eyebrow}
        </span>
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
      </Reveal>
    </section>
  );
}
