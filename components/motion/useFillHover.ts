'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { DUR, EASE } from '@/lib/motion';

/**
 * Movement 4 — fill slide. Ported from the prototype's interactions().
 *
 * The button's ground sits at yPercent 101 and slides to 0 on hover; the arrow
 * travels x 0 -> 8; any [data-swap] label cross-fades to the colour that reads
 * against the incoming ground. Every tween is a quickTo, so a fast in-out is
 * interrupted rather than queued.
 */
export function useFillHover<T extends HTMLElement>({
  swapFrom,
  swapTo,
}: { swapFrom?: string; swapTo?: string } = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fill = el.querySelector<HTMLElement>('[data-fill]');
    const arrow = el.querySelector<HTMLElement>('[data-arrow]');
    const swaps = Array.from(el.querySelectorAll<HTMLElement>('[data-swap]'));

    if (fill) gsap.set(fill, { yPercent: 101 });

    const fy = fill
      ? gsap.quickTo(fill, 'yPercent', { duration: DUR.fill, ease: EASE.hover })
      : null;
    const ax = arrow
      ? gsap.quickTo(arrow, 'x', { duration: DUR.arrow, ease: EASE.hover })
      : null;

    const on = () => {
      fy?.(0);
      ax?.(8);
      if (swaps.length && swapTo) {
        gsap.to(swaps, { color: swapTo, duration: 0.35, ease: 'none' });
      }
    };

    const off = () => {
      fy?.(101);
      ax?.(0);
      if (swaps.length && swapFrom) {
        gsap.to(swaps, { color: swapFrom, duration: 0.35, ease: 'none' });
      }
    };

    el.addEventListener('mouseenter', on);
    el.addEventListener('mouseleave', off);
    el.addEventListener('focus', on);
    el.addEventListener('blur', off);

    return () => {
      el.removeEventListener('mouseenter', on);
      el.removeEventListener('mouseleave', off);
      el.removeEventListener('focus', on);
      el.removeEventListener('blur', off);
    };
  }, [swapFrom, swapTo]);

  return ref;
}

export default useFillHover;
