/**
 * Synthetic subscription fixtures (tests/AGENTS.md: 100% synthetic data).
 * Schema-validated at load. Dates align with the fixed synthetic "today" in
 * tests/fixtures/renewals.ts so the demo renders deterministically.
 *
 * Ratings are 1–5 integers per the 5-criterion score matrix (AGENTS.md §8.2).
 * Presentation layers feed them through `scoreInputSchema.parse(...)` and
 * `computeScoreResult` — never recompute.
 */
import { subscriptionSchema, type SubscriptionSchema } from '@/lib/validation';

const raw: readonly SubscriptionSchema[] = [
  {
    id: 's-spotify',
    merchantName: 'Spotify',
    amountSen: 1590,
    cycle: 'monthly',
    nextChargeDate: '2026-08-16T00:00:00.000Z',
    usage: 5,
    necessity: 3,
    affordability: 5,
    uniqueness: 3,
    satisfaction: 5,
  },
  {
    id: 's-netflix',
    merchantName: 'Netflix',
    amountSen: 5500,
    cycle: 'monthly',
    nextChargeDate: '2026-08-17T00:00:00.000Z',
    usage: 3,
    necessity: 2,
    affordability: 3,
    uniqueness: 3,
    satisfaction: 3,
  },
  {
    id: 's-icloud',
    merchantName: 'iCloud+',
    amountSen: 390,
    cycle: 'monthly',
    nextChargeDate: '2026-08-22T00:00:00.000Z',
    usage: 4,
    necessity: 5,
    affordability: 5,
    uniqueness: 3,
    satisfaction: 4,
  },
  {
    id: 's-gym',
    merchantName: 'Anytime Fitness',
    amountSen: 15900,
    cycle: 'monthly',
    nextChargeDate: '2026-09-01T00:00:00.000Z',
    usage: 1,
    necessity: 2,
    affordability: 2,
    uniqueness: 2,
    satisfaction: 2,
  },
  {
    id: 's-domain',
    merchantName: 'Namecheap Domain',
    amountSen: 6000,
    cycle: 'yearly',
    nextChargeDate: '2026-09-10T00:00:00.000Z',
    usage: 2,
    necessity: 4,
    affordability: 4,
    uniqueness: 3,
    satisfaction: 3,
  },
];

export const syntheticSubscriptions: readonly SubscriptionSchema[] = raw.map(
  (s) => subscriptionSchema.parse(s),
);
