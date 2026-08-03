'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import gsap from 'gsap';
import { EASE } from '@/lib/motion';

/**
 * The hover shell shared by every document list — prototype `data-row`.
 * Ground fades to rgba(255,255,255,0.7) and the row indents 20px, both over
 * 0.6s power3.out. The three lists (home latest, notice board, secretary desk)
 * lay their own contents out; only this behaviour is common to them.
 */
export default function Row({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const on = () =>
      gsap.to(el, {
        backgroundColor: 'rgba(255,255,255,0.7)',
        paddingLeft: 20,
        duration: 0.6,
        ease: EASE.hover,
      });

    const off = () =>
      gsap.to(el, {
        backgroundColor: 'rgba(255,255,255,0)',
        paddingLeft: 0,
        duration: 0.6,
        ease: EASE.hover,
      });

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
      data-row
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        columnGap: 'clamp(20px, 2.8vw, 40px)',
        rowGap: 18,
        borderTop: '1px solid #E2DDD2',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
