'use client';

/**
 * Upcoming Renewals Card (Cash-Flow Page).
 *
 * Dedicated card displaying scheduled subscription commitments
 * sorted by next charge date with calendar dates, reminder badges,
 * cumulative 30-day trajectory sparkline, and minimalist pagination.
 * Impeccable Ledger-Rule styling with AA contrast compliance.
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  CalendarClock,
  AlarmClock,
  BellRing,
  Bell,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';
import { CumulativeCommitmentChart } from '@/components/cash-flow/ForecastVisuals';
import {
  daysUntil,
  reminderBadge,
  type UpcomingRenewal,
} from '@/features/cash-flow';
import { senToMyr, type MoneyInSen } from '@/lib/money';
import { toDatePart } from '@/lib/dates';

interface BadgeConfig {
  readonly Icon: LucideIcon;
  readonly label: string;
  readonly className: string;
}

interface UpcomingRenewalsCardProps {
  readonly renewals: readonly UpcomingRenewal[];
  readonly fromDate: string;
  readonly totalSen: MoneyInSen;
}

const PAGE_SIZE = 5;

export function UpcomingRenewalsCard({
  renewals,
  fromDate,
  totalSen,
}: UpcomingRenewalsCardProps) {
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

  const badgeConfig: Record<string, BadgeConfig> = {
    day_of: {
      Icon: AlarmClock,
      label: safeT('badge.day_of', 'Today'),
      className: 'text-status-rose-text border-status-rose-border bg-status-rose-surface',
    },
    one_day: {
      Icon: BellRing,
      label: safeT('badge.one_day', 'Tomorrow'),
      className: 'text-status-amber-text border-status-amber-border bg-status-amber-surface',
    },
    seven_day: {
      Icon: Bell,
      label: safeT('badge.seven_day', '7 days'),
      className: 'text-status-blue-text border-status-blue-border bg-status-blue-surface',
    },
    upcoming: {
      Icon: CalendarClock,
      label: safeT('badge.upcoming', 'Upcoming'),
      className: 'text-text-muted border-border-2 bg-surface-2',
    },
  };

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
      aria-labelledby="upcoming-renewals-heading"
      className="bg-surface-1 border border-border-1 rounded-xl flex flex-col justify-between overflow-hidden"
    >
      <div>
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border-1">
          <div className="flex items-baseline justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-text-faint" aria-hidden="true" />
                <h2
                  id="upcoming-renewals-heading"
                  className="text-xs font-mono uppercase tracking-wider text-text-faint"
                >
                  {safeT('upcomingCardTitle', 'Upcoming Renewals')}
                </h2>
              </div>
              <p className="text-xs text-text-muted">
                {safeT('upcomingCardSub', 'Scheduled charges sorted by renewal date')}
              </p>
            </div>

            <span className="font-mono text-xs uppercase tracking-wider text-text-faint shrink-0">
              {safeT('ruleVersionStamp', 'cashFlowRuleV1 · deterministic')}
            </span>
          </div>
        </div>

        {/* 30-Day Window Total Banner */}
        <div className="flex items-baseline justify-between px-5 py-4 border-b border-border-1 bg-surface-1/50">
          <span className="text-sm text-text-secondary">
            {safeT('next30Days', 'Total due in next 30 days')}
          </span>
          <span
            className="font-mono text-lg font-semibold text-text-primary border-l-2 border-accent pl-3"
            aria-label={safeT('amountLabel', `${senToMyr(totalSen)} ringgit`, {
              amount: senToMyr(totalSen),
            })}
          >
            MYR {senToMyr(totalSen)}
          </span>
        </div>

        {/* 30-Day Cumulative Trajectory Sparkline */}
        {renewals.length > 0 && (
          <div className="px-5 py-4 border-b border-border-1">
            <p className="text-xs text-text-muted mb-2">
              {safeT('cumulativeSub', 'Cumulative commitments over the next 30 days')}
            </p>
            <CumulativeCommitmentChart
              renewals={renewals}
              fromDate={fromDate}
              ariaLabel={safeT(
                'cumulativeAria',
                `Cumulative commitments reaching MYR ${senToMyr(totalSen)} over 30 days`,
                { amount: senToMyr(totalSen) },
              )}
            />
          </div>
        )}

        {/* Scheduled List */}
        {renewals.length === 0 ? (
          <p className="px-5 py-6 text-sm text-text-muted">
            {safeT('empty', 'No renewals due in the next 30 days.')}
          </p>
        ) : (
          <ul
            className="divide-y divide-border-1"
            aria-label={safeT('upcomingCardTitle', 'Upcoming Renewals')}
          >
            {paginatedRenewals.map((renewal) => {
              const days = daysUntil(renewal.nextChargeDate, fromDate);
              const badge = reminderBadge(days);
              const cfg = badgeConfig[badge.kind] ?? badgeConfig.upcoming;
              const { Icon } = cfg;

              return (
                <li
                  key={renewal.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2/30 transition-colors"
                >
                  {/* Date + Logo + Merchant */}
                  <div className="flex items-baseline gap-3 min-w-0">
                    <BrandLogo merchantName={renewal.merchantName} size={18} />
                    <span className="font-mono text-xs text-text-faint w-20 shrink-0">
                      {toDatePart(renewal.nextChargeDate)}
                    </span>
                    <span className="text-sm text-text-secondary truncate font-medium">
                      {renewal.merchantName}
                    </span>
                  </div>

                  {/* Badge + Amount */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium font-mono ${cfg.className}`}
                      aria-label={safeT('dueIn', `due in ${days ?? 0} days`, {
                        days: days ?? 0,
                      })}
                    >
                      <Icon className="w-3 h-3" aria-hidden="true" />
                      {cfg.label}
                    </span>
                    <span className="font-mono text-sm font-semibold text-text-primary">
                      MYR {senToMyr(renewal.amountSen)}
                    </span>
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
