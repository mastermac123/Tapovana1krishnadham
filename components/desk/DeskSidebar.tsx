'use client';

import { usePathname } from 'next/navigation';
import CurtainLink from '@/components/ui/CurtainLink';
import LinkRule from '@/components/ui/LinkRule';
import { DOC_SLUGS, SLUG_LABEL } from '@/lib/doc-types';
import { signOutAction } from '@/app/desk/actions';

/**
 * The desk's own navigation — prototype `deskNav`, plus the committee list the
 * secretary maintains. The active row carries an em-dash marker and
 * full-strength ivory; the rest sit at 55%.
 */
const SECTIONS: { href: string; label: string }[] = [
  ...DOC_SLUGS.map((slug) => ({
    href: `/desk/${slug}`,
    label: SLUG_LABEL[slug],
  })),
  { href: '/desk/committee', label: 'Committee members' },
  { href: '/desk/account', label: 'Account' },
];

export default function DeskSidebar() {
  const pathname = usePathname();

  return (
    <div className="desk__side" data-dark>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: '0.26em',
            textTransform: 'uppercase',
            color: '#B08D57',
          }}
        >
          Signed in
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 26 }}>
          Secretary
        </span>
      </div>

      <nav aria-label="Secretary desk" style={{ display: 'flex', flexDirection: 'column' }}>
        {SECTIONS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <CurtainLink
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 0',
                borderTop: '1px solid rgba(248, 246, 241, 0.16)',
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: active ? '#F8F6F1' : 'rgba(248, 246, 241, 0.55)',
              }}
            >
              <span>{label}</span>
              <span style={{ fontSize: 13 }} aria-hidden>
                {active ? '—' : ''}
              </span>
            </CurtainLink>
          );
        })}
      </nav>

      <form action={signOutAction} style={{ marginTop: 'auto' }}>
        <LinkRule
          type="submit"
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'rgba(248, 246, 241, 0.6)',
          }}
        >
          Sign out
        </LinkRule>
      </form>
    </div>
  );
}
