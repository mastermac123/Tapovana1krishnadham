'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { prefersReducedMotion } from '@/lib/motion';
import { emitScroll } from '@/lib/scroll';

/**
 * Design System 04 — "scroll eased to 1.05 s of inertia", lerp 0.12.
 * Disabled entirely under prefers-reduced-motion.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({ lerp: 0.12 });
    lenis.on('scroll', emitScroll);
    let raf = 0;

    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
