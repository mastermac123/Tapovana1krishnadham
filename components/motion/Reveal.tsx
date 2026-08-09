'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react';
import gsap from 'gsap';
import { DUR, EASE, prefersReducedMotion } from '@/lib/motion';

/**
 * Movement 1 — curtain reveal, and the carrier for movement 2 — word rise.
 * Ported from the prototype's wire() + tick().
 *
 * A block's *direct children* are the animation targets, staggered 0.07s apart:
 *   - a child h1/h2 holding <WordRise> words rises them yPercent 118 -> 0
 *   - every other child enters clip-path inset(0 0 100% 0) + y:20
 *     -> inset(0 0 -14% 0), y:0
 *
 * One IntersectionObserver serves the whole page. Its rootMargin reproduces the
 * prototype's own trigger test — `rect.top < vh * 0.9 && rect.bottom > -60` —
 * and blocks entering together keep the prototype's 0.08s queue stagger.
 */

type Record_ = {
  tl: gsap.core.Timeline;
  /** Applies the finished state outright, for when the timeline cannot run. */
  land: () => void;
  registeredAt: number;
};

/**
 * How long a block may sit on screen still clipped before it is simply shown.
 *
 * GSAP advances on requestAnimationFrame. If those frames never come — a
 * background tab, a browser that has stopped compositing, an animation that
 * throws — a timeline that has been told to play still never arrives, and the
 * text stays invisible. `gsap.set` applies immediately and does not wait for a
 * frame, so this is the escape hatch that guarantees the words appear.
 */
const LAND_AFTER_MS = 4000;

const registry = new Map<Element, Record_>();
const queued: Element[] = [];
let observer: IntersectionObserver | null = null;
let gateUntil = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Hold every reveal until `ms` from now. The loader owns the gate so nothing
 * plays behind the overlay and then sits finished when it lifts.
 */
export function gateReveals(ms: number) {
  gateUntil = Math.max(gateUntil, Date.now() + ms);
}

export function releaseReveals() {
  gateUntil = 0;
  flush();
}

function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const wait = gateUntil - Date.now();
  if (wait > 0) {
    flushTimer = setTimeout(flush, wait);
    return;
  }

  let q = 0;
  // Top-down, so a stagger reads as the page composing downward.
  queued.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
  for (const el of queued) {
    const rec = registry.get(el);
    if (!rec) continue;
    rec.tl.delay(Math.min(q * 0.08, 0.4)).play(0);
    // Deliberately left in the registry: told to play is not the same as
    // finished, and the sweep is what rescues a timeline that never advances.
    // The timeline's own onComplete removes it.
    q += 1;
  }
  queued.length = 0;
}

/**
 * Backstop for a reveal that never fired.
 *
 * The whole point of the entrance is that content starts clipped, so anything
 * that stops the observer delivering — a throttled background tab, an
 * interrupted scroll, a frame the browser never composited — leaves that
 * content invisible for good. Text a reader cannot see is worse than text that
 * arrives without ceremony, so a slow sweep lands anything that is on screen
 * and still waiting.
 *
 * The hero has carried a fail-safe like this from the start; the reveals
 * should never have gone without one.
 */
const SWEEP_MS = 1200;
let sweep: ReturnType<typeof setInterval> | undefined;

function startSweep() {
  if (sweep || typeof window === 'undefined') return;
  sweep = setInterval(() => {
    if (registry.size === 0) {
      clearInterval(sweep);
      sweep = undefined;
      return;
    }
    const vh = window.innerHeight || 900;
    const now = Date.now();

    for (const [el, rec] of registry) {
      const r = el.getBoundingClientRect();
      const onScreen = r.top < vh * 0.9 && r.bottom > -60;

      // Waited long enough while visible: show it, animation or not.
      if (onScreen && now - rec.registeredAt > LAND_AFTER_MS) {
        rec.tl.kill();
        rec.land();
        registry.delete(el);
        observer?.unobserve(el);
        const i = queued.indexOf(el);
        if (i >= 0) queued.splice(i, 1);
        continue;
      }

      if (queued.includes(el)) continue;
      if (onScreen) {
        observer?.unobserve(el);
        queued.push(el);
      }
    }

    if (queued.length) flush();
  }, SWEEP_MS);
}

function ensureObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined') return null;
  if (observer) return observer;

  observer = new IntersectionObserver(
    (entries) => {
      let added = false;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (!registry.has(entry.target)) continue;
        observer?.unobserve(entry.target);
        queued.push(entry.target);
        added = true;
      }
      if (added) flush();
    },
    // rect.bottom > -60  ->  top margin +60px
    // rect.top < vh*0.9  ->  bottom margin -10%
    { rootMargin: '60px 0px -10% 0px', threshold: 0 }
  );

  return observer;
}

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function Reveal({
  as,
  children,
  style,
  className,
  ...rest
}: {
  as?: ElementType;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  const Tag = (as ?? 'div') as ElementType;

  useIsomorphicLayoutEffect(() => {
    const block = ref.current;
    if (!block) return;

    // Reduced motion lands the block composed — no initial state is ever set.
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        paused: true,
        onComplete: () => registry.delete(block),
      });
      let at = 0;

      const kids = Array.from(block.children) as HTMLElement[];
      const targets: HTMLElement[] = kids.length ? kids : [block];

      /** The finished state, applied outright. See LAND_AFTER_MS. */
      const land = () => {
        for (const kid of targets) {
          const words = kid.matches('h1, h2')
            ? kid.querySelectorAll<HTMLElement>('[data-w]')
            : null;
          if (words && words.length) {
            gsap.set(words, { yPercent: 0 });
          } else {
            gsap.set(kid, { clipPath: 'none', y: 0, willChange: 'auto' });
          }
        }
      };

      for (const kid of targets) {
        const words = kid.matches('h1, h2')
          ? kid.querySelectorAll<HTMLElement>('[data-w]')
          : null;

        if (words && words.length) {
          gsap.set(words, { yPercent: 118 });
          tl.to(
            words,
            {
              yPercent: 0,
              duration: DUR.word,
              stagger: DUR.wordStagger,
              ease: EASE.reveal,
            },
            at
          );
        } else {
          gsap.set(kid, {
            clipPath: 'inset(0% 0% 100% 0%)',
            y: 20,
            willChange: 'transform, clip-path',
          });
          tl.to(
            kid,
            {
              clipPath: 'inset(0% 0% -14% 0%)',
              y: 0,
              duration: DUR.reveal,
              ease: EASE.reveal,
              onComplete: () => gsap.set(kid, { willChange: 'auto' }),
            },
            at
          );
        }

        at += DUR.revealStagger;
      }

      registry.set(block, { tl, land, registeredAt: Date.now() });
      ensureObserver()?.observe(block);
      startSweep();
    }, block);

    return () => {
      observer?.unobserve(block);
      registry.delete(block);
      const i = queued.indexOf(block);
      if (i >= 0) queued.splice(i, 1);
      ctx.revert();
    };
  }, []);

  return (
    <Tag ref={ref} data-reveal style={style} className={className} {...rest}>
      {children}
    </Tag>
  );
}
