import type { DocType } from '@/lib/generated/prisma/enums';

/**
 * What the secretary is allowed to publish, and how a file becomes an R2 key.
 *
 * File type is decided by the *magic bytes*, never the extension or the
 * browser-supplied Content-Type — both are attacker-controlled. A renamed
 * .exe must not become a "PDF" on the notice board.
 */

/** 200 MB. See CLAUDE.md; HANDOFF.md §6 originally said 25 MB. */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

export type AllowedMime =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/msword'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp';

export const ALLOWED_MIME: readonly AllowedMime[] = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
  'image/webp',
];

/** Extension used when naming the stored object, keyed by verified type. */
const EXTENSION: Record<AllowedMime, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Only PDFs and images can be shown in the browser; the rest download. */
export function canPreviewInline(mime: string): boolean {
  return (
    mime === 'application/pdf' ||
    mime === 'image/jpeg' ||
    mime === 'image/png' ||
    mime === 'image/webp'
  );
}

type Signature = {
  mime: AllowedMime;
  offset: number;
  bytes: number[];
  /** Extra check for container formats that share a leading signature. */
  verify?: (buf: Uint8Array) => boolean;
};

const ZIP_LOCAL_HEADER = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04"

/**
 * DOCX is a ZIP. So are .jar, .xlsx and a great many other things, so a bare
 * PK header is not enough — the archive must actually name the WordprocessingML
 * document part. Cheap to check: the string appears in the central directory.
 */
function looksLikeDocx(buf: Uint8Array): boolean {
  const haystack = new TextDecoder('latin1').decode(buf);
  return (
    haystack.includes('word/document.xml') ||
    haystack.includes('word/_rels/document.xml.rels')
  );
}

const SIGNATURES: Signature[] = [
  { mime: 'application/pdf', offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: 'image/jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  {
    mime: 'image/png',
    offset: 0,
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  // WEBP is RIFF....WEBP — the tag sits at offset 8, after the size field.
  {
    mime: 'image/webp',
    offset: 0,
    bytes: [0x52, 0x49, 0x46, 0x46],
    verify: (buf) =>
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50,
  },
  {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    offset: 0,
    bytes: ZIP_LOCAL_HEADER,
    verify: looksLikeDocx,
  },
  // Legacy .doc — OLE2 compound file.
  {
    mime: 'application/msword',
    offset: 0,
    bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  },
];

function matches(buf: Uint8Array, sig: Signature): boolean {
  if (buf.length < sig.offset + sig.bytes.length) return false;
  for (let i = 0; i < sig.bytes.length; i += 1) {
    if (buf[sig.offset + i] !== sig.bytes[i]) return false;
  }
  return sig.verify ? sig.verify(buf) : true;
}

/**
 * The real type of a file, from its contents. Returns null when nothing
 * matches — which is a rejection, not a fallback to the claimed type.
 */
export function sniffMime(buf: Uint8Array): AllowedMime | null {
  for (const sig of SIGNATURES) {
    if (matches(buf, sig)) return sig.mime;
  }
  return null;
}

/** Strips anything that could escape the intended prefix or confuse a header. */
function slugify(name: string): string {
  const base = name.replace(/\.[^.]+$/, '');
  const slug = base
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .slice(0, 60);
  return slug || 'document';
}

const FOLDER: Record<DocType, string> = {
  CIRCULAR: 'circulars',
  QUOTATION: 'quotations',
  MINUTES: 'minutes',
};

/**
 * Object key: `circulars/2026/08/agm-notice-<random>.pdf`.
 *
 * Foldered by type and month so the bucket stays legible in the dashboard, and
 * suffixed with a random token so two files of the same name never collide and
 * a key can never be guessed from the title alone.
 */
export function buildObjectKey(
  type: DocType,
  originalName: string,
  mime: AllowedMime,
  now: Date = new Date()
): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  return `${FOLDER[type]}/${year}/${month}/${slugify(originalName)}-${token}.${EXTENSION[mime]}`;
}
