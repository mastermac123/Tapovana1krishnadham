'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { CARD_SHADOW, CARD_SHADOW_OFF, DUR, EASE } from '@/lib/motion';

/**
 * Movement 6 — settle. Card lifts y:-6 with a soft shadow over 0.7s power3.out.
 * Prototype `data-card`, committee page.
 */
export default function CommitteeCard({
  role,
  name,
  flat,
}: {
  role: string;
  name: string;
  flat: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const y = gsap.quickTo(el, 'y', { duration: DUR.settle, ease: EASE.hover });

    const on = () => {
      y(-6);
      gsap.to(el, { boxShadow: CARD_SHADOW, duration: DUR.settle, ease: EASE.hover });
    };
    const off = () => {
      y(0);
      gsap.to(el, { boxShadow: CARD_SHADOW_OFF, duration: DUR.settle, ease: EASE.hover });
    };

    el.addEventListener('mouseenter', on);
    el.addEventListener('mouseleave', off);
    return () => {
      el.removeEventListener('mouseenter', on);
      el.removeEventListener('mouseleave', off);
    };
  }, []);

  return (
    <div
      ref={ref}
      data-card
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 26,
        padding: '40px 34px 34px',
        background: '#FFFFFF',
        border: '1px solid #E9E4D9',
      }}
    >
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 500,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: '#B08D57',
        }}
      >
        {role}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 32,
          lineHeight: 1.15,
        }}
      >
        {name}
      </span>
      <span
        style={{
          paddingTop: 22,
          borderTop: '1px solid #EFEAE0',
          fontSize: 13,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: '#5C5A55',
        }}
      >
        {flat}
      </span>
    </div>
  );
}
