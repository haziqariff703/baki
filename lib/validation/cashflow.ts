/**
 * Runtime validation for cash-flow & renewals (AGENTS.md §7).
 * Validate at the trust boundary before domain logic or persistence.
 */
import { z } from 'zod';

const isoUtc = z
  .string({ error: 'Must be an ISO 8601 timestamp' })
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: 'Must be a valid ISO 8601 timestamp',
  });

const amountSen = z
  .number({ error: 'Amount must be a number' })
  .int({ error: 'Amount must be an integer number of sen' })
  .positive({ error: 'Amount must be greater than zero' });

/**
 * Non-negative integer sen. Used for aggregate totals which are legitimately 0
 * for a user with no subscriptions (empty dashboard) — `.positive()` would
 * wrongly reject that.
 */
const nonNegativeSen = z
  .number({ error: 'Amount must be a number' })
  .int({ error: 'Amount must be an integer number of sen' })
  .min(0, { error: 'Amount must be zero or greater' });

export const billingCycleSchema = z.enum(['weekly', 'monthly', 'quarterly', 'yearly']);

/** One upcoming renewal. */
export const upcomingRenewalSchema = z
  .object({
    id: z.string().min(1),
    merchantName: z.string().trim().min(1).max(120),
    amountSen,
    nextChargeDate: isoUtc,
    cycle: billingCycleSchema,
    reminderOffsets: z.array(z.number().int().min(0).max(30)).max(4),
  })
  .strict();

/** Dashboard cash-flow summary. */
export const cashFlowSummarySchema = z
  .object({
    monthlyCommitmentSen: nonNegativeSen,
    annualisedTotalSen: nonNegativeSen,
    safeToSpendSen: z.number().int(),
    upcomingCount: z.number().int().min(0),
  })
  .strict();

/** Full aggregated dashboard response body. */
export const cashFlowSummaryResponseSchema = z
  .object({
    summary: cashFlowSummarySchema,
    next30DayTotalSen: nonNegativeSen,
    upcoming: z.array(upcomingRenewalSchema),
    paydayAnalysis: z
      .object({
        paydayDayOfMonth: z.number().int().min(1).max(31),
        nextPaydayDate: isoUtc,
        daysUntilPayday: z.number().int(),
        beforePaydayTotalSen: nonNegativeSen,
        beforePaydayCount: z.number().int().min(0),
        afterPaydayTotalSen: nonNegativeSen,
        afterPaydayCount: z.number().int().min(0),
        isTightWindow: z.boolean(),
      })
      .strict()
      .nullable(),
  })
  .strict();

/** Query params for the cash-flow summary route (strict, §7). */
export const cashFlowSummaryQuerySchema = z
  .object({
    fromDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'fromDate must be YYYY-MM-DD' })
      .optional(),
    paydayDayOfMonth: z.coerce
      .number({ error: 'paydayDayOfMonth must be a number' })
      .int({ error: 'paydayDayOfMonth must be an integer' })
      .min(1, { error: 'paydayDayOfMonth must be between 1 and 31' })
      .max(31, { error: 'paydayDayOfMonth must be between 1 and 31' })
      .optional(),
  })
  .strict();

export type BillingCycleSchema = z.infer<typeof billingCycleSchema>;
export type UpcomingRenewalSchema = z.infer<typeof upcomingRenewalSchema>;
export type CashFlowSummarySchema = z.infer<typeof cashFlowSummarySchema>;
export type CashFlowSummaryResponseSchema = z.infer<typeof cashFlowSummaryResponseSchema>;
export type CashFlowSummaryQuerySchema = z.infer<typeof cashFlowSummaryQuerySchema>;
