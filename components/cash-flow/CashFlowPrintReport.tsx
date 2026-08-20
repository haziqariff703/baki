'use client';

/**
 * Single-Page Executive Cash-Flow Statement (Print & PDF Export).
 *
 * Polished Swiss Financial Design:
 * - Publication-grade typography: Instrument Sans + IBM Plex Mono.
 * - Restrained Baki Amber brand accent with clear semantic status indicators.
 * - Perfect 1-Page A4 format with zero overflow and zero clutter.
 * - High-contrast, accessible WCAG AAA print fidelity.
 */

import React from 'react';
import { useLocale } from 'next-intl';
import type { SubscriptionSchema } from '@/lib/validation';
import type { UpcomingRenewal } from '@/features/cash-flow';
import {
  buildScoredSubscriptions,
  averageScore,
  spendingByCategory,
} from '@/features/dashboard/analytics';
import {
  computeCashFlowSummary,
  computePaydayAnalysis,
  type CashFlowSummary,
  type PaydayAnalysis,
} from '@/features/cash-flow';
import { calculateDailyBurn, detectStudentSavings } from '@/features/student-optimizer';
import { senToMyr } from '@/lib/money';
import { toDatePart } from '@/lib/dates';
import type { UserProfile } from '@/lib/validation/profile';
import { resolveUniversityDomain } from '@/features/settings/domainExtractor';

interface CashFlowPrintReportProps {
  readonly subscriptions: readonly SubscriptionSchema[];
  readonly renewals: readonly UpcomingRenewal[];
  readonly availableBalanceSen: number;
  readonly profile?: UserProfile | null;
  readonly statementDate?: string;
}

const CATEGORY_PALETTE: Record<string, { label: string; color: string }> = {
  entertainment: { label: 'Entertainment', color: '#6366f1' },
  software: { label: 'Software & AI', color: '#2563eb' },
  telecommunications: { label: 'Telco & Internet', color: '#0d9488' },
  fitness: { label: 'Fitness & Health', color: '#d97706' },
  utilities: { label: 'Utilities', color: '#0284c7' },
  education: { label: 'Education', color: '#db2777' },
  other: { label: 'Other Services', color: '#64748b' },
};

