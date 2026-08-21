'use client';

/**
 * Category Spending Breakdown component (Dashboard Overview).
 *
 * Implements deterministic lifestyle category aggregation (Entertainment,
 * Software & AI, Telco, Fitness, Utilities).
 * Includes three-dot menu for View Mode selection (Monthly Normalized vs Annualized Projection).
 * DESIGN.md tokens: Segmented distribution bar, mono figures, AA-contrast.
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Layers, Calendar, CalendarRange } from 'lucide-react';
import { CardActionMenu } from '@/components/ui/CardActionMenu';
import type { CategorySpendingSlice } from '@/features/dashboard/analytics';
import { senToMyr } from '@/lib/money';

interface CategoryBreakdownProps {
  readonly categories: readonly CategorySpendingSlice[];
  readonly totalMonthlySen: number;
}

type ViewMode = 'monthly' | 'yearly';

export function CategoryBreakdown({
  categories,
  totalMonthlySen,
}: CategoryBreakdownProps) {
  const t = useTranslations('Dashboard');
  const [mode, setMode] = useState<ViewMode>('monthly');

  const modeItems = [
    { value: 'monthly' as ViewMode, label: t('viewMode.monthly'), Icon: Calendar },
    { value: 'yearly' as ViewMode, label: t('viewMode.yearly'), Icon: CalendarRange },
  ];

  const multiplier = mode === 'yearly' ? 12 : 1;
  const displayTotalSen = totalMonthlySen * multiplier;

  const displayCategories = useMemo(() => {
    return categories.map((c) => ({
      ...c,
      monthlySen: c.monthlySen * multiplier,
    }));
  }, [categories, multiplier]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="category-breakdown-heading"
      className="bg-surface-1 border border-border-1 rounded-xl p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-start justify-between gap-4 pb-3 border-b border-border-1">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-text-faint" aria-hidden="true" />
            <h2
              id="category-breakdown-heading"
              className="text-xs font-mono uppercase tracking-wider text-text-faint"
            >
              {t('categoriesHeading')}
            </h2>
          </div>
          <p className="text-xs text-text-muted mt-0.5">{t('categoriesSub')}</p>
        </div>

        {/* Total & Three-Dot Menu */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <span className="text-[10px] font-mono text-text-faint block uppercase">
              {mode === 'yearly' ? 'Annual Total' : 'Monthly Total'}
            </span>
            <span className="font-mono text-sm font-semibold text-text-primary">
              MYR {senToMyr(displayTotalSen)}
            </span>
          </div>

          <CardActionMenu
            title="Category View"
            items={modeItems}
            selectedValue={mode}
            onSelect={setMode}
          />
        </div>
      </div>

      {/* Segmented Distribution Bar */}
      <div
        className="h-2.5 w-full rounded-full bg-surface-3 overflow-hidden flex"
        role="progressbar"
        aria-valuenow={100}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Category spending distribution"
      >
        {displayCategories.map((c) => (
          <div
            key={c.category}
            className={`h-full ${c.colorClass} transition-all duration-300`}
            style={{ width: `${Math.max(2, c.percentage)}%` }}
            title={`${t(c.labelKey)}: ${c.percentage}%`}
          />
        ))}
      </div>

      {/* Category Ledger List */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {displayCategories.map((c) => (
          <li
            key={c.category}
            className="p-3 rounded-xl border border-border-1 bg-surface-2/40 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full ${c.colorClass} shrink-0`} />
              <div className="min-w-0">
                <span className="text-xs font-medium text-text-primary block truncate">
                  {t(c.labelKey)}
                </span>
                <span className="text-[11px] font-mono text-text-faint">
                  {c.percentage}% · {c.count} {c.count === 1 ? 'sub' : 'subs'}
                </span>
              </div>
            </div>
            <span className="font-mono text-xs text-text-primary font-medium shrink-0">
              MYR {senToMyr(c.monthlySen)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
