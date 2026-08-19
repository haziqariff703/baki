/**
 * Synthetic renewal fixtures (tests/AGENTS.md: 100% synthetic data).
 * Schema-validated at load. Dates are relative to a fixed "today" so the
 * demo renders deterministically.
 */
import type { UpcomingRenewal } from '@/features/cash-flow';
import { upcomingRenewalSchema } from '@/lib/validation';

/** Fixed reference "today" for the synthetic dashboard. */
export const SYNTHETIC_TODAY = '2026-08-16T00:00:00.000Z';

const raw: readonly UpcomingRenewal[] = [
  {
    id: 'r-spotify',
    merchantName: 'Spotify',
    amountSen: 1590,
    nextChargeDate: '2026-08-16T00:00:00.000Z', // day-of
    cycle: 'monthly',
    reminderOffsets: [7, 1, 0],
  },
  {
    id: 'r-netflix',
    merchantName: 'Netflix',
    amountSen: 5500,
    nextChargeDate: '2026-08-17T00:00:00.000Z', // 1 day
    cycle: 'monthly',
    reminderOffsets: [7, 1, 0],
  },
  {
    id: 'r-icloud',
    merchantName: 'iCloud+',
    amountSen: 390,
    nextChargeDate: '2026-08-22T00:00:00.000Z', // 6 days
    cycle: 'monthly',
    reminderOffsets: [7, 1, 0],
  },
  {
    id: 'r-gym',
    merchantName: 'Anytime Fitness',
    amountSen: 15900,
    nextChargeDate: '2026-09-01T00:00:00.000Z', // 16 days
    cycle: 'monthly',
    reminderOffsets: [7, 1, 0],
  },
  {
    id: 'r-domain',
    merchantName: 'Namecheap Domain',
    amountSen: 6000,
    nextChargeDate: '2026-09-10T00:00:00.000Z', // 25 days
    cycle: 'yearly',
    reminderOffsets: [7, 1, 0],
  },
];

export const syntheticRenewals: readonly UpcomingRenewal[] = raw.map((r) =>
  upcomingRenewalSchema.parse(r),
);

/** Synthetic available balance: RM 5,000.00. */
export const syntheticAvailableBalanceSen = 500000;
