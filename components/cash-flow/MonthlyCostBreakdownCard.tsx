'use client';

/**
 * Monthly Normalised Cost Breakdown Card (Cash-Flow Page).
 *
 * Dedicated card displaying subscriptions normalized to their monthly
 * financial commitment with relative distribution bars, cycle badges,
 * brand logos, and minimalist micro-stepper pagination.
 * Impeccable Ledger-Rule styling with AA contrast compliance.
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';
import {
  normalizeToMonthlySen,
  type UpcomingRenewal,
} from '@/features/cash-flow';
import { senToMyr, type MoneyInSen } from '@/lib/money';

interface MonthlyCostBreakdownCardProps {
  readonly renewals: readonly UpcomingRenewal[];
  readonly totalMonthlySen: MoneyInSen;
}

const PAGE_SIZE = 5;

export function MonthlyCostBreakdownCard({
  renewals,
  totalMonthlySen,
}: MonthlyCostBreakdownCardProps) {
  const t = useTranslations('CashFlow');
  const [page, setPage] = useState(1);

  // Safe translation helper for resilient key lookups
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

  // Normalized rows sorted by monthly commitment descending
  const normalizedRows = useMemo(() => {
    return [...renewals]
      .map((r) => ({
        id: r.id,
        merchantName: r.merchantName,
        cycle: r.cycle,
        amountSen: r.amountSen,
        monthlySen: normalizeToMonthlySen(r.amountSen, r.cycle),
      }))
      .sort((a, b) => b.monthlySen - a.monthlySen);
  }, [renewals]);

  const maxMonthlySen = useMemo(() => {
    return Math.max(1, ...normalizedRows.map((r) => r.monthlySen));
  }, [normalizedRows]);

  const totalPages = Math.max(1, Math.ceil(normalizedRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return normalizedRows.slice(start, start + PAGE_SIZE);
  }, [normalizedRows, currentPage]);

  const startIndex = normalizedRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(currentPage * PAGE_SIZE, normalizedRows.length);

  return (
    <section
      aria-labelledby="monthly-cost-heading"
      className="bg-surface-1 border border-border-1 rounded-xl flex flex-col justify-between overflow-hidden"
    >
      <div>
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border-1">
          <div className="flex items-baseline justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-text-faint" aria-hidden="true" />
                <h2
                  id="monthly-cost-heading"
                  className="text-xs font-mono uppercase tracking-wider text-text-faint"
                >
                  {safeT('monthlyCostCardTitle', 'Monthly Normalised Cost')}
                </h2>
              </div>
              <p className="text-xs text-text-muted">
                {safeT('monthlyCostCardSub', 'Cost per subscription converted to monthly norm')}
              </p>
            </div>

            <span className="font-mono text-xs uppercase tracking-wider text-text-faint shrink-0">
              {safeT('totalMonthlyNorm', 'Total Monthly Norm')}
            </span>
          </div>
        </div>

        {/* Monthly Total Commitment Banner */}
        <div className="flex items-baseline justify-between px-5 py-4 border-b border-border-1 bg-surface-1/50">
          <span className="text-sm text-text-secondary">
            {safeT('monthlyCommitment', 'Monthly commitment')}
          </span>
          <span className="font-mono text-lg font-semibold text-text-primary">
            MYR {senToMyr(totalMonthlySen)}
            <span className="text-xs font-normal text-text-muted ml-1">/mo</span>
          </span>
        </div>

        {/* Per-Subscription Normalised Bars List */}
        {normalizedRows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-text-muted">
            {safeT('empty', 'No subscriptions found.')}
          </p>
        ) : (
          <ul
            className="divide-y divide-border-1"
            aria-label={safeT('monthlyCostCardTitle', 'Monthly Normalised Cost')}
          >
            {paginatedRows.map((row) => {
              const pct = Math.round((row.monthlySen / maxMonthlySen) * 100);
              const isNonMonthly = row.cycle !== 'monthly';

              return (
                <li
                  key={row.id}
                  className="px-5 py-3.5 space-y-2 hover:bg-surface-2/30 transition-colors"
                >
                  {/* Top line: Logo + Merchant + Cycle Pill + Amount */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BrandLogo merchantName={row.merchantName} size={18} />
                      <span className="text-sm font-medium text-text-primary truncate">
                        {row.merchantName}
                      </span>
                      {isNonMonthly && (
                        <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-2 border border-border-2 text-text-muted shrink-0">
                          {row.cycle} (MYR {senToMyr(row.amountSen)})
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-sm font-semibold text-text-primary">
                        MYR {senToMyr(row.monthlySen)}
                      </span>
                      <span className="font-mono text-[11px] text-text-faint ml-1">
                        /mo
                      </span>
                    </div>
                  </div>

                  {/* Relative Distribution Bar */}
                  <div
                    className="h-1.5 rounded-full bg-surface-3 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={safeT(
                      'monthlyBarAria',
                      `${row.merchantName}: MYR ${senToMyr(row.monthlySen)} per month`,
                      {
                        name: row.merchantName,
                        amount: senToMyr(row.monthlySen),
                      },
                    )}
                  >
                    <div
                      className="h-full rounded-full bg-accent/80 transition-all duration-300"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Minimalist Micro-Stepper Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-border-1 bg-surface-1 flex items-center justify-between text-xs font-mono text-text-muted">
          <span>
            {safeT('paginationRange', `${startIndex}–${endIndex} of ${normalizedRows.length}`, {
              start: startIndex,
              end: endIndex,
              total: normalizedRows.length,
            })}
          </span>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-faint">
              {safeT('paginationPage', `${currentPage}/${totalPages}`, {
                current: currentPage,
                total: totalPages,
              })}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label={safeT('paginationPrev', 'Previous')}
                className="w-6 h-6 flex items-center justify-center rounded border border-border-1 bg-surface-2/60 text-text-secondary hover:bg-surface-3 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label={safeT('paginationNext', 'Next')}
                className="w-6 h-6 flex items-center justify-center rounded border border-border-1 bg-surface-2/60 text-text-secondary hover:bg-surface-3 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
