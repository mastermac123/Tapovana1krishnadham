import { Fragment, type CSSProperties } from 'react';

/**
 * Movement 2 — word rise.
 *
 * Headings are split into words **here, at build time**, exactly as the
 * prototype's markup is pre-split. Never split by mutating the DOM after
 * render — that was a real bug in the prototype (HANDOFF.md section 4).
 *
 * Each word gets an overflow-hidden mask so `yPercent: 118 -> 0` on the inner
 * span reads as the word rising out of the line above it. The padding/margin
 * pair keeps descenders (g, y, p) from being clipped by the mask.
 */

const MASK: CSSProperties = {
  display: 'inline-block',
  overflow: 'hidden',
  verticalAlign: 'bottom',
  paddingBottom: '0.1em',
  marginBottom: '-0.1em',
};

const WORD: CSSProperties = {
  display: 'inline-block',
  willChange: 'transform',
};

export default function WordRise({ text }: { text: string }) {
  const words = text.split(' ');

  return (
    <>
      {words.map((word, i) => (
        <Fragment key={`${i}-${word}`}>
          {i > 0 ? ' ' : null}
          <span style={MASK}>
            <span data-w style={WORD}>
              {word}
            </span>
          </span>
        </Fragment>
      ))}
    </>
  );
}
