'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlarmClock,
  Bell,
  BellRing,
  CalendarClock,
  Smartphone,
  PauseCircle,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
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

const NOTIFICATION_PREF_KEY = 'baki_notification_timings_v1';
const NOTIFICATION_READ_KEY = 'baki_read_notifications_v1';
const PAGE_SIZE = 5;

export function NotificationCentre({ renewals, fromDate }: NotificationCentreProps) {
  const t = useTranslations('Notifications');
  const [page, setPage] = useState(1);

  // Safe translation helper
  const safeT = (key: string, fallback: string, params?: Record<string, string | number>): string => {
    try {
      if (typeof (t as any).has === 'function' && !(t as any).has(key)) {
        return fallback;
      }
      const val = t(key as any, params);
      return val && !val.startsWith('Notifications.') ? val : fallback;
    } catch {
      return fallback;
    }
  };

  const [enabled, setEnabled] = useState<Record<TimingKey, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(NOTIFICATION_PREF_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // Fallback to default
      }
    }
    return {
      '7day': true,
      '1day': true,
      dayof: true,
    };
  });

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(NOTIFICATION_READ_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return new Set(parsed);
        }
      } catch {
        // Fallback
      }
    }
    return new Set();
  });

  function toggleTiming(key: TimingKey): void {
    setEnabled((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(NOTIFICATION_PREF_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
      }
      return next;
    });
  }

  function toggleRead(id: string): void {
    setReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(Array.from(next)));
        } catch {
          // Ignore
        }
      }
      return next;
    });
  }

  function markAllRead(ids: readonly string[]): void {
    setReadIds((prev) => {
      const next = new Set([...prev, ...ids]);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(Array.from(next)));
        } catch {
          // Ignore
        }
      }
      return next;
    });
  }

  const total = computeNext30DayTotalSen(renewals, fromDate);
  const count = countUpcoming(renewals, fromDate);
  const upcoming = sortByNextCharge(
    renewals.filter((r) => {
      const d = daysUntil(r.nextChargeDate, fromDate);
      return d !== null && d >= 0 && d <= 30;
    }),
  );

  const totalPages = Math.max(1, Math.ceil(upcoming.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedUpcoming = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return upcoming.slice(start, start + PAGE_SIZE);
  }, [upcoming, currentPage]);

  const startIndex = upcoming.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(currentPage * PAGE_SIZE, upcoming.length);

  const upcomingIds = upcoming.map((r) => `${r.id}-${r.nextChargeDate}`);
  const hasUnread = upcomingIds.some((id) => !readIds.has(id));

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
              {safeT('preferencesHeading', 'Reminder timing')}
            </h2>
            <p className="text-xs text-text-muted">{safeT('preferencesSub', 'Each reminder fires at most once per renewal.')}</p>
          </div>
          <ul className="divide-y divide-border-1 border border-border-1 rounded-xl bg-surface-1">
            {TIMINGS.map(({ key, labelKey }) => (
              <li key={key} className="px-5 py-4 flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-text-primary">{safeT(labelKey, key)}</p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled[key]}
                  aria-label={safeT(labelKey, key)}
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
              {safeT('inAppNote', 'Reminders are in-app only for now — email is coming later.')}
            </p>
            <p className="text-xs text-text-faint flex items-start gap-1.5">
              <PauseCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              {safeT('pausedNote', 'Paused, cancelled, or archived subscriptions never generate reminders.')}
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
              {safeT('timelineHeading', 'Reminder timeline')}
            </h2>
            <p className="text-xs text-text-muted">{safeT('timelineSub', 'When each reminder fires relative to the charge date')}</p>
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
              {safeT('timelineEmpty', 'No renewals due in the next 7 days.')}
            </p>
          )}
        </section>
      </div>

      {/* Right Column: Upcoming Reminders Ledger */}
      <div className="lg:col-span-7">
        <section aria-labelledby="upcoming-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h2
                id="upcoming-heading"
                className="text-xs font-mono uppercase tracking-wider text-text-faint"
              >
                {safeT('upcomingHeading', 'Upcoming renewals')}
              </h2>
              <p className="text-xs text-text-muted">{safeT('upcomingSub', 'Charges due in the next 30 days.')}</p>
            </div>

            {hasUnread && (
              <button
                type="button"
                onClick={() => markAllRead(upcomingIds)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-2 bg-surface-2 hover:bg-surface-3 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <CheckCheck className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                <span>{safeT('markAllRead', 'Mark all as read')}</span>
              </button>
            )}
          </div>

          {/* Summary row — Ledger Rule: label left, single amber tick on the figure */}
          <div className="bg-surface-1 border border-border-1 rounded-xl px-5 py-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-text-secondary">{safeT('next7Days', 'Due in the next 30 days')}</span>
              <span
                className="font-mono text-xl font-medium text-text-primary border-l-2 border-accent pl-3"
                aria-label={safeT('amountLabel', `Amount ${senToMyr(total)} ringgit`, { amount: senToMyr(total) })}
              >
                MYR {senToMyr(total)}
              </span>
            </div>
            <p className="text-xs text-text-faint mt-1">
              {safeT('acrossRenewals', `${count} renewals`, { count })}
            </p>
          </div>

          {/* List + Minimalist Pagination Wrapper */}
          <div className="border border-border-1 rounded-xl bg-surface-1 overflow-hidden">
            <ul className="divide-y divide-border-1">
              {upcoming.length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-text-muted">{safeT('empty', 'No renewals due in the next 30 days.')}</li>
              )}
              {paginatedUpcoming.map((r) => {
                const notifId = `${r.id}-${r.nextChargeDate}`;
                const isRead = readIds.has(notifId);
                const d = daysUntil(r.nextChargeDate, fromDate);
                const badge = reminderBadge(d);
                const Icon = BADGE_ICON[badge.kind];
                const dueLabel =
                  d === null
                    ? ''
                    : d === 0
                      ? safeT('dueToday', 'Due today')
                      : d === 1
                        ? safeT('dueTomorrow', 'Due tomorrow')
                        : safeT('dueIn', `Due in ${d} days`, { days: d });
                return (
                  <li
                    key={notifId}
                    className={`px-5 py-3.5 flex items-center justify-between gap-4 transition-colors ${
                      isRead ? 'opacity-65 bg-surface-1/50' : 'bg-surface-1 hover:bg-surface-2/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleRead(notifId)}
                        title={isRead ? safeT('markUnread', 'Mark as unread') : safeT('markRead', 'Mark as read')}
                        aria-label={isRead ? safeT('markUnread', 'Mark as unread') : safeT('markRead', 'Mark as read')}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                          isRead
                            ? 'bg-status-emerald-surface text-status-emerald-text border-status-emerald-border hover:opacity-80'
                            : 'bg-surface-2 text-text-faint border-border-2 hover:border-accent hover:text-accent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>

                      <BrandLogo merchantName={r.merchantName} size={20} />
                      <span className="font-mono text-xs text-text-faint w-20 shrink-0">
                        {toDatePart(r.nextChargeDate)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary truncate font-medium">{r.merchantName}</p>
                        <p className="text-xs text-text-muted">{dueLabel}</p>
                      </div>

                      {!isRead && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium shrink-0 ${BADGE_CLASS[badge.kind]}`}
                        >
                          <Icon className="w-3 h-3" aria-hidden="true" />
                          {safeT(`badge.${badge.kind}`, badge.kind)}
                        </span>
                      )}
                      {isRead && (
                        <span className="text-[11px] font-mono text-status-emerald-text/80 px-1.5 py-0.5 rounded bg-status-emerald-surface/40 border border-status-emerald-border/40 shrink-0">
                          {safeT('acknowledged', 'Acknowledged')}
                        </span>
                      )}
                    </div>
                    <span
                      className="font-mono text-sm text-text-primary shrink-0 font-medium"
                      aria-label={safeT('amountLabel', `Amount ${senToMyr(r.amountSen)} ringgit`, { amount: senToMyr(r.amountSen) })}
                    >
                      MYR {senToMyr(r.amountSen)}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Minimalist Micro-Stepper Pagination Footer */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-border-1 bg-surface-1 flex items-center justify-between text-xs font-mono text-text-muted">
                <span>
                  {safeT('paginationRange', `${startIndex}–${endIndex} of ${upcoming.length}`, {
                    start: startIndex,
                    end: endIndex,
                    total: upcoming.length,
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
          </div>
        </section>
      </div>
    </div>
  );
}
