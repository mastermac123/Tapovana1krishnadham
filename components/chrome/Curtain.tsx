'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { DUR, EASE, prefersReducedMotion } from '@/lib/motion';

/**
 * Page transition — HANDOFF.md section 4.
 * Forest curtain scaleY 0->1 (origin bottom, 0.62s) -> swap route ->
 * scaleY 1->0 (origin top, 0.72s). No white flash.
 */

type CurtainContextValue = {
  navigate: (href: string) => void;
};

const CurtainContext = createContext<CurtainContextValue>({
  navigate: () => {},
});

export function useCurtain() {
  return useContext(CurtainContext);
}

export function CurtainProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    router.prefetch?.('/');
  }, [router]);

  const navigate = useCallback(
    (href: string) => {
      if (busyRef.current) return;
      const panel = panelRef.current;

      if (!panel || prefersReducedMotion()) {
        router.push(href);
        window.scrollTo(0, 0);
        return;
      }

      busyRef.current = true;
      gsap
        .timeline({ onComplete: () => (busyRef.current = false) })
        .set(panel, { transformOrigin: 'bottom center' })
        .to(panel, {
          scaleY: 1,
          duration: DUR.curtainDown,
          ease: EASE.transition,
        })
        .add(() => {
          router.push(href);
          window.scrollTo(0, 0);
        })
        .set(panel, { transformOrigin: 'top center' })
        .to(
          panel,
          { scaleY: 0, duration: DUR.curtainUp, ease: EASE.transition },
          '+=0.08'
        );
    },
    [router]
  );

  return (
    <CurtainContext.Provider value={{ navigate }}>
      <div
        ref={panelRef}
        data-curtain
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9000,
          background: '#17342C',
          transform: 'scaleY(0)',
          transformOrigin: 'bottom center',
          pointerEvents: 'none',
        }}
      />
      {children}
    </CurtainContext.Provider>
  );
}
