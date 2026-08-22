import { getTranslations } from 'next-intl/server';
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  ArrowRight,
  PlusCircle,
  UploadCloud,
  Inbox,
  PiggyBank,
  type LucideIcon,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SubscriptionLedger } from '@/components/subscriptions/SubscriptionLedger';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';
import { SpendingDonutCard } from '@/components/dashboard/SpendingDonutCard';
import { SpendingTrendCard } from '@/components/dashboard/SpendingTrendCard';
import { RenewalForecastCard } from '@/components/dashboard/RenewalForecastCard';
import { ScoreDistribution } from '@/components/dashboard/ScoreDistribution';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import { DailyBurnWidget } from '@/components/cash-flow/DailyBurnWidget';
import { StudentSavingsCard } from '@/components/subscriptions/StudentSavingsCard';
import { detectStudentSavings } from '@/features/student-optimizer';
import {
  averageScore,
  buildAlerts,
  buildScoredSubscriptions,
  buildSpendingTrend,
  savingsOpportunities,
  scoreDistribution,
  spendingByCategory,
  spendingByMerchant,
  type AlertKind,
} from '@/features/dashboard/analytics';
import { computeCashFlowSummary } from '@/features/cash-flow';
import { deriveRecommendationHint } from '@/features/recurring-detection';
import { senToMyr } from '@/lib/money';
import { toDatePart } from '@/lib/dates';
import { Link } from '@/i18n/routing';
import {
  SYNTHETIC_TODAY,
  syntheticAvailableBalanceSen,
  syntheticRenewals,
} from '@/tests/fixtures/renewals';
import { syntheticSubscriptions } from '@/tests/fixtures/subscriptions';
import { syntheticCandidates } from '@/tests/fixtures/candidates';

import { createClient } from '@/lib/supabase/server';
import { SupabaseSubscriptionRepository } from '@/features/subscriptions/repository';
import { SupabaseRecurringCandidateRepository } from '@/features/recurring-detection/repository';
import { SupabaseTransactionRepository } from '@/features/transactions';

/**
 * JIRA-style dashboard (Overview). Server-rendered for speed (§17): all
 * numbers are precomputed here from the deterministic engines via the
 * presentational `analytics` aggregation, then passed to mostly-server SVG /
 * ledger components. Interactive chrome (sidebar, navbar search, ledger) is
 * client. Money stays integer sen and renders in mono (§8.1). Exactly one
 * amber left-tick annotates the single most important figure: safe-to-spend.
 */
