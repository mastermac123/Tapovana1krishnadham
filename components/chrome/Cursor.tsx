'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { CURSOR, EASE, isPointerFine, prefersReducedMotion } from '@/lib/motion';

/**
 * 5px dot follows at 0.1s, 38px ring trails at 0.55s; ring scales to 1.9 with a
 * gold border over interactive elements; both invert over forest panels.
 * Desktop only — disabled under (hover: none).
 * Ported from the prototype's cursor().
 */
export default function Cursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isPointerFine() && !prefersReducedMotion());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    const rx = gsap.quickTo(ring, 'x', { duration: CURSOR.ring, ease: EASE.hover });
    const ry = gsap.quickTo(ring, 'y', { duration: CURSOR.ring, ease: EASE.hover });
    const dx = gsap.quickTo(dot, 'x', { duration: CURSOR.dot, ease: 'power2.out' });
    const dy = gsap.quickTo(dot, 'y', { duration: CURSOR.dot, ease: 'power2.out' });

    let hot = false;
    let light = false;

    const move = (e: MouseEvent) => {
      rx(e.clientX);
      ry(e.clientY);
      dx(e.clientX);
      dy(e.clientY);

      const target = e.target as Element | null;
      if (!target || !target.closest) return;

      const over = !!target.closest(
        'a, button, [data-card], [data-row], label, input, textarea, select'
      );
      if (over !== hot) {
        hot = over;
        gsap.to(ring, {
          scale: over ? CURSOR.hotScale : 1,
          borderColor: over ? 'rgba(176,141,87,0.9)' : 'rgba(23,52,44,0.38)',
          duration: 0.5,
          ease: EASE.hover,
        });
      }

      // Forest panels opt in with data-dark so the cursor can invert without
      // sniffing inline styles the way the prototype did.
      const wantLight = !!target.closest('[data-dark]');
      if (wantLight !== light) {
        light = wantLight;
        gsap.to(dot, {
          backgroundColor: wantLight ? '#F8F6F1' : '#17342C',
          duration: 0.3,
          ease: 'none',
        });
        if (!hot) {
          gsap.to(ring, {
            borderColor: wantLight ? 'rgba(248,246,241,0.45)' : 'rgba(23,52,44,0.38)',
            duration: 0.3,
            ease: 'none',
          });
        }
      }
    };

    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 9998,
          width: 38,
          height: 38,
          margin: '-19px 0 0 -19px',
          border: '1px solid rgba(23, 52, 44, 0.38)',
          borderRadius: '50%',
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      />
      <div
        ref={dotRef}
        aria-hidden
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 9999,
          width: 5,
          height: 5,
          margin: '-2.5px 0 0 -2.5px',
          background: '#17342C',
          borderRadius: '50%',
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      />
    </>
  );
}
