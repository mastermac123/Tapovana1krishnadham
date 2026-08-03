'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { prefersReducedMotion } from '@/lib/motion';
import { introDone } from '@/lib/intro';
import { gateReveals, releaseReveals } from '@/components/motion/Reveal';

/**
 * The opening — HANDOFF.md section 4.
 *
 * Mark fades in from scale 1.08 over 3.4s, the wordmark lines rise staggered
 * 0.16s, a 240px champagne line draws scaleX 0->1 over 2.3s, everything fades,
 * and the overlay lifts on clip-path inset(0 0 100% 0) expo.inOut.
 *
 * Unmount is driven by an **independent 5.3s timer**, not by the timeline's
 * completion callback — a timeline that never completes must not be able to
 * strand the page behind the overlay.
 */

const TOTAL_MS = 5300;
const GATE_MS = 5200;

export default function Loader() {
  const [mounted, setMounted] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Runs before paint: hold every scroll reveal behind the overlay, and tear
  // the overlay down under reduced motion before it can show a black frame.
  useLayoutEffect(() => {
    if (prefersReducedMotion()) {
      setMounted(false);
      releaseReveals();
      introDone();
      return;
    }
    gateReveals(GATE_MS);
  }, []);

  useEffect(() => {
    // Reduced motion skips the loader entirely and lands the page composed.
    if (prefersReducedMotion()) return;

    const overlay = rootRef.current;
    const mark = markRef.current;
    const typeWrap = typeRef.current;
    const track = trackRef.current;
    const bar = barRef.current;

    if (!overlay || !mark || !typeWrap || !track || !bar) {
      setMounted(false);
      releaseReveals();
      introDone();
      return;
    }

    const lines = Array.from(typeWrap.children);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      setMounted(false);
      releaseReveals();
      introDone();
    };

    // The independent timer — the authority on unmount.
    const timer = setTimeout(finish, TOTAL_MS);

    const ctx = gsap.context(() => {
      gsap.set(mark, { opacity: 0 });
      gsap.set(bar, { scaleX: 0 });
      gsap.set(lines, { opacity: 0, y: 14 });
      gsap.set(track, { opacity: 0 });

      gsap
        .timeline()
        .fromTo(mark, { scale: 1.08 }, { scale: 1, duration: 3.4, ease: 'expo.out' }, 0)
        .to(mark, { opacity: 0.95, duration: 2.0, ease: 'power2.inOut' }, 0)
        .to(lines, { opacity: 1, y: 0, duration: 1.5, stagger: 0.16, ease: 'power2.out' }, 0.85)
        .to(track, { opacity: 1, duration: 0.7, ease: 'none' }, 1.4)
        .to(bar, { scaleX: 1, duration: 2.3, ease: 'power1.inOut' }, 1.5)
        .to([mark, typeWrap, track], { opacity: 0, duration: 0.9, ease: 'power2.inOut' }, 4.1)
        .to(
          overlay,
          { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.3, ease: 'expo.inOut' },
          4.5
        )
        .add(finish, 5.0);
    }, overlay);

    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      ref={rootRef}
      data-loader
      data-dark
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9500,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        background: '#0C0F0E',
      }}
    >
      {/* Start states live in the markup, not in a mount effect. The overlay
          is server-rendered, so anything set in JS lands a frame late and the
          wordmark flashes composed before the timeline pulls it back. */}
      <div
        ref={markRef}
        style={{ width: 150, lineHeight: 0, opacity: 0, transform: 'scale(1.08)' }}
      >
        <Image
          src="/krishnadham-mark.jpg"
          alt=""
          width={150}
          height={150}
          priority
          style={{
            width: '100%',
            height: 'auto',
            filter: 'invert(1) brightness(1.15) contrast(1.7)',
            mixBlendMode: 'screen',
          }}
        />
      </div>

      <div
        ref={typeRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <span
          style={{
            opacity: 0,
            transform: 'translateY(14px)',
            fontFamily: 'var(--font-display)',
            fontWeight: 300,
            fontSize: 30,
            letterSpacing: '0.36em',
            textTransform: 'uppercase',
            color: '#F8F6F1',
          }}
        >
          Tapovan A&#8209;1
        </span>
        <span
          style={{
            opacity: 0,
            transform: 'translateY(14px)',
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.46em',
            textTransform: 'uppercase',
            color: '#B08D57',
          }}
        >
          Krishnadham
        </span>
      </div>

      <div
        ref={trackRef}
        style={{
          width: 240,
          height: 1,
          marginTop: 10,
          opacity: 0,
          background: 'rgba(248, 246, 241, 0.14)',
          overflow: 'hidden',
        }}
      >
        <div
          ref={barRef}
          style={{
            height: '100%',
            background: '#B08D57',
            transform: 'scaleX(0)',
            transformOrigin: 'left center',
          }}
        />
      </div>
    </div>
  );
}
