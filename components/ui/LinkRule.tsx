'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { DUR, EASE } from '@/lib/motion';
import CurtainLink from '@/components/ui/CurtainLink';

/**
 * Movement 5 — rule draw. Underline scaleX 0 -> 1, origin left, 0.6s power3.out.
 * The label sits above a 1px hairline in currentColor.
 *
 * With `href` it routes through the curtain. Without one it renders a button —
 * used by the document actions, which have no endpoint until phase 2 but must
 * still be reachable from the keyboard.
 */
export default function LinkRule({
  href,
  children,
  style,
  className,
  onClick,
  plain = false,
  native = false,
  type = 'button',
}: {
  href?: string;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
  /**
   * In-page navigation that must not play the curtain or jump to the top —
   * the notice board's filters, which the prototype handles with setState.
   */
  plain?: boolean;
  /**
   * A bare anchor with no client-side routing. Needed for the document
   * endpoints, which answer with a redirect to R2 — the router would try to
   * render that as a page.
   */
  native?: boolean;
  /** Set to 'submit' when the rule sits inside a form — e.g. sign out. */
  type?: 'button' | 'submit';
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    const rule = el?.querySelector<HTMLElement>('[data-rule]');
    if (!el || !rule) return;

    const sx = gsap.quickTo(rule, 'scaleX', {
      duration: DUR.rule,
      ease: EASE.hover,
    });
    const on = () => sx(1);
    const off = () => sx(0);

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
  }, []);

  const shell: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    ...style,
  };

  const body = (
    <>
      {children}
      <span
        data-rule
        aria-hidden
        style={{
          height: 1,
          background: 'currentColor',
          transform: 'scaleX(0)',
          transformOrigin: 'left center',
        }}
      />
    </>
  );

  if (href && native) {
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        onClick={onClick}
        className={className}
        data-btn="link"
        style={shell}
      >
        {body}
      </a>
    );
  }

  if (href && plain) {
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        scroll={false}
        onClick={onClick}
        className={className}
        data-btn="link"
        style={shell}
      >
        {body}
      </Link>
    );
  }

  if (href) {
    return (
      <CurtainLink
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        onClick={onClick}
        className={className}
        data-btn="link"
        style={shell}
      >
        {body}
      </CurtainLink>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      onClick={onClick}
      className={className}
      data-btn="link"
      style={{
        ...shell,
        background: 'none',
        border: 0,
        padding: 0,
        font: 'inherit',
        letterSpacing: 'inherit',
        textTransform: 'inherit',
        color: 'inherit',
        cursor: 'inherit',
        textAlign: 'left',
      }}
    >
      {body}
    </button>
  );
}
