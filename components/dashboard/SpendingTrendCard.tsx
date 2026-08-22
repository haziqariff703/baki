'use client';

/**
 * Spending Trend Card (Dashboard).
 *
 * Implements interactive Range selector (3M, 6M, 12M).
 * Renders SVG sparkline trajectory, delta comparisons with %,
 * and quiet minimalist summary metrics (Rolling Average, Lowest, Peak).
 * Impeccable Ledger-Rule styling with AA contrast compliance.
 * Employs fail-safe translation resolution with zero MISSING_MESSAGE runtime errors.
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus, History } from 'lucide-react';
import { TrendSparkline } from '@/components/dashboard/TrendSparkline';
import { CardActionMenu } from '@/components/ui/CardActionMenu';
import { buildSpendingTrend, type TrendPoint } from '@/features/dashboard/analytics';
import { senToMyr } from '@/lib/money';

interface SpendingTrendCardProps {
  readonly currentMonthlySen: number;
  readonly points?: readonly TrendPoint[];
}

type TrendRange = '3m' | '6m' | '12m';

export function SpendingTrendCard({ currentMonthlySen, points }: SpendingTrendCardProps) {
  const t = useTranslations('Dashboard');
  const [range, setRange] = useState<TrendRange>('6m');

  // Safe translation helper: checks key existence to guarantee zero MISSING_MESSAGE errors
  const safeT = (key: string, fallback: string, params?: Record<string, string | number>): string => {
    try {
      if (typeof (t as any).has === 'function' && !(t as any).has(key)) {
        return fallback;
      }
      const val = t(key as any, params);
      return val && !val.startsWith('Dashboard.') ? val : fallback;
    } catch {
      return fallback;
    }
  };

  const menuItems = [
    {
      value: '3m' as TrendRange,
      label: safeT('trendRange3m', safeT('trend.range3m', 'Last 3 months')),
      Icon: History,
    },
    {
      value: '6m' as TrendRange,
      label: safeT('trendRange6m', safeT('trend.range6m', 'Last 6 months')),
      Icon: History,
    },
    {
      value: '12m' as TrendRange,
      label: safeT('trendRange12m', safeT('trend.range12m', 'Last 12 months')),
      Icon: History,
    },
  ];

  const allPoints: readonly TrendPoint[] = useMemo(() => {
    if (points && points.length > 0) return points;
    return buildSpendingTrend(currentMonthlySen);
  }, [points, currentMonthlySen]);

  const activePoints = useMemo(() => {
    if (range === '3m') return allPoints.slice(-3);
    if (range === '6m') return allPoints.slice(-6);
    return allPoints.slice(-12);
  }, [allPoints, range]);

  const latest = activePoints[activePoints.length - 1]?.monthlySen ?? currentMonthlySen;
  const previous =
    activePoints.length > 1
      ? activePoints[activePoints.length - 2].monthlySen
      : latest;
  const delta = latest - previous;
  const deltaPct =
    previous > 0
      ? ((delta / previous) * 100).toFixed(1)
      : latest > 0
        ? '+100.0'
        : '0.0';

  // Minimalist Summary Numbers
  const values = activePoints.map((p) => p.monthlySen);
  const minSen = Math.min(...values);
  const maxSen = Math.max(...values);
  const avgSen = Math.round(values.reduce((sum, v) => sum + v, 0) / (values.length || 1));

  const rangeLabelShort = range.toUpperCase();

  const rangeDisplay =
    range === '3m'
      ? safeT('trendRange3m', safeT('trend.range3m', 'Last 3 months'))
      : range === '6m'
        ? safeT('trendRange6m', safeT('trend.range6m', 'Last 6 months'))
        : safeT('trendRange12m', safeT('trend.range12m', 'Last 12 months'));

  return (
    <section
      aria-labelledby="trend-heading"
      className="bg-surface-1 border border-border-1 rounded-xl p-5 space-y-4 flex flex-col justify-between"
    >
      <div className="space-y-3.5">
        {/* Header with Title and Three-Dot Kebab Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-text-faint" aria-hidden="true" />
              <h2
                id="trend-heading"
                className="text-xs font-mono uppercase tracking-wider text-text-faint"
              >
                {safeT('trendHeading', 'Spending trend')}
              </h2>
            </div>
            <p className="text-xs text-text-muted">
              {safeT('trendSub', 'Historical spending commitments & trajectory')}
            </p>
          </div>

          {/* Three-Dot Menu for Range Selection */}
          <CardActionMenu
            title="Time Range"
            items={menuItems}
            selectedValue={range}
            onSelect={setRange}
          />
        </div>

        {/* Current Value + Delta Summary */}
        <div className="flex items-baseline justify-between pt-0.5">
          <div>
            <span className="font-mono text-2xl font-semibold text-text-primary block">
              MYR {senToMyr(latest)}
            </span>
            <span className="text-[11px] text-text-muted">{rangeDisplay}</span>
          </div>

          {/* Delta Pill with Percentage */}
          <div className="flex items-center gap-1 text-xs font-mono">
            {delta > 0 ? (
              <span className="inline-flex items-center gap-0.5 text-status-rose-text bg-status-rose-surface border border-status-rose-border px-2 py-0.5 rounded-md">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>
                  +MYR {senToMyr(delta)} ({deltaPct}%)
                </span>
              </span>
            ) : delta < 0 ? (
              <span className="inline-flex items-center gap-0.5 text-status-emerald-text bg-status-emerald-surface border border-status-emerald-border px-2 py-0.5 rounded-md">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>
                  -MYR {senToMyr(Math.abs(delta))} ({Math.abs(Number(deltaPct))}%)
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-text-muted bg-surface-2 border border-border-2 px-2 py-0.5 rounded-md">
                <Minus className="w-3.5 h-3.5" />
                <span>{safeT('trendDeltaFlat', safeT('trend.deltaFlat', 'Stable vs last period'))}</span>
              </span>
            )}
          </div>
        </div>

        {/* SVG Sparkline */}
        <TrendSparkline
          points={activePoints}
          ariaLabel={safeT('trendAria', `Monthly commitment trend, latest MYR ${senToMyr(latest)}`, {
            amount: senToMyr(latest),
          })}
        />

        {/* Quiet Minimalist Statistics Footer: Avg, Lowest, Peak */}
        <div className="pt-3 border-t border-border-1/60 grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
          <div className="bg-surface-2/40 border border-border-1/60 rounded-lg py-1.5 px-1">
            <span className="text-text-faint block text-[10px] uppercase font-mono">
              {safeT(
                'trendAvg',
                safeT('trend.avgLabel', `${rangeLabelShort} Avg`, { range: rangeLabelShort }),
                { range: rangeLabelShort },
              )}
            </span>
            <span className="font-semibold text-text-primary">
              MYR {senToMyr(avgSen)}
            </span>
          </div>

          <div className="bg-surface-2/40 border border-border-1/60 rounded-lg py-1.5 px-1">
            <span className="text-text-faint block text-[10px] uppercase font-mono">
              {safeT('trendMin', safeT('trend.minLabel', 'Lowest'))}
            </span>
            <span className="font-medium text-text-secondary">
              MYR {senToMyr(minSen)}
            </span>
          </div>

          <div className="bg-surface-2/40 border border-border-1/60 rounded-lg py-1.5 px-1">
            <span className="text-text-faint block text-[10px] uppercase font-mono">
              {safeT('trendMax', safeT('trend.maxLabel', 'Peak'))}
            </span>
            <span className="font-medium text-text-secondary">
              MYR {senToMyr(maxSen)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
