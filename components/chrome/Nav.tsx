'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { DUR, EASE, NAV_SOLID_AT } from '@/lib/motion';
import { subscribeScroll } from '@/lib/scroll';
import { NAV_LINKS, hidesNav, type NoticeCounts } from '@/lib/site';
import CurtainLink from '@/components/ui/CurtainLink';
import { useCurtain } from '@/components/chrome/Curtain';
import NoticeMenu from '@/components/chrome/NoticeMenu';
import MobileMenu from '@/components/chrome/MobileMenu';

const MENU_ID = 'notice-board-menu';
const MOBILE_ID = 'mobile-menu';
/** Kept in step with the nav-collapse media query in globals.css. */
const MOBILE_MAX = 899;
/**
 * Hover-intent grace period. Long enough that clipping the corner of the
 * trigger on the way somewhere else does not flash the panel open, short
 * enough that a deliberate exit feels immediate. The panel also carries a
 * transparent bridge over the gap beneath the trigger, so travelling from one
 * to the other never crosses dead space.
 */
const CLOSE_DELAY = 140;

/**
 * Transparent over the hero; frosts (rgba(248,246,241,0.82) + blur(18px), ink to
 * charcoal) past 80px scroll, on any non-home route, or while either panel is
 * open. Ported from the prototype's data-nav block + applyNav().
 *
 * Below 768px the link row and login button give way to a Menu toggle that
 * opens the stacked panel — the prototype has no mobile chrome to copy, so the
 * panel is assembled from its own existing pieces.
 */
