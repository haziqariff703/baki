'use client';

/**
 * Daily Burn Rate & Teh Tarik Index Widget (Dashboard / Cash Flow).
 *
 * Translates abstract monthly subscription totals into an everyday
 * Malaysian lifestyle baseline (Teh Tarik + Roti Canai snack index).
 *
 * Implements DESIGN.md:
 * - The Ledger Rule: amber annotation on the single most important daily figure.
 * - IBM Plex Mono for all numeric money values.
 * - WCAG AA contrast on dark OLED backgrounds.
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { Coffee, Flame, Info } from 'lucide-react';
import { calculateDailyBurn } from '@/features/student-optimizer';
import { senToMyr } from '@/lib/money';

interface DailyBurnWidgetProps {
  readonly monthlyTotalSen: number;
}

export function DailyBurnWidget({ monthlyTotalSen }: DailyBurnWidgetProps) {
  const t = useTranslations('DailyBurn');
  const { dailyBurnSen, dailyBurnMyr, tehTarikEquiv, monthlyTotalMyr } =
    calculateDailyBurn(monthlyTotalSen);

  return (
    <div className="rounded-xl border border-border-1 bg-surface-1 p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-accent-subtle text-accent border border-accent-border flex items-center justify-center">
            <Flame className="w-4 h-4" aria-hidden="true" />
          </span>
          <h3 className="text-sm font-semibold text-text-primary">
            {t('title')}
          </h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-faint">
          {t('average30Days')}
        </span>
      </div>

      {/* Primary Stat with Ledger Rule left accent tick */}
      <div className="border-l-2 border-accent pl-3.5 py-0.5 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-3xl sm:text-4xl font-medium text-text-primary tracking-tight">
            MYR {dailyBurnMyr}
          </span>
          <span className="text-xs text-text-secondary">{t('perDay')}</span>
        </div>
        <p className="text-xs text-text-muted">
          {t('committedMonthly', { amount: monthlyTotalMyr })}
        </p>
      </div>

      {/* Malaysian Teh Tarik index callout */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-surface-2 border border-border-1 text-xs">
        <Coffee className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-text-secondary leading-snug">
            {t('tehTarikCallout', { count: tehTarikEquiv })}
          </p>
        </div>
      </div>
    </div>
  );
}
