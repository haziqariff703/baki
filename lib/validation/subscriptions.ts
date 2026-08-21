/**
 * Runtime validation for subscription records (AGENTS.md §7).
 * Ratings reuse the same 1–5 integer rule as the scoring boundary so a
 * validated subscription can be passed straight into `computeScoreResult`.
 */
import { z } from 'zod';
import { billingCycleSchema } from './cashflow';

const isoUtc = z
  .string({ error: 'Must be an ISO 8601 timestamp' })
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: 'Must be a valid ISO 8601 timestamp',
  });

const rating = z
  .number({ error: 'Rating must be a number' })
  .int({ error: 'Rating must be a whole number between 1 and 5' })
  .min(1, { error: 'Rating must be at least 1' })
  .max(5, { error: 'Rating must be at most 5' });

/** One active subscription with its 5 criterion ratings. */
export const subscriptionSchema = z
  .object({
    id: z.string().min(1),
    merchantName: z.string().trim().min(1).max(120),
    amountSen: z
      .number({ error: 'Amount must be a number' })
      .int({ error: 'Amount must be an integer number of sen' })
      .positive({ error: 'Amount must be greater than zero' }),
    cycle: billingCycleSchema,
    nextChargeDate: isoUtc,
    usage: rating,
    necessity: rating,
    affordability: rating,
    uniqueness: rating,
    satisfaction: rating,
  })
  .strict();

export type SubscriptionSchema = z.infer<typeof subscriptionSchema>;

/**
 * Input for creating a subscription: no id/timestamps (server assigns them).
 * Reuses the same rating/amount/cycle rules as `subscriptionSchema` (§7).
 */
export const createSubscriptionSchema = subscriptionSchema.omit({
  id: true,
});

export type CreateSubscriptionSchema = z.infer<typeof createSubscriptionSchema>;
