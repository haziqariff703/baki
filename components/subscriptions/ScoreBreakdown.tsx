'use client';

import { useTranslations } from 'next-intl';
import { type CriterionBreakdown, type CriterionId } from '@/features/scoring';

/**
 * Per-subscription value-score weighted-contribution breakdown.
 *
 * Renders 5 mini-bars — one per criterion — where the fill represents that
 * criterion's weighted contribution to the 0–100 total (contribution / 100).
 * Values are taken verbatim from `computeScoreResult(...).breakdown` (§2.5
 * explainability); nothing is recomputed here. Deterministic, hydration-safe,
 * no animation — numbers are typeset and settled (DESIGN.md).
 *
 * Ledger Rule: label left (text-secondary), hairline rule, mono value right.
 * No amber accent — the breakdown is diagnostic, not the single most important
 * figure in the view (that is the total score row, ticked separately).
 */

interface ScoreBreakdownProps {
  readonly breakdown: readonly CriterionBreakdown[];
  readonly totalScore: number;
}

const CRITERIA: readonly CriterionId[] = [
  'usage',
  'necessity',
  'affordability',
  'uniqueness',
  'satisfaction',
];

export function ScoreBreakdown({ breakdown, totalScore }: ScoreBreakdownProps) {
  const t = useTranslations('Subscriptions');

  const byId = new Map(breakdown.map((row) => [row.id, row]));

  return (
    <div
      className="space-y-2"
      role="group"
      aria-label={t('scoreBreakdownAria', { score: totalScore })}
    >
      {CRITERIA.map((id) => {
        const row = byId.get(id);
        const contribution = row?.contribution ?? 0;
        const rating = row?.rating ?? 0;
        const weight = row?.weightPercent ?? 0;
        // Fill as a share of the 0–100 total (contribution is already weighted).
        const fillPct = Math.max(0, Math.min(100, Math.round(contribution)));
        const label = t(id);
        return (
          <div key={id} className="flex items-center gap-2 sm:gap-3">
            {/* Label + weight stamp */}
            <span className="w-20 sm:w-28 shrink-0 text-xs text-text-secondary truncate">
              {label}
            </span>
            <span className="w-8 sm:w-10 shrink-0 font-mono text-[11px] sm:text-xs text-text-faint">
              {weight}%
            </span>

            {/* Mini-bar: track + settled fill */}
            <span
              className="h-1.5 flex-1 rounded-full bg-surface-3 overflow-hidden"
              role="img"
              aria-label={t('criterionAria', {
                name: label,
                rating,
                weight,
                points: contribution.toFixed(1),
              })}
            >
              <span
                className="block h-full rounded-full bg-text-secondary"
                style={{ width: `${fillPct}%` }}
              />
            </span>

            {/* Mono value: rating × weight → points */}
            <span className="w-10 sm:w-12 shrink-0 text-right font-mono text-xs text-text-primary">
              {contribution.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
