'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  SlidersHorizontal,
  RotateCcw,
  Check,
  PauseCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  computeSimulationImpact,
  normalizeToMonthlySen,
  type UpcomingRenewal,
  type SimulationImpact,
} from '@/features/cash-flow';
import { senToMyr, type MoneyInSen } from '@/lib/money';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';

interface SavingsSimulatorProps {
  readonly renewals: readonly UpcomingRenewal[];
  readonly availableBalanceSen: MoneyInSen;
}

const PAGE_SIZE = 5;

/**
 * Savings Simulator ("What-If" Sandbox).
 *
 * AGENTS.md §2.1: pure deterministic calculations in integer sen.
 * AGENTS.md §2.2: purely advisory/preview — never modifies database or actual subscriptions.
 * AGENTS.md §16: clear plain-language labels in English & Malay.
 * DESIGN.md: Ledger rule, hairline borders, single amber tick, font-mono for money, minimalist micro-stepper pagination.
 */
export function SavingsSimulator({
  renewals,
  availableBalanceSen,
}: SavingsSimulatorProps) {
  const t = useTranslations('CashFlow');
  const [pausedIds, setPausedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

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

  const togglePaused = (id: string) => {
    setPausedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleReset = () => {
    setPausedIds(new Set());
  };

  const impact: SimulationImpact = computeSimulationImpact(
    renewals,
    pausedIds,
    availableBalanceSen,
  );

  const hasPausedItems = pausedIds.size > 0;

  const totalPages = Math.max(1, Math.ceil(renewals.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedRenewals = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return renewals.slice(start, start + PAGE_SIZE);
  }, [renewals, currentPage]);

  const startIndex = renewals.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(currentPage * PAGE_SIZE, renewals.length);

  return (
    <section
      aria-labelledby="simulator-heading"
      className="bg-surface-1 border border-border-1 rounded-xl overflow-hidden flex flex-col justify-between"
    >
      <div>
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border-1 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-text-faint" aria-hidden="true" />
              <h2
                id="simulator-heading"
                className="text-xs font-mono uppercase tracking-wider text-text-faint"
              >
                {safeT('simulator.title', 'Savings Simulator')}
              </h2>
            </div>
            <p className="text-xs text-text-muted">
              {safeT('simulator.subtitle', 'Try pausing subscriptions below to see how much you save.')}
            </p>
          </div>

          {hasPausedItems && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-text-secondary hover:text-text-primary bg-surface-2 hover:bg-surface-3 border border-border-2 rounded-lg transition-colors shrink-0"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              {safeT('simulator.reset', 'Reset')}
            </button>
          )}
        </div>

        {/* Simulator Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border-1 border-b border-border-1 bg-surface-0/40">
          {/* Monthly Savings - Primary Hero Metric */}
          <div className="px-5 py-4">
            <span className="text-xs text-text-secondary block">
              {safeT('simulator.monthlySavings', 'Money saved each month')}
            </span>
            <div className="mt-1 flex items-baseline">
              <span
                className={`font-mono text-xl font-medium ${
                  hasPausedItems
                    ? 'text-accent border-l-2 border-accent pl-2.5'
                    : 'text-text-muted'
                }`}
              >
                + MYR {senToMyr(impact.monthlySavingsSen)}
              </span>
              <span className="text-xs text-text-faint ml-2">/ month</span>
            </div>
          </div>

          {/* Yearly Savings */}
          <div className="px-5 py-4">
            <span className="text-xs text-text-secondary block">
              {safeT('simulator.yearlySavings', 'Money saved each year')}
            </span>
            <div className="mt-1 flex items-baseline">
              <span
                className={`font-mono text-lg font-medium ${
                  hasPausedItems ? 'text-text-primary' : 'text-text-muted'
                }`}
              >
                + MYR {senToMyr(impact.annualSavingsSen)}
              </span>
              <span className="text-xs text-text-faint ml-2">/ year</span>
            </div>
          </div>

          {/* New Safe to Spend */}
          <div className="px-5 py-4">
            <span className="text-xs text-text-secondary block">
              {safeT('simulator.newSafeToSpend', 'New safe to spend')}
            </span>
            <div className="mt-1 flex items-baseline">
              <span className="font-mono text-lg font-medium text-text-primary">
                MYR {senToMyr(impact.simulatedSafeToSpendSen)}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Subscriptions Sandbox List Header */}
        <div className="px-5 py-3 border-b border-border-1 bg-surface-2/40 flex items-center justify-between text-xs">
          <span className="text-text-secondary font-medium">
            {safeT('simulator.pausedCount', `${pausedIds.size} subscriptions paused`, {
              count: pausedIds.size,
            })}
          </span>
          <span className="font-mono text-text-faint text-[11px] uppercase tracking-wider">
            {safeT('simulator.safetyNote', 'Safe preview only')}
          </span>
        </div>

        {/* Paginated Sandbox List */}
        <ul
          className="divide-y divide-border-1"
          aria-label={safeT('simulator.title', 'Savings Simulator')}
        >
          {paginatedRenewals.map((renewal) => {
            const isPaused = pausedIds.has(renewal.id);
            const monthlySen = normalizeToMonthlySen(
              renewal.amountSen,
              renewal.cycle,
            );

            return (
              <li
                key={renewal.id}
                className={`flex items-center justify-between gap-3 px-5 py-3 transition-colors ${
                  isPaused ? 'bg-surface-2/60 opacity-60' : 'hover:bg-surface-2/30'
                }`}
              >
                {/* Checkbox trigger & Brand */}
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => togglePaused(renewal.id)}
                    aria-pressed={isPaused}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isPaused
                        ? 'bg-accent border-accent text-surface-0'
                        : 'border-border-2 bg-surface-2 hover:border-border-3 text-transparent'
                    }`}
                    aria-label={`${safeT('simulator.tryPausing', 'Try pausing')} ${renewal.merchantName}`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
                  </button>

                  <BrandLogo merchantName={renewal.merchantName} size={20} />

                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        isPaused
                          ? 'line-through text-text-faint'
                          : 'text-text-primary'
                      }`}
                    >
                      {renewal.merchantName}
                    </p>
                    <p className="text-xs text-text-faint capitalize">
                      {renewal.cycle}
                    </p>
                  </div>
                </div>

                {/* Amount & Status Action */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p
                      className={`font-mono text-sm ${
                        isPaused
                          ? 'line-through text-text-faint'
                          : 'text-text-primary font-medium'
                      }`}
                    >
                      MYR {senToMyr(renewal.amountSen)}
                    </p>
                    {renewal.cycle !== 'monthly' && (
                      <p className="font-mono text-xs text-text-faint">
                        ~MYR {senToMyr(monthlySen)}/mo
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => togglePaused(renewal.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                      isPaused
                        ? 'border-accent-border bg-accent-subtle text-accent'
                        : 'border-border-2 bg-surface-2 text-text-secondary hover:text-text-primary hover:border-border-3'
                    }`}
                  >
                    <PauseCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    {safeT('simulator.tryPausing', 'Try pausing')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Minimalist Micro-Stepper Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-border-1 bg-surface-1 flex items-center justify-between text-xs font-mono text-text-muted">
          <span>
            {safeT('paginationRange', `${startIndex}–${endIndex} of ${renewals.length}`, {
              start: startIndex,
              end: endIndex,
              total: renewals.length,
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
