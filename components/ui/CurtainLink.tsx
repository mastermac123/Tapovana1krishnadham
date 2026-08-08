'use client';

import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurtain } from '@/components/chrome/Curtain';

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

/**
 * A real anchor that routes through the forest curtain. Modified clicks and
 * external hrefs fall through to the browser, so the link stays a link.
 */
const CurtainLink = forwardRef<HTMLAnchorElement, Props>(function CurtainLink(
  { href, onClick, onMouseEnter, onFocus, children, ...rest },
  ref
) {
  const { navigate } = useCurtain();
  const router = useRouter();
  const external = /^(https?:|mailto:|tel:)/.test(href);

  /**
   * Start fetching on hover, well before the click.
   *
   * Next's own viewport prefetching is disabled in development and does not
   * cover a link the reader has only just reached, so a first click otherwise
   * pays the full round trip to the database. Warming on intent means the page
   * is usually already there by the time the curtain has come down.
   */
  function warm() {
    if (!external) router.prefetch?.(href);
  }

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
    <Link
      ref={ref}
      href={href}
      onClick={handleClick}
      onMouseEnter={(e) => {
        onMouseEnter?.(e);
        warm();
      }}
      onFocus={(e) => {
        onFocus?.(e);
        warm();
      }}
      {...rest}
    >
      {children}
    </Link>
  );
});

export default CurtainLink;
