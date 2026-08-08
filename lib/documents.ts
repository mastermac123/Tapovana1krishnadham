import 'server-only';

import { unstable_cache } from 'next/cache';

import { db } from '@/lib/db';
import { DB_LABEL, DB_TAG, fromDbType, toDbType } from '@/lib/doc-types';
import type { DocType } from '@/lib/generated/prisma/enums';
import type { NoticeCounts, NoticeType } from '@/lib/site';

/**
 * Reads for the public site and the desk.
 *
 * Deleted documents are excluded everywhere here — `deletedAt` is a curtain,
 * not a filter anyone can lift from the outside.
 *
 * CACHING
 * The database is in Singapore and the readers are in Mumbai, so every query
 * costs roughly a quarter-second of pure distance. The public reads are cached
 * against the DOCUMENTS_TAG and invalidated the moment the secretary publishes,
 * edits or deletes — so a page change costs nothing, and a newly published
 * notice still appears at once.
 */

export const DOCUMENTS_TAG = 'documents';

export type { DocType };
export { DB_LABEL as TYPE_LABEL, DB_TAG as TAG, fromDbType, toDbType };

export const DOC_TYPES: DocType[] = ['CIRCULAR', 'QUOTATION', 'MINUTES'];

export type DocumentRow = {
  id: string;
  type: DocType;
  title: string;
  description: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  /** DD.MM.YYYY, as the prototype prints it. */
  date: string;
  /** HH:MM, 24 hour. */
  time: string;
  /** Row label — 'Circular' | 'Quotation' | 'Minutes'. */
  tag: string;
};

/**
 * The society is in Mumbai; a server in another timezone must not print
 * yesterday's date on this morning's notice.
 */
const ZONE = 'Asia/Kolkata';

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .format(value)
    .replace(/\//g, '.');
}

function formatTime(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value);
}

type Row = {
  id: string;
  type: DocType;
  title: string;
  description: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
};

function present(row: Row): DocumentRow {
  return {
    ...row,
    date: formatDate(row.uploadedAt),
    time: formatTime(row.uploadedAt),
    tag: DB_TAG[row.type],
  };
}

const SELECT = {
  id: true,
  type: true,
  title: true,
  description: true,
  fileName: true,
  fileSize: true,
  mimeType: true,
  uploadedAt: true,
} as const;

/** Documents for a notice-board filter. `all` keeps every type. */
export const documentsFor = unstable_cache(
  async (filter: NoticeType): Promise<DocumentRow[]> => {
    const rows = await db.document.findMany({
      where: {
        deletedAt: null,
        ...(filter === 'all' ? {} : { type: toDbType(filter) }),
      },
      orderBy: { uploadedAt: 'desc' },
      select: SELECT,
    });
    return rows.map(present);
  },
  ['documents-for'],
  { tags: [DOCUMENTS_TAG] }
);

export async function documentsOfType(type: DocType): Promise<DocumentRow[]> {
  const rows = await db.document.findMany({
    where: { deletedAt: null, type },
    orderBy: { uploadedAt: 'desc' },
    select: SELECT,
  });
  return rows.map(present);
}

/** The home page's three most recent papers, all types together. */
export const latestDocuments = unstable_cache(
  async (take = 3): Promise<DocumentRow[]> => {
    const rows = await db.document.findMany({
      where: { deletedAt: null },
      orderBy: { uploadedAt: 'desc' },
      take,
      select: SELECT,
    });
    return rows.map(present);
  },
  ['documents-latest'],
  { tags: [DOCUMENTS_TAG] }
);

/**
 * Counts for the nav dropdown and the notice-board filters.
 *
 * Runs in the root layout, so it is on the path of *every* page. Uncached it
 * added a round trip to Singapore to each one.
 */
export const documentCounts = unstable_cache(
  async (): Promise<NoticeCounts> => {
    const grouped = await db.document.groupBy({
      by: ['type'],
      where: { deletedAt: null },
      _count: { _all: true },
    });

    const counts: NoticeCounts = {
      all: 0,
      circular: 0,
      quotation: 0,
      minutes: 0,
    };

    for (const group of grouped) {
      const n = group._count._all;
      counts[fromDbType(group.type)] = n;
      counts.all += n;
    }

    return counts;
  },
  ['documents-counts'],
  { tags: [DOCUMENTS_TAG] }
);

/** Narrows an arbitrary `?type=` value to a filter the board understands. */
export function parseNoticeType(raw: string | string[] | undefined): NoticeType {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === 'circular' || v === 'quotation' || v === 'minutes') return v;
  return 'all';
}
