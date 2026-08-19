/**
 * Runtime validation for consent & data control (AGENTS.md §7).
 * Validate at the trust boundary before domain logic or persistence.
 *
 * Timestamps and consent versions are SERVER-authoritative (§2.6) — the
 * client never supplies `requestedAt` or `consentVersion`. Schemas here accept
 * only the minimal, strictly-bounded client input.
 */
import { z } from 'zod';

const isoUtc = z
  .string({ error: 'Must be an ISO 8601 timestamp' })
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: 'Must be a valid ISO 8601 timestamp',
  });

export const consentPurposeSchema = z.enum([
  'transaction_import',
  'ai_assist',
  'analytics',
  'notifications',
]);

export const consentRecordSchema = z
  .object({
    purpose: consentPurposeSchema,
    status: z.enum(['granted', 'withdrawn']),
    consentVersion: z.string().min(1).max(40),
    grantedAt: isoUtc.nullable(),
    withdrawnAt: isoUtc.nullable(),
  })
  .strict();

/**
 * Consent toggle payload. The client requests a target status; the server
 * decides the transition and stamps version + timestamp (§2.6).
 */
export const consentToggleSchema = z
  .object({
    status: z.enum(['granted', 'withdrawn']),
  })
  .strict();

/** Export-request payload. Format only — timestamp is server-stamped. */
export const exportRequestSchema = z
  .object({
    format: z.enum(['json', 'csv']),
  })
  .strict();

/**
 * Deletion-confirmation payload: the typed phrase only. The exact-match gate
 * runs server-side in the domain layer (§2.2, §11).
 */
export const deletionConfirmationSchema = z
  .object({
    phrase: z.string().trim().min(1, { error: 'Type the confirmation phrase' }).max(100),
  })
  .strict();

export type ConsentPurposeSchema = z.infer<typeof consentPurposeSchema>;
export type ConsentRecordSchema = z.infer<typeof consentRecordSchema>;
export type ConsentToggleSchema = z.infer<typeof consentToggleSchema>;
export type ExportRequestSchema = z.infer<typeof exportRequestSchema>;
export type DeletionConfirmationSchema = z.infer<typeof deletionConfirmationSchema>;
