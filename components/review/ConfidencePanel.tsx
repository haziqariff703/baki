'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, HelpCircle, AlertTriangle, ShieldCheck, BrainCircuit } from 'lucide-react';
import {
  deriveRecommendationHint,
  type RecurringCandidate,
} from '@/features/recurring-detection';
import { AiTransparencyModal } from './AiTransparencyModal';

interface ConfidencePanelProps {
  readonly candidates: readonly RecurringCandidate[];
}

type Hint = 'likely_recurring' | 'uncertain' | 'needs_review';

const HINT_ORDER: readonly Hint[] = ['likely_recurring', 'uncertain', 'needs_review'];

/**
 * Summary-level AI-confidence transparency panel for the review queue.
 *
 * Advisory only (AGENTS.md §13.1, §2.2): the average and distribution are
 * derived from the same `deriveRecommendationHint` used per-candidate — never
 * recomputed, never authoritative. The human confirms or rejects each one.
 */
export function ConfidencePanel({ candidates }: ConfidencePanelProps) {
  const t = useTranslations('Review');
  const tDash = useTranslations('Dashboard.queueHint');
  const [modalOpen, setModalOpen] = useState(false);

  const total = candidates.length;
  const avgConfidence =
    total === 0
      ? 0
      : candidates.reduce((sum, c) => sum + c.aiConfidence, 0) / total;
  const avgPct = Math.round(avgConfidence * 100);

  const counts: Record<Hint, number> = {
    likely_recurring: 0,
    uncertain: 0,
    needs_review: 0,
  };
  for (const c of candidates) {
    counts[deriveRecommendationHint(c)] += 1;
  }

  const hintMeta: Record<
    Hint,
    { readonly icon: typeof CheckCircle2; readonly text: string; readonly bar: string }
  > = {
    likely_recurring: {
      icon: CheckCircle2,
      text: 'text-status-emerald-text',
      bar: 'bg-status-emerald-text',
    },
    uncertain: {
      icon: HelpCircle,
      text: 'text-status-blue-text',
      bar: 'bg-status-blue-text',
    },
    needs_review: {
      icon: AlertTriangle,
      text: 'text-status-amber-text',
      bar: 'bg-status-amber-text',
    },
  };

  return (
    <section
      aria-label={t('confidenceSummaryHeading')}
      className="rounded-xl border border-border-1 bg-surface-1 p-5 space-y-4"
    >
      <h2 className="text-xs font-mono uppercase tracking-wider text-text-faint">
        {t('confidenceSummaryHeading')}
      </h2>

      {/* 1. Average AI confidence — Ledger Rule row, the ONE amber left-tick in this card */}
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-text-secondary">{t('avgConfidence')}</span>
        <span
          className="font-mono text-sm font-medium text-text-primary border-l-2 border-accent pl-3"
          aria-label={t('avgConfidenceAria', { pct: avgPct })}
        >
          {avgPct}%
        </span>
      </div>

      {/* 2. Confidence distribution — segmented bar + per-bucket counts (icon + text) */}
      <div className="space-y-2.5">
        <span className="text-xs text-text-secondary">{t('distributionLabel')}</span>
        <div
          className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
          role="img"
          aria-label={HINT_ORDER.map((h) =>
            t('distributionAria', {
              count: counts[h],
              total,
              hint: tDash(h),
            }),
          ).join('; ')}
        >
          {HINT_ORDER.map((h) =>
            counts[h] > 0 && total > 0 ? (
              <span
                key={h}
                className={`block h-full ${hintMeta[h].bar}`}
                style={{ width: `${(counts[h] / total) * 100}%` }}
              />
            ) : null,
          )}
        </div>
        <ul className="space-y-1.5">
          {HINT_ORDER.map((h) => {
            const Icon = hintMeta[h].icon;
            const empty = counts[h] === 0;
            return (
              <li key={h} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      empty ? 'text-text-faint' : hintMeta[h].text
                    }`}
                    aria-hidden="true"
                  />
                  <span className={`text-xs ${empty ? 'text-text-faint' : 'text-text-secondary'}`}>
                    {tDash(h)}
                  </span>
                </span>
                <span
                  className={`font-mono text-xs ${
                    empty ? 'text-text-faint' : 'text-text-primary'
                  }`}
                >
                  {counts[h]}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 3. Transparency reasoning button & note */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-border-2 bg-surface-2 hover:bg-surface-3 text-xs font-medium text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        <BrainCircuit className="w-3.5 h-3.5 text-accent" />
        <span>How We Detect Subscriptions</span>
      </button>

      <p className="text-xs text-text-muted flex items-start gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
        {t('transparencyNote')}
      </p>

      {/* 4. Determinism stamp — mono uppercase metadata, mirrors ruleVersionStamp style */}
      <p className="text-xs font-mono uppercase tracking-wider text-text-faint border-t border-border-1 pt-3">
        {t('determinismStamp')}
      </p>

      {/* AI Transparency Dialog Modal */}
      <AiTransparencyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}
