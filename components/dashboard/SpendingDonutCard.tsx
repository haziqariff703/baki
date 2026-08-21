'use client';

/**
 * Spending by Merchant Card (Dashboard).
 *
 * Uses minimalist three-dot (kebab) menu for View Mode selection (Monthly vs Annualized).
 * Pure deterministic recalculation without floating point bugs (§8.1).
 * Impeccable Ledger-Rule styling with AA contrast compliance.
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { PieChart, Calendar, CalendarRange } from 'lucide-react';
import { SpendingDonut, SpendingDonutLegend } from '@/components/dashboard/SpendingDonut';
import { CardActionMenu } from '@/components/ui/CardActionMenu';
import type { SpendingSlice } from '@/features/dashboard/analytics';
import { senToMyr } from '@/lib/money';

interface SpendingDonutCardProps {
  readonly slices: readonly SpendingSlice[];
  readonly totalMonthlySen: number;
}

type ViewMode = 'monthly' | 'yearly';

export function SpendingDonutCard({
  slices,
  totalMonthlySen,
}: SpendingDonutCardProps) {
  const t = useTranslations('Dashboard');
  const [mode, setMode] = useState<ViewMode>('monthly');

  const modeItems = [
    { value: 'monthly' as ViewMode, label: t('viewMode.monthly'), Icon: Calendar },
    { value: 'yearly' as ViewMode, label: t('viewMode.yearly'), Icon: CalendarRange },
  ];

  const multiplier = mode === 'yearly' ? 12 : 1;
  const displayTotalSen = totalMonthlySen * multiplier;

  const displaySlices = useMemo(() => {
    return slices.map((s) => ({
      ...s,
      monthlySen: s.monthlySen * multiplier,
    }));
  }, [slices, multiplier]);

  const centerLabel =
    mode === 'yearly' ? t('viewMode.centerYearly') : t('viewMode.centerMonthly');

  return (
    <section
      aria-labelledby="spending-heading"
      className="bg-surface-1 border border-border-1 rounded-xl p-5 space-y-4 flex flex-col justify-between"
    >
      <div className="space-y-4">
        {/* Header with Title and Three-Dot Kebab Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-text-faint" aria-hidden="true" />
              <h2
                id="spending-heading"
                className="text-xs font-mono uppercase tracking-wider text-text-faint"
              >
                {t('spendingHeading')}
              </h2>
            </div>
            <p className="text-xs text-text-muted">{t('spendingSub')}</p>
          </div>

          {/* Three-Dot Menu */}
          <CardActionMenu
            title="Projection Mode"
            items={modeItems}
            selectedValue={mode}
            onSelect={setMode}
          />
        </div>

        {/* Donut Chart and Legend */}
        <div className="space-y-4">
          <SpendingDonut
            slices={displaySlices}
            centerLabel={centerLabel}
            centerValueSen={displayTotalSen}
          />
          <SpendingDonutLegend slices={displaySlices} />
        </div>
      </div>
    </section>
  );
}