export function CashFlowPrintReport({
  subscriptions,
  renewals,
  availableBalanceSen,
  profile,
  statementDate = new Date().toISOString(),
}: CashFlowPrintReportProps) {
  const locale = useLocale();

  const scoredSubs = buildScoredSubscriptions(subscriptions);
  const avgScore = averageScore(scoredSubs);
  const categorySpending = spendingByCategory(scoredSubs);
  const summary: CashFlowSummary = computeCashFlowSummary(renewals, availableBalanceSen, statementDate);
  const paydayDay = profile?.paydayDayOfMonth ?? 25;
  const paydayAnalysis: PaydayAnalysis = computePaydayAnalysis(renewals, paydayDay, statementDate);
  const dailyBurn = calculateDailyBurn(summary.monthlyCommitmentSen);
  const studentSavings = detectStudentSavings(subscriptions);

  const universityInfo = profile?.email
    ? resolveUniversityDomain(profile.email)
    : profile?.universityDomain
    ? resolveUniversityDomain(profile.universityDomain)
    : null;

  const formattedDate = new Date(statementDate).toLocaleDateString(
    locale === 'ms' ? 'ms-MY' : 'en-MY',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  );

  const referenceCode = `BK-${statementDate.slice(0, 10).replace(/-/g, '')}-${(subscriptions.length * 17).toString().padStart(4, '0')}`;
  const isHealthyBudget = summary.safeToSpendSen >= 0;

  return (
    <div className="bg-white text-slate-900 font-sans p-6 sm:p-8 max-w-3xl mx-auto space-y-4 print:p-0 print:max-w-none print:text-black print:space-y-3">
      {/* ── Top Brand Accent Stripe ────────────────────────────────────── */}
      <div className="h-1 w-full bg-amber-500 rounded-full print:bg-amber-600" />

      {/* ── 1. Clean Letterhead & Header ───────────────────────────────── */}
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-slate-900 font-sans">BAKI</span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-300">
                Personal Statement
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Monthly Cash-Flow & Subscription Audit Report
            </p>
          </div>

          <div className="text-right space-y-0.5 text-xs font-mono">
            <span className="font-semibold text-slate-900 block">STATEMENT #{referenceCode}</span>
            <span className="text-slate-500 block text-[11px]">{formattedDate}</span>
          </div>
        </div>

        {/* Account Profile Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Account Holder</span>
            <span className="font-semibold text-slate-800 truncate block">{profile?.displayName || 'Personal Account'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Email ID</span>
            <span className="font-semibold text-slate-800 truncate block">{profile?.email || 'user@baki.local'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Profile Tier</span>
            <span className="font-semibold text-slate-800 block">
              {profile?.educationTier === 'tertiary_student'
                ? 'Tertiary Student'
                : profile?.educationTier === 'young_professional'
                ? 'Young Professional'
                : 'General User'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans">Institution</span>
            <span className="font-semibold text-slate-800 truncate block">
              {universityInfo?.isEdu ? `${universityInfo.institutionName}` : 'Standard'}
            </span>
          </div>
        </div>
      </header>

      {/* ── 2. Account Position & Summary Grid ─────────────────────────── */}
      <section aria-labelledby="summary-heading" className="space-y-2">
        <h2 id="summary-heading" className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
          1. Monthly Cash-Flow Position
        </h2>

        <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
          {/* Monthly Budget Card */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-0.5">
            <span className="text-[10px] text-slate-500 block uppercase font-sans font-medium">Monthly Budget</span>
            <div className="text-base font-bold text-slate-900">
              MYR {senToMyr(availableBalanceSen)}
            </div>
            <span className="text-[10px] text-slate-400 block font-sans">Baseline income</span>
          </div>

          {/* Commitments Card */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-0.5">
            <span className="text-[10px] text-slate-500 block uppercase font-sans font-medium">Total Commitments</span>
            <div className="text-base font-bold text-slate-900">
              MYR {senToMyr(summary.monthlyCommitmentSen)}
            </div>
            <span className="text-[10px] text-slate-400 block font-sans">{subscriptions.length} active bills</span>
          </div>

          {/* Net Safe-To-Spend Balance Card */}
          <div
            className={`p-3 rounded-lg border space-y-0.5 ${
              isHealthyBudget
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                : 'bg-rose-50/70 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-sans font-semibold">Safe-To-Spend</span>
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                  isHealthyBudget ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                }`}
              >
                {isHealthyBudget ? 'Surplus' : 'Overrun'}
              </span>
            </div>
            <div className="text-base font-bold">
              MYR {senToMyr(summary.safeToSpendSen)}
            </div>
            <span className="text-[10px] opacity-75 block font-sans">Uncommitted balance</span>
          </div>
        </div>

        {/* Secondary Context Strip */}
        <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50/60 border border-slate-200/60 rounded-lg text-[10px] font-mono text-slate-600">
          <div>
            <span className="text-slate-400 font-sans block">Annual Run-Rate</span>
            <strong className="text-slate-800">MYR {senToMyr(summary.annualisedTotalSen)}/yr</strong>
          </div>
          <div>
            <span className="text-slate-400 font-sans block">Daily Burn Rate</span>
            <strong className="text-amber-800">MYR {dailyBurn.dailyBurnMyr}/day</strong>
            <span className="text-slate-400 ml-1">(~{dailyBurn.tehTarikEquiv} Teh Tarik)</span>
          </div>
          <div>
            <span className="text-slate-400 font-sans block">Payday Anchor ({paydayDay}th)</span>
            <strong className="text-slate-800">{paydayAnalysis.daysUntilPayday}d left</strong>
            <span className="text-slate-400 ml-1">(RM {senToMyr(paydayAnalysis.beforePaydayTotalSen)} due)</span>
          </div>
        </div>
      </section>

      {/* ── 3. Category Spending Breakdown ─────────────────────────────── */}
      <section aria-labelledby="cat-heading" className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <h2 id="cat-heading" className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
            2. Category Spending Spectrum
          </h2>
          <span className="font-mono text-[10px] text-slate-400">{categorySpending.length} categories</span>
        </div>

        {/* Multi-Color Segmented Progress Bar */}
        <div className="h-2 w-full flex bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          {categorySpending.map((cat) => {
            const config = CATEGORY_PALETTE[cat.category] || CATEGORY_PALETTE.other;
            return (
              <div
                key={cat.category}
                style={{ width: `${Math.max(2, cat.percentage)}%`, backgroundColor: config.color }}
                title={`${config.label}: ${cat.percentage}%`}
                className="h-full"
              />
            );
          })}
        </div>

        {/* Category Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[10px] font-mono text-slate-600 pt-0.5">
          {categorySpending.map((cat) => {
            const config = CATEGORY_PALETTE[cat.category] || CATEGORY_PALETTE.other;
            return (
              <div key={cat.category} className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-xs shrink-0" style={{ backgroundColor: config.color }} />
                <span className="text-slate-700 truncate font-sans">{config.label}</span>
                <span className="font-bold text-slate-900 ml-auto">MYR {senToMyr(cat.monthlySen)}</span>
                <span className="text-slate-400">({cat.percentage}%)</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 4. Subscription Schedule & Evaluation Table ────────────────── */}
      <section aria-labelledby="table-heading" className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <h2 id="table-heading" className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
            3. Subscription Schedule & 5-Pillar Score Matrix
          </h2>
          <span className="text-[10px] font-mono text-slate-400">Portfolio Score Avg: {avgScore}/100</span>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] text-slate-600 uppercase font-sans">
                <th className="py-2 px-2.5 font-semibold">Merchant / Service</th>
                <th className="py-2 px-1.5 font-semibold">Cycle</th>
                <th className="py-2 px-2 font-semibold text-right">Cost (MYR)</th>
                <th className="py-2 px-2 font-semibold">Next Date</th>
                <th className="py-2 px-1.5 font-semibold text-center">Score</th>
                <th className="py-2 px-2.5 font-semibold text-right">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {scoredSubs.map(({ subscription, score, recommendation }) => {
                const badgeStyle =
                  recommendation === 'keep'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : recommendation === 'review'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : recommendation === 'downgrade_or_pause'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300';

                const statusLabel =
                  recommendation === 'keep'
                    ? 'Keep'
                    : recommendation === 'review'
                    ? 'Review'
                    : recommendation === 'downgrade_or_pause'
                    ? 'Pause'
                    : 'Cancel';

                return (
                  <tr key={subscription.id} className="text-[11px] even:bg-slate-50/40">
                    <td className="py-1.5 px-2.5 font-sans font-semibold text-slate-900">
                      {subscription.merchantName}
                    </td>
                    <td className="py-1.5 px-1.5 text-slate-500 uppercase text-[10px]">
                      {subscription.cycle}
                    </td>
                    <td className="py-1.5 px-2 text-right font-bold text-slate-900">
                      {senToMyr(subscription.amountSen)}
                    </td>
                    <td className="py-1.5 px-2 text-slate-500 text-[10px]">
                      {toDatePart(subscription.nextChargeDate)}
                    </td>
                    <td className="py-1.5 px-1.5 text-center font-bold text-slate-800">
                      {score}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-sans">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${badgeStyle}`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold text-[11px]">
                <td className="py-2 px-2.5 font-sans text-slate-900" colSpan={2}>
                  Total Monthly Commitments
                </td>
                <td className="py-2 px-2 text-right text-slate-900 font-bold">
                  MYR {senToMyr(summary.monthlyCommitmentSen)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ── 5. Student Discount Concessions (if applicable) ────────────── */}
      {studentSavings && studentSavings.count > 0 && (
        <section aria-labelledby="savings-heading" className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-2.5 space-y-1 text-xs">
          <div className="flex items-center justify-between font-sans">
            <h2 id="savings-heading" className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
              Student Discount Opportunities
            </h2>
            <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
              Potential Savings: MYR {senToMyr(studentSavings.totalAnnualSavingsSen)} / year
            </span>
          </div>
          <p className="text-emerald-950 text-[10px] font-mono leading-relaxed">
            {studentSavings.opportunities
              .map((opp) => `${opp.merchantName} (${opp.planName} · Save MYR ${senToMyr(opp.monthlySavingsSen)}/mo)`)
              .join(' · ')}
          </p>
        </section>
      )}

      {/* ── 6. Compact Compliance Footer ───────────────────────────────── */}
      <footer className="border-t border-slate-200 pt-2.5 flex items-center justify-between text-[9px] font-mono text-slate-400">
        <span>Baki v0.1 · Pure TypeScript Engine · PDPA 2010 Protected</span>
        <span>Non-directive advisory summary (BNM / SC Malaysia Guidelines)</span>
      </footer>
    </div>
  );
}
