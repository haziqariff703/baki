/**
 * Unit tests for the deterministic scoring engine (subscriptionScoreRuleV1).
 *
 * Covers the boundaries required by AGENTS.md §15 and
 * features/scoring/AGENTS.md: 34/35, 54/55, 74/75, the decision-tree
 * safeguard paths, and the invariant that per-criterion contributions sum
 * to the total score.
 */
import { describe, expect, it } from 'vitest';

import {
  computeScoreResult,
  subscriptionScoreRuleV1,
  type ScoreInput,
} from '@/features/scoring';
import { scoreInputSchema } from '@/lib/validation';

/** Helper: all ratings at the same level. */
function uniform(rating: number): ScoreInput {
  return {
    usage: rating,
    necessity: rating,
    affordability: rating,
    uniqueness: rating,
    satisfaction: rating,
  };
}

/** Helper: build an input whose raw weighted total equals `targetScore`. */
function forScore(targetScore: number): ScoreInput {
  // Max total is 100 at all-5. Each point of uniform rating shift moves the
  // total by 20 (sum of weights / 5). For fine control we solve via usage
  // (25%) and necessity (25%) first, then affordability (20%).
  // Simplest exact approach: binary search over a small integer space is
  // overkill — instead we tune usage down from 5 until the score matches.
  const base = uniform(5);
  if (targetScore === 100) return base;

  for (let usage = 5; usage >= 1; usage -= 1) {
    for (let necessity = 5; necessity >= 1; necessity -= 1) {
      for (let affordability = 5; affordability >= 1; affordability -= 1) {
        for (let uniqueness = 5; uniqueness >= 1; uniqueness -= 1) {
          for (let satisfaction = 5; satisfaction >= 1; satisfaction -= 1) {
            const candidate: ScoreInput = {
              usage,
              necessity,
              affordability,
              uniqueness,
              satisfaction,
            };
            const result = computeScoreResult(candidate);
            if (result.score === targetScore) return candidate;
          }
        }
      }
    }
  }
  throw new Error(`No input produces score ${targetScore}`);
}

describe('computeScoreResult', () => {
  it('computes a perfect score of 100 with band high → keep', () => {
    const result = computeScoreResult(uniform(5));
    expect(result.score).toBe(100);
    expect(result.band).toBe('high');
    expect(result.appliedSafeguard).toBeNull();
    expect(result.recommendation).toEqual({
      type: 'keep',
      reasonCodes: ['band_high_value'],
    });
  });

  it('computes the minimum score (all ratings 1) as 20, band very_low → consider_cancelling', () => {
    // (1/5) × (25+25+20+15+15) = 20 — the floor of the 0–100 scale.
    const result = computeScoreResult(uniform(1));
    expect(result.score).toBe(20);
    expect(result.band).toBe('very_low');
    expect(result.recommendation.type).toBe('consider_cancelling');
  });

  it('is deterministic: same input always yields the identical result', () => {
    const input: ScoreInput = {
      usage: 5,
      necessity: 3,
      affordability: 5,
      uniqueness: 3,
      satisfaction: 4,
    };
    expect(computeScoreResult(input)).toEqual(computeScoreResult(input));
  });

  it('stamps the versioned rule identifier', () => {
    expect(computeScoreResult(uniform(3)).ruleVersion).toBe(
      'subscriptionScoreRuleV1',
    );
  });

  it('uses the versioned criteria weights (sum to 100)', () => {
    const total = subscriptionScoreRuleV1.criteria.reduce(
      (sum, c) => sum + c.weightPercent,
      0,
    );
    expect(total).toBe(100);
  });

  it('per-criterion contributions sum to the raw total behind the score', () => {
    const input: ScoreInput = {
      usage: 4,
      necessity: 2,
      affordability: 5,
      uniqueness: 1,
      satisfaction: 3,
    };
    const result = computeScoreResult(input);
    const rawTotal = result.breakdown.reduce((s, row) => s + row.contribution, 0);
    expect(result.score).toBe(Math.round(rawTotal));
    // contributions match the formula (rating / 5) * weight
    for (const row of result.breakdown) {
      const weight = subscriptionScoreRuleV1.criteria.find(
        (c) => c.id === row.id,
      )?.weightPercent;
      expect(row.contribution).toBeCloseTo((row.rating / 5) * (weight ?? 0));
    }
  });
});

