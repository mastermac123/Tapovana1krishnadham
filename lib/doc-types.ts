import type { DocType } from '@/lib/generated/prisma/enums';
import type { NoticeType } from '@/lib/site';

/**
 * The database speaks CIRCULAR/QUOTATION/MINUTES; the URLs and the UI speak
 * circular/quotation/minutes. One place owns the translation so neither side
 * has to know about the other's casing.
 */

export const DOC_TYPES_DB = ['CIRCULAR', 'QUOTATION', 'MINUTES'] as const;

/** The URL form, in display order. Safe to import from a client component. */
export const DOC_SLUGS = ['circular', 'quotation', 'minutes'] as const;

export type DocSlug = (typeof DOC_SLUGS)[number];

/** Sidebar and page heading label, keyed by slug. */
export const SLUG_LABEL: Record<DocSlug, string> = {
  circular: 'Circulars',
  quotation: 'Redevelopment quotations',
  minutes: 'Meeting minutes',
};

const TO_DB = {
  circular: 'CIRCULAR',
  quotation: 'QUOTATION',
  minutes: 'MINUTES',
} as const satisfies Record<Exclude<NoticeType, 'all'>, DocType>;

const FROM_DB = {
  CIRCULAR: 'circular',
  QUOTATION: 'quotation',
  MINUTES: 'minutes',
} as const satisfies Record<DocType, Exclude<NoticeType, 'all'>>;

export function toDbType(slug: Exclude<NoticeType, 'all'>): DocType {
  return TO_DB[slug];
}

export function fromDbType(type: DocType): Exclude<NoticeType, 'all'> {
  return FROM_DB[type];
}

/** Row label on the notice board. */
export const DB_TAG: Record<DocType, string> = {
  CIRCULAR: 'Circular',
  QUOTATION: 'Quotation',
  MINUTES: 'Minutes',
};

/** Sidebar and page heading label. */
export const DB_LABEL: Record<DocType, string> = {
  CIRCULAR: 'Circulars',
  QUOTATION: 'Redevelopment quotations',
  MINUTES: 'Meeting minutes',
};