export default function Nav({ counts }: { counts: NoticeCounts }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const frostRef = useRef<HTMLDivElement>(null);
  const solidRef = useRef<boolean | null>(null);
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { navigate } = useCurtain();

  const isHome = pathname === '/';
  const hidden = hidesNav(pathname);
  const anyOpen = menu || mobile;

  const applyNav = useCallback((solid: boolean, instant: boolean) => {
    const nav = navRef.current;
    const frost = frostRef.current;
    if (!nav || !frost) return;
    if (solid === solidRef.current) return;
    solidRef.current = solid;

    gsap.to(frost, {
      opacity: solid ? 1 : 0,
      duration: instant ? 0 : DUR.navFrost,
      ease: 'power2.out',
    });
    gsap.to(nav.querySelectorAll('[data-nav-ink]'), {
      color: solid ? '#17342C' : '#F8F6F1',
      duration: instant ? 0 : DUR.navInk,
      ease: 'none',
    });
    const sub = nav.querySelector('[data-nav-sub]');
    if (sub) {
      gsap.to(sub, {
        color: solid ? '#5C5A55' : 'rgba(248,246,241,0.62)',
        duration: instant ? 0 : DUR.navInk,
        ease: 'none',
      });
    }
    const login = nav.querySelector('.nav__login');
    if (login) {
      gsap.to(login, {
        borderColor: solid ? '#C9C2B2' : 'rgba(248,246,241,0.5)',
        duration: instant ? 0 : DUR.navInk,
        ease: 'none',
      });
    }
  }, []);

  /* Frost state: route, open panels and scroll depth all feed the same switch.
     The first evaluation is instant so a non-home route paints solid rather
     than fading in. applyNav() early-returns when nothing changed. */
  useEffect(() => {
    if (hidden) return;
    const evaluate = (instant: boolean) =>
      applyNav(!isHome || anyOpen || window.scrollY > NAV_SOLID_AT, instant);

    evaluate(solidRef.current === null);
    return subscribeScroll(() => evaluate(false));
  }, [applyNav, hidden, isHome, anyOpen]);

  /* Close on outside pointerdown, Escape, or navigation. */
  useEffect(() => {
    if (!anyOpen) return;
    const away = (e: PointerEvent) => {
      const nav = navRef.current;
      if (nav && nav.contains(e.target as Node)) return;
      setMenu(false);
      setMobile(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenu(false);
      setMobile(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [anyOpen]);

  useEffect(() => {
    setMenu(false);
    setMobile(false);
  }, [pathname]);

  /* Hover opens the dropdown only where hovering is a real gesture. Under
     (hover: none) a mouseenter is synthesised by the tap, which would open and
     immediately re-close the panel. */
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setHoverCapable(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimer.current);
    closeTimer.current = undefined;
  }, []);

  const openMenu = useCallback(() => {
    cancelClose();
    setMenu(true);
  }, [cancelClose]);

  const closeMenuSoon = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setMenu(false), CLOSE_DELAY);
  }, [cancelClose]);

  /* The stacked panel owns the viewport while it is open. */
  useEffect(() => {
    document.body.classList.toggle('is-locked', mobile);
    return () => document.body.classList.remove('is-locked');
  }, [mobile]);

  /* Crossing the breakpoint must not strand an open panel. */
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const sync = () => {
      if (mq.matches) setMenu(false);
      else setMobile(false);
    };
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  /* Movement 4 — fill slide on the login button. */
  useEffect(() => {
    if (hidden) return;
    const btn = navRef.current?.querySelector<HTMLElement>('.nav__login');
    const fill = btn?.querySelector<HTMLElement>('[data-fill]');
    if (!btn || !fill) return;
    gsap.set(fill, { yPercent: 101 });
    const fy = gsap.quickTo(fill, 'yPercent', {
      duration: DUR.fill,
      ease: EASE.hover,
    });
    const on = () => fy(0);
    const off = () => fy(101);
    btn.addEventListener('mouseenter', on);
    btn.addEventListener('mouseleave', off);
    btn.addEventListener('focus', on);
    btn.addEventListener('blur', off);
    return () => {
      btn.removeEventListener('mouseenter', on);
      btn.removeEventListener('mouseleave', off);
      btn.removeEventListener('focus', on);
      btn.removeEventListener('blur', off);
    };
  }, [hidden]);

  /* Movement 5 — rule draw under each nav link. */
  useEffect(() => {
    if (hidden) return;
    const links = navRef.current?.querySelectorAll<HTMLElement>('.nav__links .nav__link');
    if (!links) return;
    const cleanups: (() => void)[] = [];
    links.forEach((link) => {
      const rule = link.querySelector<HTMLElement>('[data-rule]');
      if (!rule) return;
      const sx = gsap.quickTo(rule, 'scaleX', {
        duration: DUR.rule,
        ease: EASE.hover,
      });
      const on = () => sx(1);
      const off = () => sx(0);
      link.addEventListener('mouseenter', on);
      link.addEventListener('mouseleave', off);
      link.addEventListener('focus', on);
      link.addEventListener('blur', off);
      cleanups.push(() => {
        link.removeEventListener('mouseenter', on);
        link.removeEventListener('mouseleave', off);
        link.removeEventListener('focus', on);
        link.removeEventListener('blur', off);
      });
    });
    return () => cleanups.forEach((f) => f());
  }, [hidden]);

  if (hidden) return null;

  const linkInner = (label: string) => (
    <>
      <span data-nav-ink>{label}</span>
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

  return (
    <header ref={navRef} data-nav className="nav">
      <div ref={frostRef} aria-hidden className="nav__frost" />

      <CurtainLink href="/" className="nav__brand">
        <span data-nav-ink className="nav__brand-name">
          Tapovan A&#8209;1
        </span>
        <span data-nav-sub className="nav__brand-sub">
          Krishnadham Co&#8209;op. Housing Society Ltd.
        </span>
      </CurtainLink>

      <nav aria-label="Primary" className="nav__links">
        {NAV_LINKS.map((item) =>
          'menu' in item && item.menu ? (
            <div
              key={item.label}
              className="nav__has-menu"
              onMouseEnter={hoverCapable ? openMenu : undefined}
              onMouseLeave={hoverCapable ? closeMenuSoon : undefined}
              /* focusin/focusout bubble, so tabbing to the trigger opens the
                 panel and leaving the whole group closes it. */
              onFocus={openMenu}
              onBlur={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                cancelClose();
                setMenu(false);
              }}
            >
              <button
                type="button"
                className="nav__link"
                aria-expanded={menu}
                aria-controls={MENU_ID}
                aria-haspopup="menu"
                onClick={() => {
                  /* Where hover already opens the panel, the trigger itself is
                     the shortcut to the full board. Where it does not, the tap
                     is the only way in, so it toggles. */
                  if (hoverCapable) {
                    cancelClose();
                    setMenu(false);
                    navigate(item.href);
                  } else {
                    setMenu((v) => !v);
                  }
                }}
              >
                {linkInner(item.label)}
              </button>

              <NoticeMenu
                id={MENU_ID}
                open={menu}
                counts={counts}
                onSelect={() => {
                  cancelClose();
                  setMenu(false);
                }}
              />
            </div>
          ) : (
            <CurtainLink
              key={item.label}
              href={item.href}
              className="nav__link"
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {linkInner(item.label)}
            </CurtainLink>
          )
        )}
      </nav>

      <MobileMenu
        id={MOBILE_ID}
        open={mobile}
        counts={counts}
        onSelect={() => setMobile(false)}
      />

      <CurtainLink href="/login" className="nav__login">
        <span
          data-fill
          aria-hidden
          style={{ position: 'absolute', inset: 0, background: '#B08D57' }}
        />
        <span data-nav-ink className="nav__login-ink">
          Secretary login
        </span>
      </CurtainLink>

      <button
        type="button"
        className="nav__toggle"
        aria-expanded={mobile}
        aria-controls={MOBILE_ID}
        aria-label={mobile ? 'Close menu' : 'Open menu'}
        onClick={() => setMobile((v) => !v)}
      >
        <span data-nav-ink>{mobile ? 'Close' : 'Menu'}</span>
        <span data-nav-ink aria-hidden className="nav__toggle-bars">
          <span />
          <span />
        </span>
      </button>
    </header>
  );
}
