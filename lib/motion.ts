/**
 * Eases and durations — HANDOFF.md section 4.
 * Every value is lifted from design-reference/Krishnadham.dc.html.
 */

export const EASE = {
  reveal: 'expo.out', // 1.2-1.4s  content entrances
  transition: 'expo.inOut', // 0.6-1.3s  curtain, loader lift, menu clip
  hover: 'power3.out', // 0.45-0.7s interruptible
  scrub: 'none', // scroll-linked
} as const;

export const DUR = {
  /** Curtain reveal: clip-path inset(0 0 100% 0) + y:20 -> inset(0 0 -14% 0), y:0 */
  reveal: 1.25,
  revealStagger: 0.07,

  /** Word rise: yPercent 118 -> 0 */
  word: 1.3,
  wordStagger: 0.055,
  /** The hero heading runs slightly longer with a tighter stagger. */
  heroWord: 1.4,
  heroWordStagger: 0.05,

  /** Fill slide: button ground yPercent 101 -> 0; arrow x 0 -> 8 */
  fill: 0.62,
  arrow: 0.6,

  /** Rule draw: scaleX 0 -> 1, origin left */
  rule: 0.6,

  /** Settle: card y -6 + soft shadow */
  settle: 0.7,

  /** Page curtain */
  curtainDown: 0.62,
  curtainUp: 0.72,

  /** Notice-board dropdown clip */
  menuClip: 0.7,

  /** Nav frost cross-fade */
  navFrost: 0.6,
  navInk: 0.5,
} as const;

/** Cursor — 5px dot follows at 0.1s, 38px ring trails at 0.55s. */
export const CURSOR = {
  dot: 0.1,
  ring: 0.55,
  hotScale: 1.9,
} as const;

/** Nav frosts past this scroll depth on the home route. */
export const NAV_SOLID_AT = 80;

/** Card settle shadow, from the prototype's interactions(). */
export const CARD_SHADOW = '0 26px 60px -34px rgba(23,52,44,0.34)';
export const CARD_SHADOW_OFF = '0 0px 0px 0px rgba(23,52,44,0)';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Desktop-only chrome (custom cursor) is disabled under (hover: none). */
export function isPointerFine(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}
