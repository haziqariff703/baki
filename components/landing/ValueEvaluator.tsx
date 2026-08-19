'use client';

/**
 * Interactive Value Evaluator — the landing page marquee piece.
 *
 * Renders the five weighted criteria (1–5 each) as accessible segmented
 * controls, plus optional subscription name and monthly price (MYR). On
 * submit it calls the real deterministic `computeScoreResult` engine via the
 * `scoreInputSchema` trust boundary (AGENTS.md §7) and renders the full
 * structured result: score, band, recommendation, per-criterion breakdown,
 * decision-tree path, and plain-language explanation (§2.5).
 *
 * The engine is pure — same input, same output, client-side. The UI never
 * recomputes any part of the result (§5.1).
 */

import { useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  Eye,
  PauseCircle,
  XCircle,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { computeScoreResult, type CriterionId, type Recommendation, type ScoreResult } from '@/features/scoring';
import { scoreInputSchema } from '@/lib/validation';
import { myrToSen, senToMyr } from '@/lib/money';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Types & constants                                                          */
/* -------------------------------------------------------------------------- */

interface EvaluatorInputProps {
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly idPrefix: string;
}

interface BreakdownRowProps {
  readonly id: string;
  readonly label: string;
  readonly weightPercent: number;
  readonly rating: number;
  readonly contribution: number;
}

/** Icon + colour per recommendation — never colour alone (§16). */
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

/** Criteria in display order, with their weights from the rule. */
const CRITERIA: readonly { id: CriterionId; weightPercent: number }[] = [
  { id: 'usage', weightPercent: 25 },
  { id: 'necessity', weightPercent: 25 },
  { id: 'affordability', weightPercent: 20 },
  { id: 'uniqueness', weightPercent: 15 },
  { id: 'satisfaction', weightPercent: 15 },
];

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

/** One criterion row: label + 1–5 segmented control. */
function CriterionControl({ label, value, onChange, idPrefix }: EvaluatorInputProps) {
  const name = `${idPrefix}-rating`;

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium text-text-muted">{label}</legend>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex items-center gap-1"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className={cn(
              'flex-1 cursor-pointer rounded-xl border px-0 py-2 text-center text-xs font-mono font-medium transition-colors',
              'focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-surface-1',
              value === n
                ? 'border-border-3 bg-surface-3 text-text-primary'
                : 'border-border-2 bg-surface-2 text-text-muted hover:border-border-3 hover:text-text-secondary',
            )}
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            {n}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Ledger-Rule row for one criterion's contribution. */
function BreakdownRow({ label, weightPercent, rating, contribution }: BreakdownRowProps) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-2">
      <span className="flex items-baseline gap-2 min-w-0">
        <span className="text-sm text-text-secondary truncate">{label}</span>
        <span className="font-mono text-xs text-text-faint shrink-0">
          {weightPercent}%
        </span>
      </span>
      <span className="flex items-baseline gap-2 shrink-0">
        <span className="font-mono text-xs text-text-faint">
          {rating}/5
        </span>
        <span className="font-mono text-sm text-text-primary">
          {contribution.toFixed(0)}
        </span>
      </span>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function ValueEvaluator() {
  const t = useTranslations('Landing');
  const tCommon = useTranslations('Common');
  const uid = useId();

  const [usage, setUsage] = useState(3);
  const [necessity, setNecessity] = useState(3);
  const [affordability, setAffordability] = useState(3);
  const [uniqueness, setUniqueness] = useState(3);
  const [satisfaction, setSatisfaction] = useState(3);
  const [providerName, setProviderName] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  const setters = useMemo(
    () => ({
      usage: setUsage,
      necessity: setNecessity,
      affordability: setAffordability,
      uniqueness: setUniqueness,
      satisfaction: setSatisfaction,
    }),
    [],
  );

  const priceSen = useMemo(() => {
    if (!monthlyPrice.trim()) return null;
    return myrToSen(monthlyPrice);
  }, [monthlyPrice]);

  function handleCalculate() {
    setPriceError(null);

    if (monthlyPrice.trim() && priceSen === null) {
      setPriceError(t('priceInvalid'));
      return;
    }

    const parsed = scoreInputSchema.safeParse({
      usage,
      necessity,
      affordability,
      uniqueness,
      satisfaction,
    });

    if (!parsed.success) {
      // All ratings are controlled 1–5 radio inputs; this should never fire.
      // Guard for defence-in-depth per AGENTS.md §7.
      return;
    }

    setResult(computeScoreResult(parsed.data));
  }

  const recStyle = result ? RECOMMENDATION_STYLE[result.recommendation.type] : null;
  const RecIcon = recStyle?.Icon ?? CheckCircle2;

  return (
    <div className="bg-surface-1 border border-border-1 rounded-xl overflow-hidden">
      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="border-b border-border-1 pb-4 flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.01em] leading-[1.25] text-text-primary">
              {t('evaluatorTitle')}
            </h2>
            <p className="text-sm text-text-muted mt-1">{t('evaluatorSubtitle')}</p>
          </div>
          <span className="font-mono text-xs uppercase tracking-wider text-text-faint">
            subscriptionScoreRuleV1 · deterministic
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Input form */}
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor={`${uid}-name`}
                  className="text-xs font-medium text-text-muted block"
                >
                  {t('providerName')}
                </label>
                <input
                  id={`${uid}-name`}
                  type="text"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder={t('providerNamePlaceholder')}
                  maxLength={60}
                  className="w-full bg-surface-2 text-text-primary text-sm rounded-xl px-3 py-2 border border-border-2 transition-colors placeholder:text-text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor={`${uid}-price`}
                  className="text-xs font-medium text-text-muted block"
                >
                  {t('monthlyPrice')}
                </label>
                <input
                  id={`${uid}-price`}
                  type="text"
                  inputMode="decimal"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                  placeholder="0.00"
                  aria-invalid={priceError !== null}
                  aria-describedby={priceError ? `${uid}-price-error` : undefined}
                  className={cn(
                    'w-full bg-surface-2 text-text-primary text-sm rounded-xl px-3 py-2 border transition-colors placeholder:text-text-faint focus:outline-none focus:ring-1',
                    priceError
                      ? 'border-status-rose-border focus:border-status-rose-border focus:ring-status-rose-border'
                      : 'border-border-2 focus:border-accent focus:ring-accent',
                  )}
                />
                {priceError && (
                  <p
                    id={`${uid}-price-error`}
                    role="alert"
                    className="text-xs text-status-rose-text"
                  >
                    {priceError}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {CRITERIA.map((c) => (
                <CriterionControl
                  key={c.id}
                  idPrefix={`${uid}-${c.id}`}
                  label={`${t(c.id)} · ${c.weightPercent}%`}
                  value={
                    c.id === 'usage'
                      ? usage
                      : c.id === 'necessity'
                        ? necessity
                        : c.id === 'affordability'
                          ? affordability
                          : c.id === 'uniqueness'
                            ? uniqueness
                            : satisfaction
                  }
                  onChange={setters[c.id]}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleCalculate}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-border-3 bg-surface-3 text-text-primary text-sm font-medium hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t('calculateBtn')}
            </button>
          </div>

          {/* Result panel */}
          <div
            className="bg-surface-2 border border-border-1 rounded-xl p-5 md:p-6 space-y-5"
            aria-live="polite"
          >
            {!result ? (
              <div className="flex flex-col items-center justify-center min-h-[280px] text-center space-y-3 py-8">
                <ShieldCheck className="w-6 h-6 text-text-faint" aria-hidden="true" />
                <p className="text-sm text-text-muted max-w-[240px]">
                  {t('resultEmpty')}
                </p>
              </div>
            ) : (
              <>
                {/* Score + recommendation */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs text-text-muted font-medium">
                      {t('resultScore')}
                    </p>
                    <p className="font-mono text-5xl font-medium text-text-primary mt-1">
                      {result.score}
                    </p>
                    <p className="font-mono text-xs uppercase tracking-wider text-text-faint mt-1">
                      {t(`band.${result.band}`)}
                    </p>
                  </div>

                  <div
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-2 rounded-xl border',
                      recStyle?.className,
                    )}
                  >
                    <RecIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-semibold">
                      {tCommon(
                        result.recommendation.type === 'downgrade_or_pause'
                          ? 'Pause'
                          : result.recommendation.type === 'consider_cancelling'
                            ? 'Cancel'
                            : result.recommendation.type === 'review'
                              ? 'Review'
                              : 'Keep',
                      )}
                    </span>
                  </div>
                </div>

                {/* Context line (name + price) */}
                {(providerName.trim() || priceSen !== null) && (
                  <p className="text-xs text-text-muted -mt-2">
                    {[
                      providerName.trim() && providerName.trim(),
                      priceSen !== null && `MYR ${senToMyr(priceSen)}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}

                {/* Safeguard note */}
                {result.appliedSafeguard === 'essential_and_affordable' && (
                  <p className="text-xs text-text-secondary flex items-start gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-status-blue-text shrink-0 mt-0.5" aria-hidden="true" />
                    {t('whyPathSafeguard')}
                  </p>
                )}

                {/* Breakdown */}
                <div className="border-t border-border-1 pt-3">
                  <p className="text-xs font-mono uppercase tracking-wider text-text-faint mb-1">
                    {t('whyTitle')}
                  </p>
                  <p className="text-xs text-text-faint mb-3">{t('whyFormula')}</p>
                  <ul className="divide-y divide-border-1">
                    {result.breakdown.map((row) => (
                      <BreakdownRow
                        key={row.id}
                        id={row.id}
                        label={t(row.id)}
                        weightPercent={row.weightPercent}
                        rating={row.rating}
                        contribution={row.contribution}
                      />
                    ))}
                  </ul>
                </div>

                {/* Decision path */}
                <div className="border-t border-border-1 pt-3">
                  <p className="text-xs font-mono uppercase tracking-wider text-text-faint mb-2">
                    {t('whyPathLabel')}
                  </p>
                  <ol className="flex items-center gap-1.5 flex-wrap">
                    {result.decisionPath.map((step, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        {i > 0 && (
                          <span className="text-text-faint text-xs" aria-hidden="true">
                            →
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-1 rounded-xl border border-border-1 bg-surface-1 font-mono text-xs text-text-secondary">
                          {step.kind === 'score' && `${t('whyPathScore')} ${step.token}`}
                          {step.kind === 'band' && t(`band.${step.token}`)}
                          {step.kind === 'safeguard' && t('whyPathSafeguard')}
                          {step.kind === 'result' &&
                            tCommon(
                              step.token === 'downgrade_or_pause'
                                ? 'Pause'
                                : step.token === 'consider_cancelling'
                                  ? 'Cancel'
                                  : step.token === 'review'
                                    ? 'Review'
                                    : 'Keep',
                            )}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Plain-language explanation */}
                <p className="text-sm text-text-secondary leading-relaxed border-t border-border-1 pt-3">
                  {t(`whyExplanation.${result.recommendation.type}`)}
                </p>

                {/* Rule stamp */}
                <p className="font-mono text-xs uppercase tracking-wider text-text-faint pt-1">
                  {result.ruleVersion}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
