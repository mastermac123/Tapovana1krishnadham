'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { EASE, prefersReducedMotion } from '@/lib/motion';

/**
 * Movement 3 — image drift. Ported from the prototype's wire() + tick().
 *
 * The layer runs `yPercent -amp -> +amp` and `scale 1.12 -> 1.02`, scrubbed
 * against its parent's travel through the viewport. `amp` is the prototype's
 * `data-parallax` value multiplied by 44; 0.12 is its default.
 *
 * One rAF loop drives every registered layer, so a page full of bands still
 * costs a single read/write pass per frame.
 */

const AMP_SCALE = 44;
const DEFAULT_AMP = 0.12;

type Layer = {
  /** The clipping container — its rect drives progress. */
  frame: HTMLElement;
  tl: gsap.core.Timeline;
};

const layers = new Set<Layer>();
let raf = 0;

function tick() {
  const vh = window.innerHeight || 900;
  for (const layer of layers) {
    const r = layer.frame.getBoundingClientRect();
    const progress = (vh - r.top) / (vh + r.height);
    layer.tl.progress(Math.max(0, Math.min(1, progress)));
  }
  raf = requestAnimationFrame(tick);
}

function start() {
  if (!raf) raf = requestAnimationFrame(tick);
}

function stop() {
  if (raf && layers.size === 0) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Attach the returned ref to the drifting layer. Its parent element is treated
 * as the frame, matching the prototype's `layer.parentElement`.
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(
  amount: number = DEFAULT_AMP
) {
  const ref = useRef<T>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    const frame = el?.parentElement;
    if (!el || !frame) return;

    // Reduced motion lands the band composed, mid-drift.
    if (prefersReducedMotion()) {
      gsap.set(el, { yPercent: 0, scale: 1.02 });
      return;
    }

    const amp = (amount || DEFAULT_AMP) * AMP_SCALE;
    gsap.set(el, { willChange: 'transform' });

    const tl = gsap.timeline({ paused: true }).fromTo(
      el,
      { yPercent: -amp, scale: 1.12 },
      { yPercent: amp, scale: 1.02, ease: EASE.scrub, duration: 1 }
    );

    const layer: Layer = { frame, tl };
    layers.add(layer);
    start();

    return () => {
      layers.delete(layer);
      tl.kill();
      gsap.set(el, { clearProps: 'willChange' });
      stop();
    };
  }, [amount]);

  return ref;
}

export default useParallax;
