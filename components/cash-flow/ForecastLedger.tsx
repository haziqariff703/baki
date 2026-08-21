'use client';

import { useTranslations } from 'next-intl';
import {
  SYNTHETIC_TODAY,
} from '@/tests/fixtures/renewals';
import {
  computeCashFlowSummary,
  computeNext30DayTotalSen,
  sortByNextCharge,
  type UpcomingRenewal,
  type CashFlowSummary,
} from '@/features/cash-flow';
import { senToMyr } from '@/lib/money';
import { SavingsSimulator } from '@/components/cash-flow/SavingsSimulator';
import { PaydayAnchorStrip } from '@/components/cash-flow/PaydayAnchorStrip';
import { UpcomingRenewalsCard } from '@/components/cash-flow/UpcomingRenewalsCard';
import { MonthlyCostBreakdownCard } from '@/components/cash-flow/MonthlyCostBreakdownCard';

export interface ForecastLedgerProps {
  renewals: readonly UpcomingRenewal[];
  availableBalanceSen: number;
}

/**
 * M4 — Commitment Forecast Ledger (interactive client component).
 *
 * Implements clean 2-column layout:
 * - Left Column: Cash-Flow Summary (Ledger Rule), Payday Anchor Strip, Savings Simulator Sandbox
 * - Right Column:
 *    1. Upcoming Renewals Card (with 30-day trajectory sparkline + pagination)
 *    2. Monthly Normalised Cost Card (with relative distribution bars + pagination)
 *
 * AGENTS.md §2.1: all financial values are computed deterministically.
 * AGENTS.md §16: badges pair icon + text, never color alone.
 */
export function ForecastLedger({ renewals, availableBalanceSen }: ForecastLedgerProps) {
  const t = useTranslations('CashFlow');

  const summary: CashFlowSummary = computeCashFlowSummary(
    renewals,
    availableBalanceSen,
    SYNTHETIC_TODAY,
  );
  const next30TotalSen = computeNext30DayTotalSen(renewals, SYNTHETIC_TODAY);
  const sorted = sortByNextCharge(renewals);

  // Safe translation helper
  const safeT = (key: string, fallback: string, params?: Record<string, string | number>): string => {
    try {
      if (typeof (t as any).has === 'function' && !(t as any).has(key)) {
        return fallback;
      }
      const val = t(key as any, params);
      return val && !val.startsWith('CashFlow.') ? val : fallback;
    } catch {
      return fallback;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* ── Left Column: Summary + Payday Anchor + Savings Simulator ───────── */}
      <div className="space-y-6">
        {/* Summary card: Ledger Rule rows */}
        <section
          aria-labelledby="summary-heading"
          className="bg-surface-1 border border-border-1 rounded-xl overflow-hidden"
        >
          <div className="px-5 pt-5 pb-3 border-b border-border-1">
            <h2
              id="summary-heading"
              className="text-xs font-mono uppercase tracking-wider text-text-faint"
            >
              {safeT('summaryHeading', 'Cash-flow summary')}
            </h2>
          </div>

          <dl className="divide-y divide-border-1">
            {/* Monthly commitment */}
            <div className="flex items-baseline justify-between px-5 py-3.5">
              <dt className="text-sm text-text-secondary">
                {safeT('monthlyCommitment', 'Monthly commitment')}
              </dt>
              <dd className="font-mono text-sm font-semibold text-text-primary">
                MYR {senToMyr(summary.monthlyCommitmentSen)}
              </dd>
            </div>

            {/* Annualised total */}
            <div className="flex items-baseline justify-between px-5 py-3.5">
              <dt className="text-sm text-text-secondary">
                {safeT('annualisedTotal', 'Annualised total')}
              </dt>
              <dd className="font-mono text-sm text-text-primary">
                MYR {senToMyr(summary.annualisedTotalSen)}
              </dd>
            </div>

            {/* Safe to spend */}
            <div className="flex items-baseline justify-between px-5 py-3.5">
              <dt className="text-sm text-text-secondary">
                {safeT('safeToSpend', 'Safe to spend this month')}
              </dt>
              <dd className="font-mono text-sm font-semibold text-status-emerald-text">
                MYR {senToMyr(summary.safeToSpendSen)}
              </dd>
            </div>

            {/* Upcoming count */}
            <div className="flex items-baseline justify-between px-5 py-3.5">
              <dt className="text-sm text-text-secondary">
                {safeT('upcomingCount', `${summary.upcomingCount} renewals due`, {
                  count: summary.upcomingCount,
                })}
              </dt>
              <dd className="font-mono text-sm text-text-primary">
                {summary.upcomingCount}
              </dd>
            </div>
          </dl>
        </section>

        {/* Payday & Income Anchor Strip */}
        <PaydayAnchorStrip renewals={sorted} fromDate={SYNTHETIC_TODAY} />

        {/* Savings Simulator ("What-If" Sandbox) */}
        <SavingsSimulator
          renewals={sorted}
          availableBalanceSen={availableBalanceSen}
        />
      </div>

      {/* ── Right Column: Separated Upcoming Renewals & Monthly Cost Cards ──── */}
      <div className="space-y-6">
        {/* Card 1: Dedicated Upcoming Renewals Schedule with Pagination */}
        <UpcomingRenewalsCard
          renewals={sorted}
          fromDate={SYNTHETIC_TODAY}
          totalSen={next30TotalSen}
        />

        {/* Card 2: Dedicated Monthly Normalised Cost with Distribution & Pagination */}
        <MonthlyCostBreakdownCard
          renewals={renewals}
          totalMonthlySen={summary.monthlyCommitmentSen}
        />
      </div>
    </div>
  );
}
