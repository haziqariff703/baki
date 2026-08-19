'use client';

/**
 * Payday & Income Anchor Strip (M4 Cash Flow).
 *
 * Helps Malaysian students and young professionals align their subscription
 * renewal commitments with their salary or allowance arrival dates.
 *
 * Deterministic pure calculation (AGENTS.md §2.1, §8.1, §9).
 * Ledger Rule design tokens (DESIGN.md), clean mobile responsive, zero emojis.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar, AlertCircle, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import {
  computePaydayAnalysis,
  type PaydayAnalysis,
  type UpcomingRenewal,
} from '@/features/cash-flow';
import { senToMyr } from '@/lib/money';
import { toDatePart } from '@/lib/dates';
import { cn } from '@/lib/utils';

interface PaydayAnchorStripProps {
  readonly renewals: readonly UpcomingRenewal[];
  readonly fromDate: string;
}

const PRESETS = [
  { day: 25, key: 'standard' },
  { day: 28, key: 'civil' },
  { day: 1, key: 'allowance' },
  { day: 15, key: 'midMonth' },
] as const;

export function PaydayAnchorStrip({ renewals, fromDate }: PaydayAnchorStripProps) {
  const t = useTranslations('CashFlow.paydayAnchor');
  const [paydayDay, setPaydayDay] = useState<number>(25);
  const [showCustom, setShowCustom] = useState(false);

  const analysis: PaydayAnalysis = computePaydayAnalysis(renewals, paydayDay, fromDate);

  return (
    <section
      aria-labelledby="payday-anchor-heading"
      className="bg-surface-1 border border-border-1 rounded-xl overflow-hidden space-y-0"
    >
      {/* Header & Date Selector */}
      <div className="px-5 py-4 border-b border-border-1 flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-text-faint" aria-hidden="true" />
            <h2
              id="payday-anchor-heading"
              className="text-xs font-mono uppercase tracking-wider text-text-faint"
            >
              {t('title')}
            </h2>
          </div>
          <p className="text-xs text-text-muted">{t('subtitle')}</p>
        </div>

        {/* Preset Selectors */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESETS.map((p) => {
            const selected = paydayDay === p.day && !showCustom;
            return (
              <button
                key={p.day}
                type="button"
                onClick={() => {
                  setPaydayDay(p.day);
                  setShowCustom(false);
                }}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-mono transition-colors border',
                  selected
                    ? 'border-accent bg-accent text-surface-0 font-medium'
                    : 'border-border-2 bg-surface-2 text-text-muted hover:text-text-primary hover:bg-surface-3',
                )}
                aria-pressed={selected}
              >
                {p.day}th
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowCustom((prev) => !prev)}
            aria-label="Custom day"
            className={cn(
              'px-2 py-1 rounded-lg text-xs font-mono transition-colors border',
              showCustom
                ? 'border-accent bg-accent text-surface-0'
                : 'border-border-2 bg-surface-2 text-text-muted hover:text-text-primary',
            )}
          >
            <SlidersHorizontal className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Custom Day Input Dropdown (if toggled) */}
      {showCustom && (
        <div className="px-5 py-3 border-b border-border-1 bg-surface-2/50 flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <label htmlFor="custom-payday-day" className="text-xs text-text-muted">
            {t('paydayDay')} (1–31):
          </label>
          <div className="flex items-center gap-2">
            <input
              id="custom-payday-day"
              type="number"
              min={1}
              max={31}
              value={paydayDay}
              onChange={(e) => {
                const val = Number.parseInt(e.target.value, 10);
                if (!Number.isNaN(val)) {
                  setPaydayDay(Math.min(31, Math.max(1, val)));
                }
              }}
              className="w-16 bg-surface-0 border border-border-2 rounded-lg px-2.5 py-1 text-xs font-mono text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent text-center"
            />
            <span className="text-xs font-mono text-text-faint">of every month</span>
          </div>
        </div>
      )}

      {/* Main Income & Balance Timeline Overview */}
      <div className="p-5 space-y-4">
        {/* Next Payday Callout */}
        <div className="flex items-baseline justify-between gap-4 pb-3 border-b border-border-1 flex-wrap">
          <div>
            <span className="text-xs text-text-muted">
              {t('nextPayday', { date: toDatePart(analysis.nextPaydayDate) })}
            </span>
            <div className="text-xs font-mono text-text-faint mt-0.5">
              {t('daysRemaining', { days: analysis.daysUntilPayday })}
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono uppercase tracking-wider text-text-faint block">
              Day {analysis.paydayDayOfMonth}
            </span>
            <span className="font-mono text-sm text-text-primary">
              {toDatePart(analysis.nextPaydayDate)}
            </span>
          </div>
        </div>

        {/* 2-Column Split: Before Income vs After Income */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Due Before Income (Crunch Zone) */}
          <div
            className={cn(
              'p-3.5 rounded-xl border space-y-1.5',
              analysis.beforePaydayTotalSen > 0
                ? 'bg-status-amber-surface border-status-amber-border text-status-amber-text'
                : 'bg-surface-2/50 border-border-1 text-text-muted',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                {t('beforePaydayTitle')}
              </span>
              <span className="font-mono text-sm font-semibold">
                MYR {senToMyr(analysis.beforePaydayTotalSen)}
              </span>
            </div>
            <p className="text-[11px] opacity-90">
              {t('beforePaydayDesc', { count: analysis.beforePaydayCount })}
            </p>
          </div>

          {/* Due After Income (Safe Zone) */}
          <div className="p-3.5 rounded-xl border bg-surface-2/50 border-border-1 space-y-1.5 text-text-secondary">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                {t('afterPaydayTitle')}
              </span>
              <span className="font-mono text-sm font-semibold text-text-primary">
                MYR {senToMyr(analysis.afterPaydayTotalSen)}
              </span>
            </div>
            <p className="text-[11px] text-text-muted">
              {t('afterPaydayDesc', { count: analysis.afterPaydayCount })}
            </p>
          </div>
        </div>

        {/* Tight Window Warning Alert (if bills due soon before payday) */}
        {analysis.isTightWindow ? (
          <div className="px-3.5 py-2.5 rounded-xl border border-status-amber-border bg-status-amber-surface/70 text-xs text-status-amber-text flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('tightWarning', { amount: senToMyr(analysis.beforePaydayTotalSen) })}</span>
          </div>
        ) : (
          analysis.beforePaydayCount === 0 && (
            <div className="px-3.5 py-2 rounded-xl border border-status-emerald-border bg-status-emerald-surface text-xs text-status-emerald-text flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>No bills due before your upcoming income.</span>
            </div>
          )
        )}
      </div>
    </section>
  );
}
