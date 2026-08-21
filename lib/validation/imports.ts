/**
 * Runtime validation for the CSV/PDF import trust boundary (AGENTS.md §7, §12).
 *
 * Every uploaded file and every parsed statement row crosses a trust boundary
 * (the user's browser / a downloaded file). These schemas validate that input
 * *before* any domain logic, sanitisation, or persistence runs.
 *
 * §12 file upload security: reject anything that is not a small, named
 * CSV/PDF. §8.1: amounts are positive integer sen. Never floats.
 */
import { z } from 'zod';

/** Maximum accepted upload size: 5 MB (AGENTS.md §12, features/imports/AGENTS.md). */
export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

/** Maximum parsed CSV rows cap (AGENTS.md §12). */
export const MAX_CSV_ROWS = 500;

/**
 * A safe filename: non-empty, reasonably short, and free of path separators /
 * control characters. The uploaded file's *content* is still treated as
 * untrusted regardless of name.
 */
const safeFilename = z
  .string({ error: 'Filename is required' })
  .trim()
  .min(1, { error: 'Filename is required' })
  .max(255, { error: 'Filename is too long' })
  .refine((name) => !/[\\/\u0000-\u001f]/.test(name), {
    message: 'Filename contains invalid characters',
  });

/**
 * An uploaded CSV file descriptor (name, size in bytes, MIME type).
 * Accepts either `text/csv` + `.csv` or `application/pdf` + `.pdf`.
 */
export const uploadedFileSchema = z
  .object({
    name: safeFilename,
    /** Size in bytes. Must not exceed MAX_UPLOAD_SIZE_BYTES. */
    size: z
      .number({ error: 'File size must be a number of bytes' })
      .int({ error: 'File size must be an integer number of bytes' })
      .min(1, { error: 'File is empty' })
      .max(MAX_UPLOAD_SIZE_BYTES, {
        error: 'File exceeds the 5 MB upload limit',
      }),
    /** MIME type reported by the client / detected by the browser. */
    type: z
      .string({ error: 'File type is required' })
      .trim()
      .min(1, { error: 'File type is required' })
      .refine(
        (type) =>
          type === 'text/csv' ||
          type === 'application/pdf' ||
          type.startsWith('image/'),
        { message: 'Only CSV, PDF, or image files (PNG, JPG) are supported' },
      ),
  })
  .strict()
  .refine(
    (file) => {
      const lower = file.name.toLowerCase();
      if (file.type === 'application/pdf') return lower.endsWith('.pdf');
      if (file.type === 'text/csv') return lower.endsWith('.csv');
      if (file.type.startsWith('image/')) {
        return (
          lower.endsWith('.png') ||
          lower.endsWith('.jpg') ||
          lower.endsWith('.jpeg') ||
          lower.endsWith('.webp')
        );
      }
      return false;
    },
    { message: 'File extension does not match its type' },
  );

/** ISO 8601 UTC timestamp (mirrors lib/validation/recurring.ts). */
const isoUtc = z
  .string({ error: 'Transaction date must be an ISO 8601 timestamp' })
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: 'Transaction date must be a valid ISO 8601 timestamp',
  });

/** Positive integer amount in sen (§8.1). */
const amountSen = z
  .number({ error: 'Amount must be a number' })
  .int({ error: 'Amount must be an integer number of sen' })
  .positive({ error: 'Amount must be greater than zero' });

/**
 * One parsed statement row (the validated intermediate shape produced by the
 * CSV/PDF parsers). Merchant name 1–120 chars, amount in positive integer sen,
 * and an ISO 8601 transaction date.
 */
export const importRowSchema = z
  .object({
    merchantName: z
      .string({ error: 'Merchant name is required' })
      .trim()
      .min(1, { error: 'Merchant name is required' })
      .max(120, { error: 'Merchant name is too long' }),
    amountSen,
    transactionDate: isoUtc,
  })
  .strict();

export type UploadedFileSchema = z.infer<typeof uploadedFileSchema>;
export type ImportRowSchema = z.infer<typeof importRowSchema>;

/**
 * Multipart upload field schema (§7, §12). Validates the `File` object and an
 * optional idempotency key. The file's name/size/type are re-derived
 * server-side from the actual `File` (never trusted from the client) and
 * re-checked against `uploadedFileSchema` + a byte-length cap in the route.
 */
export const importUploadSchema = z
  .object({
    file: z.instanceof(File, { error: 'A file is required' }),
    idempotencyKey: z.string().uuid({ error: 'idempotencyKey must be a UUID' }).optional(),
  })
  .strict();

/**
 * Final response-level re-validation of parsed rows before persist/return
 * (§7 "never trust intermediate output"). Caps the array at MAX_CSV_ROWS so a
 * pathological parse can never exceed the hard limit at persist time.
 */
export const importRowsArraySchema = z
  .array(importRowSchema)
  .refine((rows) => rows.length <= MAX_CSV_ROWS, {
    message: `Cannot exceed maximum of ${MAX_CSV_ROWS} rows`,
  });

export type ImportUploadSchema = z.infer<typeof importUploadSchema>;
export type ImportRowsArraySchema = z.infer<typeof importRowsArraySchema>;
