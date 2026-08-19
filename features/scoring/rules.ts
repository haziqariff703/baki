/**
 * subscriptionScoreRuleV1 — the single, versioned source of truth for the
 * 5-criterion value score and decision-tree safeguards (AGENTS.md §8.2).
 *
 * Strict determinism (features/scoring/AGENTS.md): pure TypeScript only.
 * No LLM, no randomness, no Date/Math.random — same input, same output.
 */

import type {
  CriterionBreakdown,
  CriterionId,
  DecisionTreeStep,
  Recommendation,
  ScoreBand,
  ScoreInput,
  ScoreResult,
} from './types';

/** One weighted criterion definition. */
export interface CriterionRule {
  readonly id: CriterionId;
  /** Weight as a percentage of the total (sums to 100 across all criteria). */
  readonly weightPercent: number;
}

/** Versioned rule constants. Never hardcode these values elsewhere. */
export const subscriptionScoreRuleV1 = {
  version: 'subscriptionScoreRuleV1',
  criteria: [
    { id: 'usage', weightPercent: 25 },
    { id: 'necessity', weightPercent: 25 },
    { id: 'affordability', weightPercent: 20 },
    { id: 'uniqueness', weightPercent: 15 },
    { id: 'satisfaction', weightPercent: 15 },
  ] as readonly CriterionRule[],
  /** Minimum score (inclusive) for each band, checked high → low. */
  bands: {
    high: 75,
    moderate: 55,
    low: 35,
    // very_low: below 35
  },
  safeguard: {
    essentialMinRating: 4,
    affordableMinRating: 4,
    /** Safeguard only fires for scores below the moderate band. */
    belowScore: 55,
  },
} as const;

function bandForScore(score: number): ScoreBand {
  if (score >= subscriptionScoreRuleV1.bands.high) return 'high';
  if (score >= subscriptionScoreRuleV1.bands.moderate) return 'moderate';
  if (score >= subscriptionScoreRuleV1.bands.low) return 'low';
  return 'very_low';
}

function baseRecommendation(band: ScoreBand): Recommendation {
  switch (band) {
    case 'high':
      return { type: 'keep', reasonCodes: ['band_high_value'] };
    case 'moderate':
      return { type: 'review', reasonCodes: ['band_moderate_value'] };
    case 'low':
      return { type: 'downgrade_or_pause', reasonCodes: ['band_low_value'] };
    case 'very_low':
      return { type: 'consider_cancelling', reasonCodes: ['band_very_low_value'] };
  }
}

/**
 * Compute the full deterministic scoring result for a validated input.
 * Returns the score, band, safeguard outcome, rule version, decision-tree
 * path, per-criterion breakdown, and final recommendation (§2.5).
 */
export function computeScoreResult(input: ScoreInput): ScoreResult {
  const breakdown: CriterionBreakdown[] = subscriptionScoreRuleV1.criteria.map(
    (criterion) => {
      const rating = input[criterion.id];
      return {
        id: criterion.id,
        weightPercent: criterion.weightPercent,
        rating,
        contribution: (rating / 5) * criterion.weightPercent,
      };
    },
  );

  const rawTotal = breakdown.reduce((sum, row) => sum + row.contribution, 0);
  const score = Math.round(rawTotal);
  const band = bandForScore(score);

  const decisionPath: DecisionTreeStep[] = [
    { kind: 'score', token: String(score) },
    { kind: 'band', token: band },
  ];

  let recommendation = baseRecommendation(band);
  let appliedSafeguard: ScoreResult['appliedSafeguard'] = null;

  const { essentialMinRating, affordableMinRating, belowScore } =
    subscriptionScoreRuleV1.safeguard;
  const essentialAndAffordable =
    input.necessity >= essentialMinRating &&
    input.affordability >= affordableMinRating &&
    score < belowScore;

  if (essentialAndAffordable) {
    appliedSafeguard = 'essential_and_affordable';
    recommendation = {
      type: 'review',
      reasonCodes: ['safeguard_essential_and_affordable'],
    };
    decisionPath.push({ kind: 'safeguard', token: 'essential_and_affordable' });
  }

  decisionPath.push({ kind: 'result', token: recommendation.type });

  return {
    score,
    band,
    appliedSafeguard,
    ruleVersion: subscriptionScoreRuleV1.version,
    decisionPath,
    breakdown,
    recommendation,
  };
}
