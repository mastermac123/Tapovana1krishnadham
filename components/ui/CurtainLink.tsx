'use client';

import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import Link from 'next/link';
import { useCurtain } from '@/components/chrome/Curtain';

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

/**
 * A real anchor that routes through the forest curtain. Modified clicks and
 * external hrefs fall through to the browser, so the link stays a link.
 */
const CurtainLink = forwardRef<HTMLAnchorElement, Props>(function CurtainLink(
  { href, onClick, children, ...rest },
  ref
) {
  const { navigate } = useCurtain();
  const external = /^(https?:|mailto:|tel:)/.test(href);

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented || external) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(href);
  }

  if (external) {
    return (
      <a ref={ref} href={href} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link ref={ref} href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
});

export default CurtainLink;
