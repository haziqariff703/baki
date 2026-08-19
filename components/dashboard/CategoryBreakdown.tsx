'use client';

/**
 * Category Spending Breakdown component (Dashboard Overview).
 *
 * Implements deterministic lifestyle category aggregation (Entertainment,
 * Software & AI, Telco, Fitness, Utilities).
 * DESIGN.md tokens: Segmented distribution bar, mono figures, AA-contrast.
 */

import { useTranslations } from 'next-intl';
import { Layers } from 'lucide-react';
import type { CategorySpendingSlice } from '@/features/dashboard/analytics';
import { senToMyr } from '@/lib/money';

interface CategoryBreakdownProps {
  readonly categories: readonly CategorySpendingSlice[];
  readonly totalMonthlySen: number;
}

export function CategoryBreakdown({
  categories,
  totalMonthlySen,
}: CategoryBreakdownProps) {
  const t = useTranslations('Dashboard');

  if (categories.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="category-breakdown-heading"
      className="bg-surface-1 border border-border-1 rounded-xl p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-start justify-between gap-4 pb-3 border-b border-border-1 flex-wrap">
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

        <div className="text-right">
          <span className="text-xs font-mono text-text-faint block">Total / Month</span>
          <span className="font-mono text-sm font-medium text-text-primary">
            MYR {senToMyr(totalMonthlySen)}
          </span>
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
        {categories.map((c) => (
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
        {categories.map((c) => (
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
            <span className="font-mono text-xs text-text-primary shrink-0">
              MYR {senToMyr(c.monthlySen)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
