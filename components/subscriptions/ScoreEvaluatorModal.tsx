'use client';

/**
 * 5-Question Value Score Calculator & Evaluation Modal.
 *
 * Implements deterministic scoring (AGENTS.md §2.1, §8.2) through an interactive,
 * accessible dialog. Optimized for clean mobile view without clutter or emojis.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  CheckCircle2,
  Eye,
  PauseCircle,
  XCircle,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import {
  computeScoreResult,
  subscriptionScoreRuleV1,
  type CriterionId,
  type Recommendation,
  type ScoreInput,
  type ScoreResult,
} from '@/features/scoring';
import { type SubscriptionSchema } from '@/lib/validation';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';
import { cn } from '@/lib/utils';

export interface ScoreEvaluatorModalProps {
  readonly open: boolean;
  readonly subscription: SubscriptionSchema | null;
  readonly onSaveRatings: (id: string, ratings: ScoreInput) => void;
  readonly onClose: () => void;
}

const RECOMMENDATION_STYLE: Record<
  Recommendation['type'],
  { Icon: LucideIcon; className: string }
> = {
  keep: {
    Icon: CheckCircle2,
    className:
      'text-status-emerald-text border-status-emerald-border bg-status-emerald-surface',
  },
  review: {
    Icon: Eye,
    className:
      'text-status-blue-text border-status-blue-border bg-status-blue-surface',
  },
  downgrade_or_pause: {
    Icon: PauseCircle,
    className:
      'text-status-amber-text border-status-amber-border bg-status-amber-surface',
  },
  consider_cancelling: {
    Icon: XCircle,
    className:
      'text-status-rose-text border-status-rose-border bg-status-rose-surface',
  },
};

const CRITERIA_ORDER: readonly CriterionId[] = [
  'usage',
  'necessity',
  'affordability',
  'uniqueness',
  'satisfaction',
];

export function ScoreEvaluatorModal({
  open,
  subscription,
  onSaveRatings,
  onClose,
}: ScoreEvaluatorModalProps) {
  const t = useTranslations('Subscriptions');
  const tDash = useTranslations('Dashboard');

  const [ratings, setRatings] = useState<ScoreInput>({
    usage: 3,
    necessity: 3,
    affordability: 3,
    uniqueness: 3,
    satisfaction: 3,
  });

  // Sync state when subscription opens
  useEffect(() => {
    if (subscription) {
      setRatings({
        usage: subscription.usage,
        necessity: subscription.necessity,
        affordability: subscription.affordability,
        uniqueness: subscription.uniqueness,
        satisfaction: subscription.satisfaction,
      });
    }
  }, [subscription, open]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Deterministic live calculation
  const result: ScoreResult = useMemo(
    () => computeScoreResult(ratings),
    [ratings],
  );

  if (!open || !subscription) return null;

  const style = RECOMMENDATION_STYLE[result.recommendation.type];
  const { Icon } = style;

  const handleRatingChange = (id: CriterionId, value: number) => {
    setRatings((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = () => {
    onSaveRatings(subscription.id, ratings);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evaluator-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-xl bg-surface-1 border border-border-2 rounded-xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-border-1 flex items-center justify-between gap-3 bg-surface-1 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo merchantName={subscription.merchantName} size={24} />
            <div className="min-w-0">
              <h2
                id="evaluator-title"
                className="text-sm sm:text-base font-semibold text-text-primary truncate"
              >
                {t('evaluator.title')}
              </h2>
              <p className="text-xs text-text-muted truncate">
                {subscription.merchantName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('evaluator.close')}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Questions Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          {/* Compact Live Score Banner */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-border-1 bg-surface-0/50 flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-2xl sm:text-3xl font-medium text-text-primary border-l-2 border-accent pl-2.5">
                {result.score}
                <span className="text-xs font-normal text-text-faint ml-1">
                  /100
                </span>
              </span>

              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-medium',
                  style.className,
                )}
              >
                <Icon className="w-3 h-3" aria-hidden="true" />
                {tDash(`recommendation.${result.recommendation.type}`)}
              </span>
            </div>

            <span className="font-mono text-[10px] sm:text-xs text-text-faint uppercase tracking-wider hidden xs:inline-block">
              {result.ruleVersion}
            </span>
          </div>

          {/* Safeguard alert if active */}
          {result.appliedSafeguard && (
            <div className="text-xs text-status-blue-text bg-status-blue-surface border border-status-blue-border rounded-lg px-3 py-2 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{t('evaluator.safeguardDesc')}</span>
            </div>
          )}

          {/* 5 Questions */}
          <div className="space-y-3 sm:space-y-4">
            {CRITERIA_ORDER.map((criterionId) => {
              const rule = subscriptionScoreRuleV1.criteria.find(
                (c) => c.id === criterionId,
              );
              const weight = rule?.weightPercent ?? 20;
              const currentRating = ratings[criterionId];
              const points = ((currentRating / 5) * weight).toFixed(1);

              return (
                <div
                  key={criterionId}
                  className="p-3 sm:p-3.5 rounded-xl bg-surface-2/40 border border-border-1 space-y-2.5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs sm:text-sm font-medium text-text-primary">
                      {t(`evaluator.questions.${criterionId}.label`)}
                    </p>
                    <span className="font-mono text-xs text-text-faint shrink-0">
                      {points} pts ({weight}%)
                    </span>
                  </div>

                  {/* 1-5 Step Segmented Control */}
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {[1, 2, 3, 4, 5].map((val) => {
                      const selected = currentRating === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleRatingChange(criterionId, val)}
                          className={cn(
                            'h-8 sm:h-9 rounded-lg border font-mono text-xs sm:text-sm font-medium flex items-center justify-center transition-colors',
                            selected
                              ? 'border-accent bg-accent text-surface-0 font-semibold'
                              : 'border-border-2 bg-surface-1 text-text-secondary hover:border-border-3 hover:text-text-primary',
                          )}
                          aria-pressed={selected}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>

                  {/* Rating Description Footers */}
                  <div className="flex justify-between text-[11px] text-text-faint px-0.5">
                    <span>1: {t(`evaluator.questions.${criterionId}.low`)}</span>
                    <span>5: {t(`evaluator.questions.${criterionId}.high`)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formula Transparency Callout */}
          <div className="px-3 py-2 rounded-lg bg-surface-2/60 border border-border-1 text-[11px] sm:text-xs flex items-center justify-between text-text-muted">
            <span>{t('evaluator.formulaHeading')}</span>
            <span className="font-mono text-text-primary">
              {t('evaluator.formulaExplanation')}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-border-1 bg-surface-1 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface-2 hover:bg-surface-3 border border-border-2 rounded-xl transition-colors"
          >
            {t('formCancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 sm:px-5 sm:py-2 text-xs font-medium text-surface-0 bg-accent hover:bg-accent-hover rounded-xl transition-colors"
          >
            {t('evaluator.saveScore')}
          </button>
        </div>
      </div>
    </div>
  );
}
