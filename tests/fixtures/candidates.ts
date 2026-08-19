/**
 * Synthetic fixtures for the candidate confirmation queue (tests/AGENTS.md:
 * 100% synthetic data — no real personal financial records).
 *
 * Typed against `RecurringCandidate` and validated at module load so a bad
 * fixture fails fast during development.
 */
import type { RecurringCandidate } from '@/features/recurring-detection';
import { recurringCandidateSchema } from '@/lib/validation';

const raw: readonly RecurringCandidate[] = [
  {
    id: 'cand-spotify',
    merchantName: 'Spotify',
    amountSen: 1590,
    occurrenceCount: 4,
    intervalDays: 30,
    aiConfidence: 0.92,
    detectedAt: '2026-07-28T02:14:00.000Z',
    status: { state: 'pending' },
  },
  {
    id: 'cand-netflix',
    merchantName: 'Netflix',
    amountSen: 5500,
    occurrenceCount: 3,
    intervalDays: 31,
    aiConfidence: 0.81,
    detectedAt: '2026-07-27T09:40:00.000Z',
    status: { state: 'pending' },
  },
  {
    id: 'cand-gym',
    merchantName: 'Anytime Fitness',
    amountSen: 15900,
    occurrenceCount: 2,
    intervalDays: 30,
    aiConfidence: 0.58,
    detectedAt: '2026-07-25T13:05:00.000Z',
    status: { state: 'pending' },
  },
  {
    id: 'cand-icloud',
    merchantName: 'iCloud+',
    amountSen: 390,
    occurrenceCount: 5,
    intervalDays: 30,
    aiConfidence: 0.44,
    detectedAt: '2026-07-20T18:22:00.000Z',
    status: { state: 'pending' },
  },
];

/** Validated synthetic candidate queue. */
export const syntheticCandidates: readonly RecurringCandidate[] = raw.map((c) =>
  recurringCandidateSchema.parse(c),
);
