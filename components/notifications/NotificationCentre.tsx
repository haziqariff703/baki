'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlarmClock, Bell, BellRing, CalendarClock, Smartphone, PauseCircle } from 'lucide-react';
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
import { ReminderTimeline } from '@/components/notifications/ReminderTimeline';

interface NotificationCentreProps {
  readonly renewals: readonly UpcomingRenewal[];
  readonly fromDate: string;
}

/** Reminder timing keys, matching business rules §4 (7d / 1d / day-of). */
type TimingKey = '7day' | '1day' | 'dayof';

const TIMINGS: readonly { key: TimingKey; labelKey: string }[] = [
  { key: '7day', labelKey: 'timing.7day' },
  { key: '1day', labelKey: 'timing.1day' },
  { key: 'dayof', labelKey: 'timing.dayof' },
] as const;

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
 * M4 — Notifications / Reminder Centre (AGENTS.md §1, business rules §4).
 * Reminder timings are independently configurable; v0.1 is in-app only.
 * Badges are icon + text, never color alone (§16).
 */
export function NotificationCentre({ renewals, fromDate }: NotificationCentreProps) {
  const t = useTranslations('Notifications');

  const [enabled, setEnabled] = useState<Record<TimingKey, boolean>>({
    '7day': true,
    '1day': true,
    dayof: true,
  });

  function toggleTiming(key: TimingKey): void {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const total = computeNext30DayTotalSen(renewals, fromDate);
  const count = countUpcoming(renewals, fromDate);
  const upcoming = sortByNextCharge(
    renewals.filter((r) => {
      const d = daysUntil(r.nextChargeDate, fromDate);
      return d !== null && d >= 0 && d <= 30;
    }),
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Preferences & Timeline Strip */}
      <div className="lg:col-span-5 space-y-6">
        {/* Reminder timing preferences */}
        <section aria-labelledby="preferences-heading" className="space-y-3">
          <div className="space-y-1">
            <h2
              id="preferences-heading"
              className="text-xs font-mono uppercase tracking-wider text-text-faint"
            >
              {t('preferencesHeading')}
            </h2>
            <p className="text-xs text-text-muted">{t('preferencesSub')}</p>
          </div>
          <ul className="divide-y divide-border-1 border border-border-1 rounded-xl bg-surface-1">
            {TIMINGS.map(({ key, labelKey }) => (
              <li key={key} className="px-5 py-4 flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-text-primary">{t(labelKey)}</p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled[key]}
                  aria-label={t(labelKey)}
                  onClick={() => toggleTiming(key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 ${
                    enabled[key]
                      ? 'bg-status-emerald-surface border-status-emerald-border'
                      : 'bg-surface-2 border-border-2'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                      enabled[key] ? 'translate-x-6 bg-status-emerald-text' : 'translate-x-1 bg-text-faint'
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>
          <div className="space-y-1.5">
            <p className="text-xs text-text-faint flex items-start gap-1.5">
              <Smartphone className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              {t('inAppNote')}
            </p>
            <p className="text-xs text-text-faint flex items-start gap-1.5">
              <PauseCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              {t('pausedNote')}
            </p>
          </div>
        </section>

        {/* Reminder timeline strip — 7d / 1d / day-of markers tied to the toggles */}
        <section aria-labelledby="timeline-heading" className="space-y-3">
          <div className="space-y-1">
            <h2
              id="timeline-heading"
              className="text-xs font-mono uppercase tracking-wider text-text-faint"
            >
              {t('timelineHeading')}
            </h2>
            <p className="text-xs text-text-muted">{t('timelineSub')}</p>
          </div>
          <ReminderTimeline
            renewals={renewals}
            fromDate={fromDate}
            enabled={enabled}
          />
          {/* Fallback when no renewal lands inside the 7-day window */}
          {renewals.every((r) => {
            const d = daysUntil(r.nextChargeDate, fromDate);
            return d === null || d < 0 || d > 7;
          }) && (
            <p className="bg-surface-1 border border-border-1 rounded-xl px-5 py-4 text-sm text-text-muted">
              {t('timelineEmpty')}
            </p>
          )}
        </section>
      </div>

      {/* Right Column: Upcoming Reminders Ledger */}
      <div className="lg:col-span-7">
        <section aria-labelledby="upcoming-heading" className="space-y-3">
          <div className="space-y-1">
            <h2
              id="upcoming-heading"
              className="text-xs font-mono uppercase tracking-wider text-text-faint"
            >
              {t('upcomingHeading')}
            </h2>
            <p className="text-xs text-text-muted">{t('upcomingSub')}</p>
          </div>

          {/* Summary row — Ledger Rule: label left, single amber tick on the figure */}
          <div className="bg-surface-1 border border-border-1 rounded-xl px-5 py-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-text-secondary">{t('next7Days')}</span>
              <span
                className="font-mono text-xl font-medium text-text-primary border-l-2 border-accent pl-3"
                aria-label={t('amountLabel', { amount: senToMyr(total) })}
              >
                MYR {senToMyr(total)}
              </span>
            </div>
            <p className="text-xs text-text-faint mt-1">
              {t('acrossRenewals', { count })}
            </p>
          </div>

          <ul className="divide-y divide-border-1 border border-border-1 rounded-xl bg-surface-1">
            {upcoming.length === 0 && (
              <li className="px-5 py-6 text-center text-sm text-text-muted">{t('empty')}</li>
            )}
            {upcoming.map((r) => {
              const d = daysUntil(r.nextChargeDate, fromDate);
              const badge = reminderBadge(d);
              const Icon = BADGE_ICON[badge.kind];
              const dueLabel =
                d === null
                  ? ''
                  : d === 0
                    ? t('dueToday')
                    : d === 1
                      ? t('dueTomorrow')
                      : t('dueIn', { days: d });
              return (
                <li key={r.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <BrandLogo merchantName={r.merchantName} size={20} />
                    <span className="font-mono text-xs text-text-faint w-20 shrink-0">
                      {toDatePart(r.nextChargeDate)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-text-primary truncate">{r.merchantName}</p>
                      <p className="text-xs text-text-muted">{dueLabel}</p>
                    </div>
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
        </section>
      </div>
    </div>
  );
}
