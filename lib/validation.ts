import { z } from 'zod';

import { ALLOWED_MIME, MAX_UPLOAD_BYTES } from '@/lib/uploads';
import { DOC_TYPES_DB } from '@/lib/doc-types';

/**
 * Every request body crossing into the desk is parsed here first — HANDOFF.md
 * section 6. Nothing downstream trusts a raw field.
 */

export const docTypeSchema = z.enum(DOC_TYPES_DB);

/** Step 1 of publishing: ask for somewhere to put the file. */
export const uploadUrlSchema = z.object({
  type: docTypeSchema,
  fileName: z.string().trim().min(1).max(255),
  /** The browser's claim. Verified against the bytes after upload, not trusted. */
  contentType: z.enum(ALLOWED_MIME),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

/** Step 2: the file is in R2; publish the row that points at it. */
export const publishSchema = z.object({
  type: docTypeSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(600).default(''),
  fileKey: z.string().min(1).max(400),
  fileName: z.string().trim().min(1).max(255),
});

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(600).optional(),
});

export const committeeSchema = z.object({
  members: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        designation: z.string().trim().min(1).max(80),
        flatNumber: z.string().trim().min(1).max(40),
      })
    )
    .max(30),
});

export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;
export type PublishInput = z.infer<typeof publishSchema>;
