'use client';

/**
 * Renewal Forecast Card (Dashboard).
 *
 * Uses minimalist three-dot (kebab) menu for time-horizon selection (7, 30, 60, 90 days),
 * summary metrics for the chosen window, and plain-language countdown labels.
 * Impeccable Ledger-Rule styling with AA contrast compliance.
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarClock, Clock } from 'lucide-react';
import { renewalForecast, type UpcomingRenewal } from '@/features/dashboard/analytics';
import { CardActionMenu } from '@/components/ui/CardActionMenu';
import { senToMyr } from '@/lib/money';
import { toDatePart } from '@/lib/dates';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';

interface RenewalForecastCardProps {
  readonly renewals: readonly UpcomingRenewal[];
  readonly fromDate: string;
}

type HorizonOption = 7 | 30 | 60 | 90;

export function RenewalForecastCard({ renewals, fromDate }: RenewalForecastCardProps) {
  const t = useTranslations('Dashboard');
  const [horizon, setHorizon] = useState<HorizonOption>(30);

  const horizonItems = [
    { value: 7 as HorizonOption, label: t('forecast.window7') },
    { value: 30 as HorizonOption, label: t('forecast.window30') },
    { value: 60 as HorizonOption, label: t('forecast.window60') },
    { value: 90 as HorizonOption, label: t('forecast.window90') },
  ];

  const forecastRows = useMemo(() => {
    return renewalForecast(renewals, fromDate, horizon);
  }, [renewals, fromDate, horizon]);

  const totalInWindowSen = useMemo(() => {
    return forecastRows.reduce((acc, row) => acc + row.amountSen, 0);
  }, [forecastRows]);

  return (
    <section
      aria-labelledby="forecast-heading"
      className="bg-surface-1 border border-border-1 rounded-xl p-5 space-y-4 flex flex-col justify-between"
    >
      <div className="space-y-3">
        {/* Header with Title and Three-Dot Kebab Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-text-faint" aria-hidden="true" />
              <h2
                id="forecast-heading"
                className="text-xs font-mono uppercase tracking-wider text-text-faint"
              >
                {t('forecastHeading')}
              </h2>
            </div>
            <p className="text-xs text-text-muted">{t('forecastSub')}</p>
          </div>

          {/* Three-Dot Menu */}
          <CardActionMenu
            title="Time Horizon"
            items={horizonItems}
            selectedValue={horizon}
            onSelect={setHorizon}
          />
        </div>

        {/* Summary Metric for Chosen Window */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-2/60 border border-border-1 text-xs">
          <span className="text-text-muted font-medium">
            {t('forecast.totalInWindow', {
              amount: senToMyr(totalInWindowSen),
              count: forecastRows.length,
            })}
          </span>
          <span className="font-mono text-xs font-semibold text-text-primary">
            MYR {senToMyr(totalInWindowSen)}
          </span>
        </div>

        {/* Forecast Rows List */}
        {forecastRows.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-1">
            <Clock className="w-5 h-5 text-text-faint" aria-hidden="true" />
            <p className="text-xs text-text-muted">{t('forecast.emptyNotice')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border-1 max-h-[360px] overflow-y-auto pr-1">
            {forecastRows.map((row) => (
              <li key={row.id} className="flex items-baseline justify-between gap-3 py-2.5">
                <span className="flex items-center gap-2 min-w-0">
                  <BrandLogo merchantName={row.merchantName} size={20} />
                  <span className="font-mono text-xs text-text-faint w-20 shrink-0">
                    {toDatePart(row.nextChargeDate)}
                  </span>
                  <span className="text-sm text-text-secondary truncate">
                    {row.merchantName}
                  </span>
                </span>
                <span className="flex items-baseline gap-2 shrink-0">
                  <span className="font-mono text-xs text-text-faint">
                    {row.days === 0
                      ? t('forecastToday')
                      : row.days === 1
                        ? t('forecastTomorrow')
                        : t('forecastIn', { days: row.days })}
                  </span>
                  <span className="font-mono text-xs text-text-primary font-medium">
                    MYR {senToMyr(row.amountSen)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
