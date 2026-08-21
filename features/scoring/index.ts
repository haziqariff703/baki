/**
 * 5-Criterion Value Scoring & Decision-Tree Safeguards Feature Module
 *
 * Public API: deterministic scoring engine (`computeScoreResult`) and the
 * versioned rule constants (`subscriptionScoreRuleV1`). See
 * features/scoring/AGENTS.md — pure TypeScript only, no LLM involvement.
 */
export { computeScoreResult, subscriptionScoreRuleV1 } from './rules';
export type { CriterionRule } from './rules';
export type {
  CriterionBreakdown,
  CriterionId,
  DecisionTreeStep,
  Recommendation,
  SafeguardId,
  ScoreBand,
  ScoreInput,
  ScoreResult,
} from './types';
