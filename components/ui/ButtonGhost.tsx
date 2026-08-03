'use client';

import type { CSSProperties } from 'react';
import CurtainLink from '@/components/ui/CurtainLink';
import { useFillHover } from '@/components/motion/useFillHover';

/**
 * The outlined button — prototype `data-btn="ghost"`.
 *
 * Two variants exist in the prototype:
 *   home "Contact details"  border rgba(248,246,241,0.4), 20px/28px, gap 44,
 *                           champagne fill, no ink swap (label is already ivory)
 *   desk "Choose PDF"       border #C9C2B2, forest ink, 20px/28px, gap 40,
 *                           forest fill, label swaps forest -> ivory
 */
export default function ButtonGhost({
  href,
  label,
  borderColor = 'rgba(248, 246, 241, 0.4)',
  color,
  fill = '#B08D57',
  padding = '20px 28px',
  gap = 44,
  arrow = true,
  swapFrom,
  swapTo,
  type = 'button',
  onClick,
  style,
}: {
  href?: string;
  label: string;
  borderColor?: string;
  color?: string;
  fill?: string;
  padding?: string;
  gap?: number;
  arrow?: boolean;
  /** Set both to cross-fade the label as the ground arrives. */
  swapFrom?: string;
  swapTo?: string;
  type?: 'button' | 'submit';
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const ref = useFillHover<HTMLAnchorElement & HTMLButtonElement>({
    swapFrom,
    swapTo,
  });

  const shell: CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap,
    padding,
    border: `1px solid ${borderColor}`,
    color,
    overflow: 'hidden',
    ...style,
  };

  const swaps = Boolean(swapFrom && swapTo);

  const body = (
    <>
      <span
        data-fill
        aria-hidden
        style={{ position: 'absolute', inset: 0, background: fill }}
      />
      <span
        {...(swaps ? { 'data-swap': '' } : {})}
        style={{
          position: 'relative',
          fontSize: 11.5,
          fontWeight: 500,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      {arrow ? (
        <span
          data-arrow
          aria-hidden
          style={{ position: 'relative', fontSize: 14 }}
        >
          &rarr;
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <CurtainLink ref={ref} href={href} data-btn="ghost" style={shell} onClick={onClick}>
        {body}
      </CurtainLink>
    );
  }

  return (
    <button ref={ref} type={type} data-btn="ghost" style={shell} onClick={onClick}>
      {body}
    </button>
  );
}
