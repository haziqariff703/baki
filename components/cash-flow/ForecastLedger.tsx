'use client';

import { useTranslations } from 'next-intl';
import {
  AlarmClock,
  BellRing,
  Bell,
  CalendarClock,
  type LucideIcon,
} from 'lucide-react';
import {
  syntheticRenewals,
  syntheticAvailableBalanceSen,
  SYNTHETIC_TODAY,
} from '@/tests/fixtures/renewals';
import {
  computeCashFlowSummary,
  computeNext30DayTotalSen,
  countUpcoming,
  sortByNextCharge,
  daysUntil,
  reminderBadge,
  type UpcomingRenewal,
  type CashFlowSummary,
} from '@/features/cash-flow';
import { senToMyr } from '@/lib/money';
import { toDatePart } from '@/lib/dates';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';
import { ForecastVisuals } from '@/components/cash-flow/ForecastVisuals';
import { SavingsSimulator } from '@/components/cash-flow/SavingsSimulator';
import { PaydayAnchorStrip } from '@/components/cash-flow/PaydayAnchorStrip';

interface BadgeConfig {
  readonly Icon: LucideIcon;
  readonly label: string;
  readonly className: string;
}

export interface ForecastLedgerProps {
  renewals: readonly UpcomingRenewal[];
  availableBalanceSen: number;
}

/**
 * M4 — Commitment Forecast Ledger (interactive client component).
 *
 * AGENTS.md §2.1: all financial values are computed deterministically from
 * the same fixtures. §2.2: no automatic action is taken — this is purely a
 * read-only forecast. §16: badges pair icon + text, never color alone.
 *
 * Ledger Rule: label left, hairline rule, mono value right. Exactly ONE amber
 * left-tick per view — the next-30-day total gets it (the single most
 * important figure for a user deciding what they can afford).
 */
