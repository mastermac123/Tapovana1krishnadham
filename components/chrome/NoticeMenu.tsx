'use client';

import { NOTICE_MENU, noticeHref, type NoticeCounts } from '@/lib/site';
import CurtainLink from '@/components/ui/CurtainLink';

/**
 * The notice-board dropdown.
 *
 * A compact panel anchored under the nav item, opening on hover on pointer
 * devices and on tap elsewhere. Motion is a 220ms fade + 6px rise driven by CSS
 * transitions rather than GSAP — the panel can be interrupted mid-flight by a
 * fast in-out, and a transition simply reverses where a timeline would have to
 * be killed and rebuilt.
 *
 * Open/close state, the hover intent delay and the outside-click and Escape
 * handling all live in Nav, which owns the trigger.
 *
 * Note: this replaces the prototype's full-width frosted panel at the client's
 * request. The mobile stacked panel still uses the prototype's own cards.
 */
export default function NoticeMenu({
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
  return (
    <div
      id={id}
      className={`nmenu${open ? ' is-open' : ''}`}
      inert={!open}
      role="menu"
    >
      {NOTICE_MENU.map((mi) => (
        <CurtainLink
          key={mi.type}
          href={noticeHref(mi.type)}
          className="nmenu__item"
          role="menuitem"
          tabIndex={open ? 0 : -1}
          onClick={onSelect}
        >
          <span className="nmenu__head">
            <span className="nmenu__label">{mi.label}</span>
            <span className="nmenu__count">{counts[mi.type]}</span>
          </span>
          <span className="nmenu__note">{mi.note}</span>
        </CurtainLink>
      ))}
    </div>
  );
}
