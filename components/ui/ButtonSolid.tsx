'use client';

import type { CSSProperties } from 'react';
import CurtainLink from '@/components/ui/CurtainLink';
import { useFillHover } from '@/components/motion/useFillHover';

/**
 * The filled button — prototype `data-btn="solid"`.
 *
 * Defaults are the home hero's values (ivory ground, forest ink, 21px/28px,
 * 44px gap). Call sites pass the variant the prototype specifies for them
 * rather than inventing one.
 */
export default function ButtonSolid({
  href,
  label,
  background = '#F8F6F1',
  color = '#17342C',
  fill = '#B08D57',
  padding = '21px 28px',
  gap = 44,
  arrow = true,
  type = 'button',
  disabled = false,
  onClick,
  style,
}: {
  href?: string;
  label: string;
  background?: string;
  color?: string;
  fill?: string;
  padding?: string;
  gap?: number;
  arrow?: boolean;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const ref = useFillHover<HTMLAnchorElement & HTMLButtonElement>();

  const shell: CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap,
    padding,
    background,
    color,
    overflow: 'hidden',
    ...style,
  };

  const body = (
    <>
      <span
        data-fill
        aria-hidden
        style={{ position: 'absolute', inset: 0, background: fill }}
      />
      <span
        data-btn-ink
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
      <CurtainLink ref={ref} href={href} data-btn="solid" style={shell} onClick={onClick}>
        {body}
      </CurtainLink>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      data-btn="solid"
      style={{ ...shell, ...(disabled ? { opacity: 0.55 } : null) }}
      onClick={onClick}
    >
      {body}
    </button>
  );
}
