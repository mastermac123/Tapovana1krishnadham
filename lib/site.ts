/** Site chrome copy and routing. Labels are lifted from the prototype. */

export type NoticeType = 'all' | 'circular' | 'quotation' | 'minutes';

export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Committee', href: '/committee' },
  { label: 'Notice board', href: '/notices', menu: true },
  { label: 'Contact', href: '/contact' },
] as const;

export const FOOTER_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Notice board', href: '/notices' },
  { label: 'Contact', href: '/contact' },
  { label: 'Secretary', href: '/login' },
] as const;

/** The four cards in the notice-board dropdown. */
export const NOTICE_MENU: {
  type: NoticeType;
  label: string;
  note: string;
}[] = [
  {
    type: 'all',
    label: 'All papers',
    note: 'Everything on record, newest first.',
  },
  {
    type: 'circular',
    label: 'Circulars',
    note: 'Day-to-day notices from the committee.',
  },
  {
    type: 'quotation',
    label: 'Redevelopment quotations',
    note: 'Every tender received, published in full.',
  },
  {
    type: 'minutes',
    label: 'Meeting minutes',
    note: 'Signed records of every meeting held.',
  },
];

export type NoticeCounts = Record<NoticeType, number>;

export function noticeHref(type: NoticeType): string {
  return `/notices?type=${type}`;
}

/** Routes that drop the public chrome. */
export const NO_NAV_ROUTES = ['/login'];
export const NO_FOOTER_ROUTES = ['/login', '/desk'];

export function hidesNav(pathname: string): boolean {
  return NO_NAV_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export function hidesFooter(pathname: string): boolean {
  return NO_FOOTER_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}
