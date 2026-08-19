/**
 * Scoring domain types — deterministic value-score engine.
 *
 * AGENTS.md §2.1: the exact same validated input must always produce the exact
 * same financial output. These types describe the full structured result that
 * every recommendation must expose (§2.5 Explainability): criteria values,
 * weights, formula inputs, rule version, decision-tree path, and final result.
 */

/** Criterion identifiers, in display order. */
export type CriterionId =
  | 'usage'
  | 'necessity'
  | 'affordability'
  | 'uniqueness'
  | 'satisfaction';

/** Base recommendation bands derived from the raw 0–100 score (§8.2). */
export type ScoreBand = 'high' | 'moderate' | 'low' | 'very_low';

/**
 * Discriminated union for final recommendations (AGENTS.md §6).
 * Codes are language-independent; UI maps them to localized labels.
 */
export type Recommendation =
  | { type: 'keep'; reasonCodes: string[] }
  | { type: 'review'; reasonCodes: string[] }
  | { type: 'downgrade_or_pause'; reasonCodes: string[] }
  | { type: 'consider_cancelling'; reasonCodes: string[] };

/** Safeguard identifiers from the deterministic decision tree. */
export type SafeguardId = 'essential_and_affordable';

/** One criterion's contribution to the total score. */
export interface CriterionBreakdown {
  readonly id: CriterionId;
  /** Weight as a percentage, e.g. 25 means 25%. */
  readonly weightPercent: number;
  /** User rating, integer 1–5. */
  readonly rating: number;
  /** Points contributed to the 0–100 total: (rating / 5) * weightPercent. */
  readonly contribution: number;
}

/** One step of the decision-tree evaluation path (§2.5). */
export interface DecisionTreeStep {
  /**
   * Language-independent step kind:
   * - `score`   — the computed 0–100 score.
   * - `band`    — the base band the score falls into.
   * - `safeguard` — a safeguard rule was evaluated/fired.
   * - `result`  — the final recommendation.
   */
  readonly kind: 'score' | 'band' | 'safeguard' | 'result';
  /** Language-independent detail token, e.g. 'low', 'essential_and_affordable', 'review'. */
  readonly token: string;
}

/** Validated input to the scoring engine (integer ratings 1–5). */
export interface ScoreInput {
  readonly usage: number;
  readonly necessity: number;
  readonly affordability: number;
  readonly uniqueness: number;
  readonly satisfaction: number;
}

/**
 * Full structured scoring result. The UI renders this verbatim and never
 * recomputes any part of it (§5.1).
 */
export interface ScoreResult {
  /** Total value score, integer 0–100. */
  readonly score: number;
  /** Base band before safeguards. */
  readonly band: ScoreBand;
  /** Safeguard that fired, if any. */
  readonly appliedSafeguard: SafeguardId | null;
  /** Rule version identifier, e.g. 'subscriptionScoreRuleV1'. */
  readonly ruleVersion: string;
  /** Ordered decision-tree evaluation path. */
  readonly decisionPath: readonly DecisionTreeStep[];
  /** Per-criterion breakdown; contributions sum to `score`. */
  readonly breakdown: readonly CriterionBreakdown[];
  /** Final recommendation after safeguards. */
  readonly recommendation: Recommendation;
}
