'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { prefersReducedMotion } from '@/lib/motion';
import { onIntro } from '@/lib/intro';
import { HERO_WEAVE } from '@/lib/patterns';
import WordRise from '@/components/motion/WordRise';
import ButtonSolid from '@/components/ui/ButtonSolid';

/**
 * The hero, and the entrance it plays once the loader lifts.
 * Ported from the prototype's hero() + heroLand().
 *
 *   image  scale 1.16 -> 1.04   3.2s power2.out   at 0
 *   words  yPercent 118 -> 0    1.4s  stagger 0.05  at 0.1
 *   copy   y 26 -> 0, fade in   1.2s  stagger 0.12  at 0.5
 *   nav    y -20 -> 0, fade in  1.1s                at 0.75
 *
 * A 3.6s fail-safe lands everything composed, so a timeline that never runs
 * cannot leave the hero blank — the prototype's _heroFail, kept verbatim.
 */

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function Hero({ photo }: { photo?: string }) {
  const rootRef = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const head = root.querySelector<HTMLElement>('[data-hero-head]');
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-hero-el]'));
    const img = root.querySelector<HTMLElement>('[data-hero-img]');
    const words = head?.querySelectorAll<HTMLElement>('[data-w]');
    // The nav lives in the root layout; the hero drives its entrance the same
    // way the prototype does, because the two are one composition on load.
    const nav = document.querySelector<HTMLElement>('[data-nav]');

    // Initial state is set before paint so nothing flashes composed first.
    if (words?.length) gsap.set(words, { yPercent: 118 });
    if (els.length) gsap.set(els, { y: 26, opacity: 0 });
    if (nav) gsap.set(nav, { y: -20, opacity: 0 });

    const land = () => {
      if (words?.length) gsap.set(words, { yPercent: 0 });
      if (els.length) gsap.set(els, { y: 0, opacity: 1 });
      if (nav) gsap.set(nav, { y: 0, opacity: 1 });
    };

    let failTimer: ReturnType<typeof setTimeout> | undefined;
    let tl: gsap.core.Timeline | undefined;

    const play = () => {
      failTimer = setTimeout(land, 3600);

      tl = gsap.timeline({ onComplete: land });

      if (img) {
        tl.fromTo(
          img,
          { scale: 1.16 },
          { scale: 1.04, duration: 3.2, ease: 'power2.out' },
          0
        );
      }
      if (words?.length) {
        tl.to(words, { yPercent: 0, duration: 1.4, stagger: 0.05 }, 0.1);
      }
      if (els.length) {
        tl.to(els, { y: 0, opacity: 1, duration: 1.2, stagger: 0.12 }, 0.5);
      }
      if (nav) {
        tl.to(nav, { y: 0, opacity: 1, duration: 1.1 }, 0.75);
      }
    };

    const off = onIntro(play);

    return () => {
      off();
      clearTimeout(failTimer);
      tl?.kill();
      if (nav) gsap.set(nav, { clearProps: 'transform,opacity' });
    };
  }, []);

  return (
    <section
      ref={rootRef}
      data-dark
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        minHeight: '100vh',
        padding: '0 clamp(24px, 4.4vw, 64px) clamp(56px, 6vw, 88px)',
        overflow: 'hidden',
      }}
    >
      <div
        data-hero-img
        aria-hidden={!photo}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: HERO_WEAVE,
          willChange: 'transform',
        }}
      >
        {photo ? (
          <Image
            src={photo}
            alt="The front elevation of Tapovan A-1 Krishnadham, seen from the courtyard"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover' }}
          />
        ) : null}
      </div>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(12, 15, 14, 0.62) 0%, rgba(12, 15, 14, 0.24) 42%, rgba(12, 15, 14, 0.78) 100%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          flex: '1 1 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 180,
          paddingTop: 120,
        }}
      >
        {photo ? null : (
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'rgba(248, 246, 241, 0.34)',
              textAlign: 'center',
            }}
          >
            Architectural photograph of the building
          </span>
        )}
      </div>

      <div className="hero__grid" style={{ position: 'relative', color: '#F8F6F1' }}>
        <div
          data-hero-copy
          style={{ display: 'flex', flexDirection: 'column', gap: 34 }}
        >
          <span
            data-hero-el
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.34em',
              textTransform: 'uppercase',
              color: '#B08D57',
            }}
          >
            Registered 2002 &middot; Seventy&#8209;two flats on a single wing
          </span>
          <h1
            data-hero-head
            style={{
              margin: 0,
              maxWidth: 860,
              fontFamily: 'var(--font-display)',
              fontWeight: 300,
              fontSize: 'var(--text-display-xl)',
              lineHeight: 0.96,
              letterSpacing: '-0.02em',
            }}
          >
            <WordRise text="A house that keeps its own records." />
          </h1>
        </div>

        <div
          data-hero-el
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 30,
            paddingBottom: 12,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 300,
              lineHeight: 1.85,
              color: 'rgba(248, 246, 241, 0.72)',
              textWrap: 'pretty',
            }}
          >
            Notices, minutes and redevelopment papers, published by the committee and
            kept in the open.
          </p>
          <ButtonSolid href="/notices" label="Notice board" />
        </div>
      </div>
    </section>
  );
}
