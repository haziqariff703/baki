'use client';

import { useTranslations } from 'next-intl';
import { AlarmClock, Bell, BellRing } from 'lucide-react';
import { daysUntil, type UpcomingRenewal } from '@/features/cash-flow';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';

/**
 * Notifications — 7d / 1d / day-of reminder timeline strip.
 *
 * For each upcoming renewal, renders a horizontal 7-day window (today → +7d)
 * with three timing markers (7d before, 1d before, day-of) positioned by
 * whole days until the charge. Markers reflect the enabled/disabled toggles:
 * an enabled timing shows a filled dot + icon; a disabled timing is hollow
 * and muted. Icon + text always accompany position — never color alone (§16).
 *
 * Pure CSS, deterministic (no Date.now()/Math.random()), hydration-safe.
 * Neutral fills — no amber accent (the single amber annotation on this view
 * is the next-30-day total in NotificationCentre).
 */

type TimingKey = '7day' | '1day' | 'dayof';

interface ReminderTimelineProps {
  readonly renewals: readonly UpcomingRenewal[];
  readonly fromDate: string;
  readonly enabled: Record<TimingKey, boolean>;
}

const WINDOW_DAYS = 7;

const TIMING_ICON = {
  '7day': Bell,
  '1day': BellRing,
  dayof: AlarmClock,
} as const;

export function ReminderTimeline({
  renewals,
  fromDate,
  enabled,
}: ReminderTimelineProps) {
  const t = useTranslations('Notifications');

  const upcoming = renewals
    .map((r) => ({ r, days: daysUntil(r.nextChargeDate, fromDate) }))
    .filter(
      (x): x is { r: UpcomingRenewal; days: number } =>
        x.days !== null && x.days >= 0 && x.days <= WINDOW_DAYS,
    )
    .sort((a, b) => a.days - b.days);

  if (upcoming.length === 0) return null;

  return (
    <ul className="space-y-3" aria-label={t('timelineAria')}>
      {upcoming.map(({ r, days }) => {
        // Position of the charge within the 0..7 window (0 = today, 7 = +7d).
        const chargePos = (days / WINDOW_DAYS) * 100;
        return (
          <li
            key={r.id}
            className="bg-surface-1 border border-border-1 rounded-xl px-5 py-4"
          >
            <div className="flex items-center gap-2 justify-between mb-3">
              <span className="flex items-center gap-2 min-w-0">
                <BrandLogo merchantName={r.merchantName} size={20} />
                <span className="text-sm text-text-primary truncate">
                  {r.merchantName}
                </span>
              </span>
              <span className="font-mono text-xs text-text-faint shrink-0">
                {days === 0
                  ? t('dueToday')
                  : days === 1
                    ? t('dueTomorrow')
                    : t('dueIn', { days })}
              </span>
            </div>

            {/* 7-day track */}
            <div className="relative h-8">
              {/* baseline */}
              <div
                aria-hidden="true"
                className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border-2"
              />
              {/* charge marker */}
              <div
                aria-hidden="true"
                className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-text-secondary"
                style={{ left: `calc(${chargePos}% - 5px)` }}
              />
              {/* timing markers: 7d / 1d / day-of */}
              {(['7day', '1day', 'dayof'] as const).map((key) => {
                const offset = key === '7day' ? 7 : key === '1day' ? 1 : 0;
                const markerDay = days - offset;
                if (markerDay < 0 || markerDay > WINDOW_DAYS) return null;
                const pos = (markerDay / WINDOW_DAYS) * 100;
                const on = enabled[key];
                const Icon = TIMING_ICON[key];
                return (
                  <div
                    key={key}
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{ left: `calc(${pos}% - 8px)` }}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        on
                          ? 'border-text-secondary bg-surface-2 text-text-primary'
                          : 'border-border-2 bg-surface-1 text-text-faint'
                      }`}
                      role="img"
                      aria-label={t('timingMarkerAria', {
                        timing: t(`timing.${key}`),
                        state: on ? t('timingOn') : t('timingOff'),
                      })}
                    >
                      <Icon className="h-2.5 w-2.5" aria-hidden="true" />
                    </span>
                  </div>
                );
              })}
            </div>

            {/* axis labels: today → +7d, mono */}
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-mono text-xs text-text-faint">
                {t('timelineToday')}
              </span>
              <span className="font-mono text-xs text-text-faint">
                +{WINDOW_DAYS}d
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