describe('boundary scores (AGENTS.md §15)', () => {
  it('score 34 → very_low → consider_cancelling', () => {
    const result = computeScoreResult(forScore(34));
    expect(result.score).toBe(34);
    expect(result.band).toBe('very_low');
    expect(result.recommendation.type).toBe('consider_cancelling');
  });

  it('score 35 → low → downgrade_or_pause', () => {
    const result = computeScoreResult(forScore(35));
    expect(result.score).toBe(35);
    expect(result.band).toBe('low');
    expect(result.recommendation.type).toBe('downgrade_or_pause');
  });

  it('score 54 → low → downgrade_or_pause', () => {
    const result = computeScoreResult(forScore(54));
    expect(result.score).toBe(54);
    expect(result.band).toBe('low');
    expect(result.recommendation.type).toBe('downgrade_or_pause');
  });

  it('score 55 → moderate → review', () => {
    const result = computeScoreResult(forScore(55));
    expect(result.score).toBe(55);
    expect(result.band).toBe('moderate');
    expect(result.recommendation.type).toBe('review');
  });

  it('score 74 → moderate → review', () => {
    const result = computeScoreResult(forScore(74));
    expect(result.score).toBe(74);
    expect(result.band).toBe('moderate');
    expect(result.recommendation.type).toBe('review');
  });

  it('score 75 → high → keep', () => {
    const result = computeScoreResult(forScore(75));
    expect(result.score).toBe(75);
    expect(result.band).toBe('high');
    expect(result.recommendation.type).toBe('keep');
  });
});

describe('decision-tree safeguard: Essential & Affordable', () => {
  it('fires when necessity ≥ 4, affordability ≥ 4, and score < 55 → review', () => {
    // usage 1 (5) + necessity 5 (25) + affordability 5 (20) + uniqueness 1 (3) + satisfaction 1 (3) = 56
    // need < 55: usage 1, necessity 5, affordability 4, uniqueness 1, satisfaction 1
    // = 5 + 25 + 16 + 3 + 3 = 52 → low band, safeguard lifts to review
    const result = computeScoreResult({
      usage: 1,
      necessity: 5,
      affordability: 4,
      uniqueness: 1,
      satisfaction: 1,
    });
    expect(result.score).toBe(52);
    expect(result.band).toBe('low');
    expect(result.appliedSafeguard).toBe('essential_and_affordable');
    expect(result.recommendation).toEqual({
      type: 'review',
      reasonCodes: ['safeguard_essential_and_affordable'],
    });
    const kinds = result.decisionPath.map((s) => s.kind);
    expect(kinds).toEqual(['score', 'band', 'safeguard', 'result']);
  });

  it('does NOT fire when essential but unaffordable (affordability < 4)', () => {
    // necessity 5, affordability 3 → essential but unaffordable
    // usage 1 (5) + necessity 5 (25) + affordability 3 (12) + uniqueness 1 (3) + satisfaction 1 (3) = 48
    const result = computeScoreResult({
      usage: 1,
      necessity: 5,
      affordability: 3,
      uniqueness: 1,
      satisfaction: 1,
    });
    expect(result.score).toBe(48);
    expect(result.band).toBe('low');
    expect(result.appliedSafeguard).toBeNull();
    expect(result.recommendation.type).toBe('downgrade_or_pause');
  });

  it('does NOT fire when score ≥ 55 even if essential & affordable', () => {
    // usage 4 (20) + necessity 4 (20) + affordability 4 (16) + uniqueness 3 (9) + satisfaction 3 (9) = 74
    const result = computeScoreResult({
      usage: 4,
      necessity: 4,
      affordability: 4,
      uniqueness: 3,
      satisfaction: 3,
    });
    expect(result.score).toBe(74);
    expect(result.appliedSafeguard).toBeNull();
    expect(result.recommendation.type).toBe('review');
    expect(result.recommendation.reasonCodes).toEqual(['band_moderate_value']);
  });

  it('decision path records score → band → result when no safeguard fires', () => {
    const result = computeScoreResult(uniform(5));
    expect(result.decisionPath.map((s) => s.kind)).toEqual([
      'score',
      'band',
      'result',
    ]);
    expect(result.decisionPath.map((s) => s.token)).toEqual([
      '100',
      'high',
      'keep',
    ]);
  });
});

describe('scoreInputSchema (Zod trust boundary, §7)', () => {
  it('accepts valid integer ratings 1–5', () => {
    const parsed = scoreInputSchema.parse(uniform(3));
    expect(parsed).toEqual(uniform(3));
  });

  it('rejects ratings outside 1–5', () => {
    expect(() => scoreInputSchema.parse(uniform(0))).toThrow();
    expect(() => scoreInputSchema.parse(uniform(6))).toThrow();
  });

  it('rejects non-integer ratings', () => {
    expect(() => scoreInputSchema.parse(uniform(2.5))).toThrow();
  });

  it('rejects unexpected fields (strict)', () => {
    expect(() =>
      scoreInputSchema.parse({ ...uniform(3), hacker: 1 }),
    ).toThrow();
  });
});
