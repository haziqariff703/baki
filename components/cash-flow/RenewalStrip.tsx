'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, BellRing, AlarmClock, CalendarClock, ChevronDown } from 'lucide-react';
import {
  computeNext30DayTotalSen,
  countUpcoming,
  daysUntil,
  reminderBadge,
  sortByNextCharge,
  type UpcomingRenewal,
} from '@/features/cash-flow';
import { toDatePart } from '@/lib/dates';
import { senToMyr } from '@/lib/money';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';

interface RenewalStripProps {
  readonly renewals: readonly UpcomingRenewal[];
  readonly fromDate: string;
}

const BADGE_ICON = {
  day_of: AlarmClock,
  one_day: BellRing,
  seven_day: Bell,
  upcoming: CalendarClock,
} as const;

const BADGE_CLASS = {
  day_of: 'text-status-rose-text border-status-rose-border bg-status-rose-surface',
  one_day: 'text-status-amber-text border-status-amber-border bg-status-amber-surface',
  seven_day: 'text-status-blue-text border-status-blue-border bg-status-blue-surface',
  upcoming: 'text-text-muted border-border-2 bg-surface-2',
} as const;

/**
 * M4 — Renewal reminder strip (AGENTS.md §1, features/notifications).
 * Header shows the next-30-day total with the single amber annotation tick;
 * expands into a dated ledger. Badges are icon + text, never color alone (§16).
 */
export function RenewalStrip({ renewals, fromDate }: RenewalStripProps) {
  const t = useTranslations('Dashboard');
  const [open, setOpen] = useState(true);

  const total = computeNext30DayTotalSen(renewals, fromDate);
  const count = countUpcoming(renewals, fromDate);
  const upcoming = sortByNextCharge(
    renewals.filter((r) => {
      const d = daysUntil(r.nextChargeDate, fromDate);
      return d !== null && d >= 0 && d <= 30;
    }),
  );

  return (
    <section
      aria-labelledby="renewal-strip-heading"
      className="bg-surface-1 border border-border-1 rounded-xl overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="renewal-ledger"
        id="renewal-strip-heading"
        className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
      >
        <span className="text-sm text-text-secondary text-left">
          {t('next30Days')}
          <span className="block text-xs text-text-faint mt-0.5">
            {t('acrossRenewals', { count })}
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span
            className="font-mono text-xl font-medium text-text-primary border-l-2 border-accent pl-3"
            aria-label={t('next30TotalLabel', { amount: senToMyr(total) })}
          >
            MYR {senToMyr(total)}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-text-faint transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {open && (
        <ul id="renewal-ledger" className="divide-y divide-border-1 border-t border-border-1">
          {upcoming.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-text-muted">{t('noUpcoming')}</li>
          )}
          {upcoming.map((r) => {
            const d = daysUntil(r.nextChargeDate, fromDate);
            const badge = reminderBadge(d);
            const Icon = BADGE_ICON[badge.kind];
            return (
              <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <BrandLogo merchantName={r.merchantName} size={20} />
                  <span className="font-mono text-xs text-text-faint w-20 shrink-0">
                    {toDatePart(r.nextChargeDate)}
                  </span>
                  <span className="text-sm text-text-primary truncate">{r.merchantName}</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium shrink-0 ${BADGE_CLASS[badge.kind]}`}
                  >
                    <Icon className="w-3 h-3" aria-hidden="true" />
                    {t(`badge.${badge.kind}`)}
                  </span>
                </div>
                <span
                  className="font-mono text-sm text-text-primary shrink-0"
                  aria-label={t('amountLabel', { amount: senToMyr(r.amountSen) })}
                >
                  MYR {senToMyr(r.amountSen)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
