/**
 * Runtime validation for the scoring trust boundary (AGENTS.md §7).
 * TypeScript types never validate runtime input — always parse through these
 * schemas before calling `computeScoreResult`.
 */
import { z } from 'zod';

/** One criterion rating: integer 1–5. */
const rating = z
  .number({ error: 'Rating must be a number' })
  .int({ error: 'Rating must be a whole number between 1 and 5' })
  .min(1, { error: 'Rating must be at least 1' })
  .max(5, { error: 'Rating must be at most 5' });

/** Validated input for the deterministic scoring engine. */
export const scoreInputSchema = z
  .object({
    usage: rating,
    necessity: rating,
    affordability: rating,
    uniqueness: rating,
    satisfaction: rating,
  })
  .strict();

export type ScoreInputSchema = z.infer<typeof scoreInputSchema>;