export function ForecastLedger({ renewals, availableBalanceSen }: ForecastLedgerProps) {
  const t = useTranslations('CashFlow');

  const summary: CashFlowSummary = computeCashFlowSummary(
    renewals,
    availableBalanceSen,
    SYNTHETIC_TODAY,
  );
  const next30TotalSen = computeNext30DayTotalSen(renewals, SYNTHETIC_TODAY);
  const next30Count = countUpcoming(renewals, SYNTHETIC_TODAY);
  const sorted = sortByNextCharge(renewals);

  const badgeConfig: Record<string, BadgeConfig> = {
    day_of: {
      Icon: AlarmClock,
      label: t('badge.day_of'),
      className:
        'text-status-rose-text border-status-rose-border bg-status-rose-surface',
    },
    one_day: {
      Icon: BellRing,
      label: t('badge.one_day'),
      className:
        'text-status-amber-text border-status-amber-border bg-status-amber-surface',
    },
    seven_day: {
      Icon: Bell,
      label: t('badge.seven_day'),
      className:
        'text-status-blue-text border-status-blue-border bg-status-blue-surface',
    },
    upcoming: {
      Icon: CalendarClock,
      label: t('badge.upcoming'),
      className: 'text-text-muted border-border-2 bg-surface-2',
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* ── Left Column: Summary + Savings Simulator ──────────────────────── */}
      <div className="space-y-6">
        {/* Summary card: Ledger Rule rows */}
        <section
          aria-labelledby="summary-heading"
          className="bg-surface-1 border border-border-1 rounded-xl"
        >
          <h2 id="summary-heading" className="sr-only">
            {t('summaryHeading')}
          </h2>
          <dl className="divide-y divide-border-1">
            {/* Monthly commitment */}
            <div className="flex items-baseline justify-between px-5 py-4">
              <dt className="text-sm text-text-secondary">{t('monthlyCommitment')}</dt>
              <dd className="font-mono text-sm font-medium text-text-primary">
                MYR {senToMyr(summary.monthlyCommitmentSen)}
              </dd>
            </div>

            {/* Annualised total */}
            <div className="flex items-baseline justify-between px-5 py-4">
              <dt className="text-sm text-text-secondary">{t('annualisedTotal')}</dt>
              <dd className="font-mono text-sm text-text-primary">
                MYR {senToMyr(summary.annualisedTotalSen)}
              </dd>
            </div>

            {/* Safe to spend */}
            <div className="flex items-baseline justify-between px-5 py-4">
              <dt className="text-sm text-text-secondary">{t('safeToSpend')}</dt>
              <dd className="font-mono text-sm text-text-primary">
                MYR {senToMyr(summary.safeToSpendSen)}
              </dd>
            </div>

            {/* Upcoming count */}
            <div className="flex items-baseline justify-between px-5 py-4">
              <dt className="text-sm text-text-secondary">{t('upcomingCount', { count: summary.upcomingCount })}</dt>
              <dd className="font-mono text-sm text-text-primary">
                {summary.upcomingCount}
              </dd>
            </div>
          </dl>
        </section>

        {/* Payday & Income Anchor Strip */}
        <PaydayAnchorStrip
          renewals={sorted}
          fromDate={SYNTHETIC_TODAY}
        />

        {/* Savings Simulator ("What-If" Sandbox) */}
        <SavingsSimulator
          renewals={sorted}
          availableBalanceSen={availableBalanceSen}
        />
      </div>

      {/* ── Right Column: Next-30-day forecast card ──────────────────────── */}
      <section
        aria-labelledby="forecast-heading"
        className="bg-surface-1 border border-border-1 rounded-xl"
      >
        <div className="px-5 pt-5 pb-4 border-b border-border-1">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 id="forecast-heading" className="text-xs font-mono uppercase tracking-wider text-text-faint">
                {t('forecastHeading')}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">{t('forecastSub')}</p>
            </div>
            <span className="font-mono text-xs uppercase tracking-wider text-text-faint shrink-0">
              {t('ruleVersionStamp')}
            </span>
          </div>
        </div>

        {/* 30-day total — the single most important figure, amber tick */}
        <div className="flex items-baseline justify-between px-5 py-4 border-b border-border-1">
          <span className="text-sm text-text-secondary">{t('next30Days')}</span>
          <span
            className="font-mono text-lg font-medium text-text-primary border-l-2 border-accent pl-3"
            aria-label={t('amountLabel', { amount: senToMyr(next30TotalSen) })}
          >
            MYR {senToMyr(next30TotalSen)}
          </span>
        </div>

        {/* Forecast visuals: cumulative sparkline + monthly-normalised bars */}
        {next30Count > 0 && (
          <div className="px-5 py-5 border-b border-border-1">
            <ForecastVisuals
              renewals={sorted}
              fromDate={SYNTHETIC_TODAY}
              totalSen={next30TotalSen}
            />
          </div>
        )}

        {/* Renewal list */}
        {next30Count === 0 ? (
          <p className="px-5 py-6 text-sm text-text-muted">{t('empty')}</p>
        ) : (
          <ul className="divide-y divide-border-1" aria-label={t('forecastHeading')}>
            {sorted.map((renewal: UpcomingRenewal) => {
              const days = daysUntil(renewal.nextChargeDate, SYNTHETIC_TODAY);
              const badge = reminderBadge(days);
              const cfg = badgeConfig[badge.kind];
              const { Icon } = cfg;
              return (
                <li
                  key={renewal.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  {/* Date + merchant */}
                  <div className="flex items-baseline gap-3 min-w-0">
                    <BrandLogo merchantName={renewal.merchantName} size={18} />
                    <span className="font-mono text-xs text-text-faint w-20 shrink-0">
                      {toDatePart(renewal.nextChargeDate)}
                    </span>
                    <span className="text-sm text-text-secondary truncate">
                      {renewal.merchantName}
                    </span>
                  </div>

                  {/* Badge + amount */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 rounded-xl border px-2 py-0.5 text-xs font-medium ${cfg.className}`}
                      aria-label={t('dueIn', { days: days ?? 0 })}
                    >
                      <Icon className="w-3 h-3" aria-hidden="true" />
                      {cfg.label}
                    </span>
                    <span className="font-mono text-sm text-text-primary">
                      MYR {senToMyr(renewal.amountSen)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}