export default async function DashboardPage() {
  const t = await getTranslations('Dashboard');
  const tCommon = await getTranslations('Common');

  let initialSubscriptions: any[] = [];
  let candidates: any[] = [];
  let userTransactions: any[] = [];
  let availableBalanceSen = 0;
  let isStudent = false;
  let userEmail: string | undefined = undefined;
  let userProfile: any = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      userEmail = user.email;
      const subRepo = new SupabaseSubscriptionRepository(supabase);
      const userSubs = await subRepo.list(user.id);
      initialSubscriptions = (userSubs ?? []) as any[];

      const candRepo = new SupabaseRecurringCandidateRepository(supabase);
      const userCands = await candRepo.list(user.id);
      candidates = (userCands ?? []) as any[];

      const txRepo = new SupabaseTransactionRepository(supabase);
      const txs = await txRepo.list(user.id);
      userTransactions = (txs ?? []) as any[];

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        userProfile = profile;
        if (profile.monthly_allowance_sen != null) {
          availableBalanceSen = profile.monthly_allowance_sen;
        }
        isStudent = profile.education_tier
          ? profile.education_tier === 'tertiary_student'
          : Boolean(profile.is_student);
      }
    } else {
      // Guest demo session fallback only when unauthenticated
      initialSubscriptions = syntheticSubscriptions as any[];
      candidates = syntheticCandidates as any[];
      availableBalanceSen = syntheticAvailableBalanceSen;
    }
  } catch (error) {
    // Graceful fallback to demo fixtures if network/DB is unavailable (§13.3)
    console.error('[DashboardPage] Server hydration error:', error);
  }

  // ---- Deterministic aggregation (engines → presentational grouping) ----
  // Convert subscriptions to renewals
  const realRenewals = initialSubscriptions.map((s) => ({
    id: s.id,
    merchantName: s.merchantName,
    amountSen: s.amountSen,
    cycle: s.cycle,
    nextChargeDate: s.nextChargeDate,
    reminderOffsets: [],
  }));

  const summary = computeCashFlowSummary(
    realRenewals,
    availableBalanceSen,
    SYNTHETIC_TODAY,
  );
  const scored = buildScoredSubscriptions(initialSubscriptions);
  const avgScore = averageScore(scored);
  const spendSlices = spendingByMerchant(scored);
  const categorySlices = spendingByCategory(scored);
  const bands = scoreDistribution(scored);
  const savings = savingsOpportunities(scored);
  const studentSavings = detectStudentSavings(initialSubscriptions, isStudent);
  const alerts = buildAlerts(
    realRenewals,
    SYNTHETIC_TODAY,
    summary.safeToSpendSen,
  );
  const trendPoints = buildSpendingTrend(
    summary.monthlyCommitmentSen,
    userTransactions,
    new Date(),
  );


  // Review queue: pending candidates + advisory confidence summary.
  const pending = (candidates ?? []).filter((c: any) => {
    if (!c) return false;
    if (typeof c.status === 'string') return c.status === 'pending';
    return c.status?.state === 'pending';
  });

  const avgConfidence =
    pending.length === 0
      ? 0
      : Math.round(
          (pending.reduce(
            (s: number, c: any) => s + Number(c.aiConfidence ?? c.ai_confidence ?? 0),
            0,
          ) /
            pending.length) *
            100,
        );

  const hintCounts = pending.reduce<Record<string, number>>((acc, c: any) => {
    try {
      const hint = deriveRecommendationHint(c);
      acc[hint] = (acc[hint] ?? 0) + 1;
    } catch {
      acc['needs_review'] = (acc['needs_review'] ?? 0) + 1;
    }
    return acc;
  }, {});

  const kpis = [
    { label: t('kpi.monthly'), valueSen: summary.monthlyCommitmentSen, tick: false },
    { label: t('kpi.annualised'), valueSen: summary.annualisedTotalSen, tick: false },
    { label: t('kpi.safeToSpend'), valueSen: summary.safeToSpendSen, tick: true },
  ] as const;

  const ALERT_ICON: Record<AlertKind, { Icon: LucideIcon; className: string }> = {
    overrun: {
      Icon: AlertTriangle,
      className: 'text-status-rose-text border-status-rose-border bg-status-rose-surface',
    },
    due_today: {
      Icon: BellRing,
      className: 'text-status-amber-text border-status-amber-border bg-status-amber-surface',
    },
    due_this_week: {
      Icon: CalendarClock,
      className: 'text-status-blue-text border-status-blue-border bg-status-blue-surface',
    },
  };

  return (
    <AppShell title={t('title')}>
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-[-0.01em] text-text-primary">
              {t('overviewHeading')}
            </h1>
            <span className="font-mono text-xs uppercase tracking-wider text-text-faint">
              {t('ruleVersionStamp')}
            </span>
          </div>

          {/* Onboarding Checklist for First-Time Users */}
          <OnboardingChecklist />

          {/* 1 · Cash-flow KPIs — ledger-rule stat cards, one amber tick */}
          <section aria-labelledby="kpi-heading" className="space-y-3">
            <h2 id="kpi-heading" className="text-xs font-mono uppercase tracking-wider text-text-faint">
              {t('summaryHeading')}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {kpis.map((kpi) => (
                <li
                  key={kpi.label}
                  className={`bg-surface-1 border border-border-1 rounded-xl p-5 ${
                    kpi.tick ? 'border-l-2 border-l-accent pl-4' : ''
                  }`}
                >
                  <span className="text-xs text-text-muted font-medium block">
                    {kpi.label}
                  </span>
                  <span
                    className="font-mono text-2xl font-medium text-text-primary mt-1 block"
                    aria-label={t('amountLabel', { amount: senToMyr(kpi.valueSen) })}
                  >
                    MYR {senToMyr(kpi.valueSen)}
                  </span>
                </li>
              ))}
              <li className="bg-surface-1 border border-border-1 rounded-xl p-5">
                <span className="text-xs text-text-muted font-medium block">
                  {t('kpi.avgScore')}
                </span>
                <span className="font-mono text-2xl font-medium text-text-primary mt-1 block">
                  {avgScore}
                  <span className="text-sm font-normal text-text-faint ml-1">/ 100</span>
                </span>
              </li>
            </ul>
          </section>

          {/* Student Discount Opportunities (if any active sub qualifies) */}
          <StudentSavingsCard
            summary={studentSavings}
            isStudent={isStudent}
            universityDomain={userProfile?.university_domain}
            email={userEmail}
          />


          {/* Daily Burn Rate & Teh Tarik Lifestyle Baseline */}
          <DailyBurnWidget monthlyTotalSen={summary.monthlyCommitmentSen} />

          {/* Alerts panel */}
          <section aria-labelledby="alerts-heading" className="space-y-3">
            <h2 id="alerts-heading" className="text-xs font-mono uppercase tracking-wider text-text-faint">
              {t('alertsHeading')}
            </h2>
            {alerts.length === 0 ? (
              <p className="bg-surface-1 border border-border-1 rounded-xl px-5 py-4 text-sm text-text-muted">
                {t('alertsEmpty')}
              </p>
            ) : (
              <ul className="space-y-2">
                {alerts.map((alert) => {
                  const { Icon, className } = ALERT_ICON[alert.kind];
                  const message =
                    alert.kind === 'overrun'
                      ? t('alert.overrun', { amount: senToMyr(Math.abs(alert.amountSen ?? 0)) })
                      : t(`alert.${alert.kind}`, { count: alert.count });
                  return (
                    <li
                      key={alert.kind}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${className}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span className="text-sm font-medium">{message}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Trend + Spending + Score distribution */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <SpendingTrendCard
              currentMonthlySen={summary.monthlyCommitmentSen}
              points={trendPoints}
            />

            <SpendingDonutCard
              slices={spendSlices}
              totalMonthlySen={summary.monthlyCommitmentSen}
            />

            <section aria-labelledby="scoredist-heading" className="bg-surface-1 border border-border-1 rounded-xl p-5 space-y-4">
              <div>
                <h2 id="scoredist-heading" className="text-xs font-mono uppercase tracking-wider text-text-faint">
                  {t('scoreDistHeading')}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">{t('scoreDistSub')}</p>
              </div>
              <ScoreDistribution bands={bands} />
            </section>
          </div>

          {/* Category Spending Breakdown */}
          <CategoryBreakdown
            categories={categorySlices}
            totalMonthlySen={summary.monthlyCommitmentSen}
          />

          {/* Forecast + Review queue + Savings */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <RenewalForecastCard
              renewals={realRenewals}
              fromDate={SYNTHETIC_TODAY}
            />

            <section aria-labelledby="queue-heading" className="bg-surface-1 border border-border-1 rounded-xl p-5 space-y-4">
              <div>
                <h2 id="queue-heading" className="text-xs font-mono uppercase tracking-wider text-text-faint">
                  {t('queueHeading')}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">{t('queueSub')}</p>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-3xl font-medium text-text-primary">
                  {pending.length}
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {t('queueConfidence', { pct: avgConfidence })}
                </span>
              </div>
              <ul className="space-y-1.5">
                {(['likely_recurring', 'uncertain', 'needs_review'] as const).map((hint) => (
                  <li key={hint} className="flex items-baseline justify-between gap-3">
                    <span className="text-xs text-text-secondary">{t(`queueHint.${hint}`)}</span>
                    <span className="font-mono text-xs text-text-primary">
                      {hintCounts[hint] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/review"
                className="inline-flex items-center gap-1.5 text-sm text-text-muted underline underline-offset-4 decoration-border-3 hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
              >
                {t('queueReviewLink')}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </section>

            <section aria-labelledby="savings-heading" className="bg-surface-1 border border-border-1 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-text-muted" aria-hidden="true" />
                <div>
                  <h2 id="savings-heading" className="text-xs font-mono uppercase tracking-wider text-text-faint">
                    {t('savingsHeading')}
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">{t('savingsSub')}</p>
                </div>
              </div>
              {savings.items.length === 0 ? (
                <p className="text-sm text-text-muted">{t('savingsEmpty')}</p>
              ) : (
                <>
                  <ul className="divide-y divide-border-1">
                    {savings.items.map((item) => (
                      <li key={item.id} className="flex items-baseline justify-between gap-3 py-2">
                        <span className="flex items-center gap-2 min-w-0">
                          <BrandLogo merchantName={item.merchantName} size={20} />
                          <span className="text-sm text-text-secondary truncate">
                            {item.merchantName}
                            <span className="font-mono text-xs text-text-faint ml-2">
                              {item.score}/100
                            </span>
                          </span>
                        </span>
                        <span className="font-mono text-xs text-text-primary shrink-0">
                          MYR {senToMyr(item.monthlySen)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-baseline justify-between gap-3 pt-2 border-t border-border-1">
                    <span className="text-xs font-medium text-text-primary">
                      {t('savingsTotal')}
                    </span>
                    <span className="font-mono text-sm font-medium text-text-primary">
                      MYR {senToMyr(savings.totalMonthlySen)}
                    </span>
                  </div>
                </>
              )}
            </section>
          </div>

          {/* Quick actions */}
          <section aria-labelledby="quick-heading" className="space-y-3">
            <h2 id="quick-heading" className="text-xs font-mono uppercase tracking-wider text-text-faint">
              {t('quickHeading')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/subscriptions"
                className="bg-surface-1 border border-border-1 rounded-xl p-5 flex items-center gap-2 hover:border-border-3 hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <PlusCircle className="w-4 h-4 text-text-muted" aria-hidden="true" />
                <span className="text-sm font-medium text-text-primary">
                  {t('quick.add')}
                </span>
                <ArrowRight className="w-4 h-4 ml-auto text-text-faint" aria-hidden="true" />
              </Link>
              <Link
                href="/review"
                className="bg-surface-1 border border-border-1 rounded-xl p-5 flex items-center gap-2 hover:border-border-3 hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Inbox className="w-4 h-4 text-text-muted" aria-hidden="true" />
                <span className="text-sm font-medium text-text-primary">
                  {t('quick.review')}
                </span>
                <ArrowRight className="w-4 h-4 ml-auto text-text-faint" aria-hidden="true" />
              </Link>
              <Link
                href="/imports"
                className="bg-surface-1 border border-border-1 rounded-xl p-5 flex items-center gap-2 hover:border-border-3 hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <UploadCloud className="w-4 h-4 text-text-muted" aria-hidden="true" />
                <span className="text-sm font-medium text-text-primary">
                  {t('quick.import')}
                </span>
                <ArrowRight className="w-4 h-4 ml-auto text-text-faint" aria-hidden="true" />
              </Link>
            </div>
          </section>

          {/* Subscriptions ledger (live search wired via SearchContext) */}
          <section aria-labelledby="subscriptions-heading" className="space-y-3">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="subscriptions-heading" className="text-xs font-mono uppercase tracking-wider text-text-faint">
                {t('subscriptionsHeading')}
              </h2>
              <span className="font-mono text-xs uppercase tracking-wider text-text-faint">
                {tCommon('ValueScore')}
              </span>
            </div>
            <SubscriptionLedger subscriptions={initialSubscriptions as any} />
          </section>
        </div>
      </div>
    </AppShell>
  );
}
