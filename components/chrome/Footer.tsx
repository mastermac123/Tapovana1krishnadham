'use client';

import { usePathname } from 'next/navigation';
import { FOOTER_LINKS, hidesFooter } from '@/lib/site';
import LinkRule from '@/components/ui/LinkRule';

/**
 * Ported from the prototype's showFooter block. Hidden on /login and /desk.
 * Stacks to one column below 1024px — the 60px link row cannot sit beside the
 * wordmark at tablet width. See the chrome block in globals.css.
 */
export default function Footer() {
  const pathname = usePathname();
  if (hidesFooter(pathname)) return null;

  return (
    <footer data-dark className="footer">
      <div className="footer__brand">
        <span className="footer__brand-name">Tapovan A&#8209;1 Krishnadham</span>
        <span className="footer__brand-sub">
          Co&#8209;operative Housing Society Ltd. &middot; Registered 2002
        </span>
      </div>

      <nav aria-label="Footer" className="footer__nav">
        {FOOTER_LINKS.map((link) => (
          <LinkRule key={link.label} href={link.href}>
            {link.label}
          </LinkRule>
        ))}
      </nav>
    </footer>
  );
}
