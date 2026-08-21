'use client';

import { useTranslations } from 'next-intl';
import {
  daysUntil,
  normalizeToMonthlySen,
  type UpcomingRenewal,
} from '@/features/cash-flow';
import { senToMyr, type MoneyInSen } from '@/lib/money';
import { toDatePart } from '@/lib/dates';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';

/**
 * Cash-flow forecast visuals (client component — nested inside the interactive
 * ForecastLedger, so it must be client; it holds no state of its own).
 *
 * 1. Cumulative 30-day commitment sparkline (pure SVG).
 * 2. Monthly-normalised per-merchant bars (pure CSS).
 * No Date.now(), no Math.random(): renders identically server/client.
 */

/* -------------------------------------------------------------------------- */
/*  1 · Cumulative commitment sparkline                                       */
/* -------------------------------------------------------------------------- */

const W = 320;
const H = 72;
const PAD_X = 6;
const PAD_Y = 8;
const WINDOW = 30;

interface CumulativeChartProps {
  readonly renewals: readonly UpcomingRenewal[];
  readonly fromDate: string;
  readonly ariaLabel: string;
}

export function CumulativeCommitmentChart({
  renewals,
  fromDate,
  ariaLabel,
}: CumulativeChartProps) {
  // Build a day-indexed cumulative series, 0..WINDOW inclusive (31 points).
  const daily: readonly number[] = (() => {
    const arr = new Array<number>(WINDOW + 1).fill(0);
    for (const r of renewals) {
      const d = daysUntil(r.nextChargeDate, fromDate);
      if (d !== null && d >= 0 && d <= WINDOW) arr[d] += r.amountSen;
    }
    return arr;
  })();
  const cumulative: readonly number[] = daily.reduce<number[]>(
    (acc, v) => [...acc, (acc.length === 0 ? 0 : acc[acc.length - 1]) + v],
    [],
  );

  const total = cumulative[WINDOW];
  if (total <= 0) return null;

  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;

  const coords = cumulative.map((v, i) => {
    const x = PAD_X + (i / WINDOW) * innerW;
    const y = PAD_Y + innerH - (v / total) * innerH;
    return { x, y };
  });
  const path = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');
  const last = coords[coords.length - 1];

  return (
    <div>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
        className="block"
      >
        {/* baseline */}
        <line
          x1={PAD_X}
          y1={H - PAD_Y}
          x2={W - PAD_X}
          y2={H - PAD_Y}
          stroke="var(--color-border-2)"
          strokeWidth="1"
        />
        <path
          d={path}
          fill="none"
          stroke="var(--color-text-secondary)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={last.x}
          cy={last.y}
          r="3"
          fill="var(--color-surface-1)"
          stroke="var(--color-text-secondary)"
          strokeWidth="1.5"
        />
      </svg>
      <div className="flex items-baseline justify-between mt-2">
        <span className="font-mono text-xs text-text-faint">
          {toDatePart(fromDate)}
        </span>
        <span className="font-mono text-xs text-text-faint">
          +{WINDOW}d
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  2 · Monthly-normalised per-merchant bars                                  */
/* -------------------------------------------------------------------------- */

interface MonthlyBarsProps {
  readonly renewals: readonly UpcomingRenewal[];
}

export function MonthlyNormalisedBars({ renewals }: MonthlyBarsProps) {
  const t = useTranslations('CashFlow');

  // Largest monthly-normalised amount first (display grouping; not a new rule).
  const rows = [...renewals]
    .map((r) => ({
      id: r.id,
      merchantName: r.merchantName,
      monthlySen: normalizeToMonthlySen(r.amountSen, r.cycle),
    }))
    .sort((a, b) => b.monthlySen - a.monthlySen);
  const max = Math.max(1, ...rows.map((r) => r.monthlySen));

  if (rows.length === 0) return null;

  return (
    <ul className="space-y-3" aria-label={t('monthlyBarsAria')}>
      {rows.map((row) => {
        const pct = Math.round((row.monthlySen / max) * 100);
        return (
          <li key={row.id}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="flex items-center gap-2 min-w-0">
                <BrandLogo merchantName={row.merchantName} size={18} />
                <span className="text-xs text-text-secondary truncate">
                  {row.merchantName}
                </span>
              </span>
              <span className="font-mono text-xs text-text-primary shrink-0">
                MYR {senToMyr(row.monthlySen)}
              </span>
            </div>
            <div
              className="h-2 rounded-full bg-surface-3 overflow-hidden"
              role="img"
              aria-label={t('monthlyBarAria', {
                name: row.merchantName,
                amount: senToMyr(row.monthlySen),
              })}
            >
              <div
                className="h-full rounded-full bg-text-secondary"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*  3 · Combined forecast-visuals panel                                       */
/* -------------------------------------------------------------------------- */

interface ForecastVisualsProps {
  readonly renewals: readonly UpcomingRenewal[];
  readonly fromDate: string;
  readonly totalSen: MoneyInSen;
}

export function ForecastVisuals({
  renewals,
  fromDate,
  totalSen,
}: ForecastVisualsProps) {
  const t = useTranslations('CashFlow');
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-text-muted mb-2">{t('cumulativeSub')}</p>
        <CumulativeCommitmentChart
          renewals={renewals}
          fromDate={fromDate}
          ariaLabel={t('cumulativeAria', { amount: senToMyr(totalSen) })}
        />
      </div>
      <div>
        <p className="text-xs text-text-muted mb-3">{t('monthlyBarsSub')}</p>
        <MonthlyNormalisedBars renewals={renewals} />
      </div>
    </div>
  );
}
