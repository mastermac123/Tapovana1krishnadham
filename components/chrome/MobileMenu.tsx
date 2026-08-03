'use client';

import { NAV_LINKS, NOTICE_MENU, noticeHref, type NoticeCounts } from '@/lib/site';
import CurtainLink from '@/components/ui/CurtainLink';

/**
 * The < 768px panel. The prototype has no mobile chrome — it was authored at
 * 1440 — so this re-flows the prototype's own pieces rather than adding new
 * ones: the frosted menu surface, the Playfair 25px menu label, the gold
 * eyebrow, the notice cards and the solid button are all lifted as-is.
 */
export default function MobileMenu({
  open,
  counts,
  onSelect,
  id,
}: {
  open: boolean;
  counts: NoticeCounts;
  onSelect: () => void;
  id: string;
}) {
  const links = NAV_LINKS.filter((l) => !('menu' in l && l.menu));

  return (
    <div id={id} className={`panel${open ? ' is-open' : ''}`} inert={!open}>
      <div className="panel__surface">
        <div className="mobile__scroll">
          <nav aria-label="Primary" className="mobile__links">
            {links.map((item) => (
              <CurtainLink
                key={item.label}
                href={item.href}
                className="mobile__link"
                tabIndex={open ? 0 : -1}
                onClick={onSelect}
              >
                {item.label}
                <span aria-hidden style={{ fontSize: 13, color: '#B08D57' }}>
                  &rarr;
                </span>
              </CurtainLink>
            ))}
          </nav>

          <span className="mobile__eyebrow">Notice board</span>

          <div className="menu__grid">
            {NOTICE_MENU.map((mi) => (
              <CurtainLink
                key={mi.type}
                href={noticeHref(mi.type)}
                className="menu__item"
                tabIndex={open ? 0 : -1}
                onClick={onSelect}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <span className="menu__count">{counts[mi.type]}</span>
                  <span aria-hidden style={{ fontSize: 13, color: '#B08D57' }}>
                    &rarr;
                  </span>
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span className="menu__label">{mi.label}</span>
                  <span className="menu__note">{mi.note}</span>
                </span>
              </CurtainLink>
            ))}
          </div>

          <div className="mobile__foot">
            <CurtainLink
              href="/login"
              tabIndex={open ? 0 : -1}
              onClick={onSelect}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 44,
                padding: '21px 30px',
                background: '#17342C',
                color: '#F8F6F1',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  position: 'relative',
                  fontSize: 11.5,
                  fontWeight: 500,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                }}
              >
                Secretary login
              </span>
              <span aria-hidden style={{ position: 'relative', fontSize: 14 }}>
                &rarr;
              </span>
            </CurtainLink>
          </div>
        </div>
      </div>
    </div>
  );
}
