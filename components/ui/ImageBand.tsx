'use client';

import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import { useParallax } from '@/components/motion/useParallax';
import Reveal from '@/components/motion/Reveal';

/**
 * A photograph position: a clipping frame with a drifting layer inside it
 * (movement 3) and the prototype's centred caption on top.
 *
 * Geometry, ground, pattern, drift amount and caption all come from the call
 * site, because the prototype specifies a different set for each band.
 *
 * With `src`, the photograph rides inside the drifting layer so it takes the
 * same counter-drift the prototype gives the weave, and the placeholder
 * caption is dropped — the band is no longer a placeholder.
 */
export default function ImageBand({
  height,
  minHeight,
  ground,
  pattern,
  amount,
  inset,
  src,
  alt = '',
  priority = false,
  caption,
  captionColor,
  captionSize = 11,
  captionTracking = '0.3em',
  rule = false,
  dark = false,
  reveal = false,
  style,
  children,
}: {
  height?: number | string;
  minHeight?: number | string;
  ground: string;
  pattern: string;
  /** Prototype `data-parallax` value. */
  amount: number;
  /** Prototype layer inset, e.g. '-16% 0'. */
  inset: string;
  /** A real photograph, layered over the weave. Omit to keep the placeholder. */
  src?: string;
  alt?: string;
  priority?: boolean;
  caption?: string;
  captionColor?: string;
  captionSize?: number;
  captionTracking?: string;
  /** The 1px x 40px champagne drop under a map caption. */
  rule?: boolean;
  /** Forest-ground bands opt in so the custom cursor inverts over them. */
  dark?: boolean;
  /**
   * The map bands carry `data-reveal` on the frame itself in the prototype, so
   * the drifting layer and the caption curtain in as two staggered children.
   */
  reveal?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const layer = useParallax<HTMLDivElement>(amount);

  const Frame = reveal ? Reveal : 'div';

  return (
    <Frame
      {...(dark ? { 'data-dark': '' } : {})}
      style={{
        position: 'relative',
        height,
        minHeight,
        overflow: 'hidden',
        background: ground,
        ...style,
      }}
    >
      <div
        ref={layer}
        aria-hidden={!src}
        style={{
          position: 'absolute',
          inset,
          backgroundImage: pattern,
        }}
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes="100vw"
            style={{ objectFit: 'cover' }}
          />
        ) : null}
      </div>

      {caption && !src ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span
            style={{
              fontSize: captionSize,
              fontWeight: 500,
              letterSpacing: captionTracking,
              textTransform: 'uppercase',
              color: captionColor ?? 'rgba(36, 36, 36, 0.4)',
              textAlign: 'center',
            }}
          >
            {caption}
          </span>
          {rule ? (
            <span style={{ width: 1, height: 40, background: '#B08D57' }} />
          ) : null}
        </div>
      ) : null}

      {children}
    </Frame>
  );
}
