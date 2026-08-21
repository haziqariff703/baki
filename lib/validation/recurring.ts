/**
 * Runtime validation for recurring-payment candidates (AGENTS.md §7).
 * Validate at the trust boundary before any domain logic or persistence.
 */
import { z } from 'zod';

const isoUtc = z
  .string({ error: 'Must be an ISO 8601 timestamp' })
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: 'Must be a valid ISO 8601 timestamp',
  });

/** Positive integer amount in sen (§8.1). */
const amountSen = z
  .number({ error: 'Amount must be a number' })
  .int({ error: 'Amount must be an integer number of sen' })
  .positive({ error: 'Amount must be greater than zero' });

const merchantName = z
  .string({ error: 'Merchant name is required' })
  .trim()
  .min(1, { error: 'Merchant name is required' })
  .max(120, { error: 'Merchant name is too long' });

const aiConfidence = z
  .number({ error: 'Confidence must be a number' })
  .min(0, { error: 'Confidence must be between 0 and 1' })
  .max(1, { error: 'Confidence must be between 0 and 1' });

/** A detected candidate as ingested from the detection pipeline. */
export const recurringCandidateSchema = z
  .object({
    id: z.string().min(1),
    merchantName,
    amountSen,
    occurrenceCount: z.number().int().min(1),
    intervalDays: z.number().int().positive(),
    aiConfidence,
    detectedAt: isoUtc,
    status: z.discriminatedUnion('state', [
      z.object({ state: z.literal('pending') }).strict(),
      z.object({ state: z.literal('confirmed'), confirmedAt: isoUtc }).strict(),
      z.object({ state: z.literal('rejected'), rejectedAt: isoUtc }).strict(),
    ]),
  })
  .strict();

/** Confirm decision payload. */
export const confirmCandidateSchema = z
  .object({
    action: z.literal('confirm'),
    confirmedAt: isoUtc,
  })
  .strict();

/** Reject decision payload. */
export const rejectCandidateSchema = z
  .object({
    action: z.literal('reject'),
    rejectedAt: isoUtc,
  })
  .strict();

/** Edit-before-confirm payload (partial, at least one field). */
export const candidateEditSchema = z
  .object({
    merchantName: merchantName.optional(),
    amountSen: amountSen.optional(),
  })
  .strict()
  .refine((v) => v.merchantName !== undefined || v.amountSen !== undefined, {
    message: 'At least one field must be provided',
  });

/**
 * Confirm/reject decision payload. Timestamps are server-stamped (§2.6) —
 * the client only supplies the decision itself.
 */
export const candidateDecisionSchema = z
  .object({
    action: z.enum(['confirm', 'reject']),
  })
  .strict();

export type CandidateDecisionSchema = z.infer<typeof candidateDecisionSchema>;

export type RecurringCandidateSchema = z.infer<typeof recurringCandidateSchema>;
export type ConfirmCandidateSchema = z.infer<typeof confirmCandidateSchema>;
export type RejectCandidateSchema = z.infer<typeof rejectCandidateSchema>;
export type CandidateEditSchema = z.infer<typeof candidateEditSchema>;
