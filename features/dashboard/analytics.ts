/**
 * Dashboard analytics — presentational aggregation ONLY.
 *
 * AGENTS.md §2.1 / §5.1: this module introduces NO new business logic. It
 * groups and sums the outputs of the existing deterministic engines
 * (`computeScoreResult`, `normalizeToMonthlySen`, `daysUntil`, …) into
 * view-ready shapes for charts. Every number is derived, never recomputed:
 * scores come from the scoring engine, monthly amounts from the cash-flow
 * normaliser. Money stays in integer sen throughout (§8.1).
 */
import {
  computeScoreResult,
  type Recommendation,
} from '@/features/scoring';
import {
  daysUntil,
  normalizeToMonthlySen,
  type UpcomingRenewal,
} from '@/features/cash-flow';
import type { MoneyInSen } from '@/lib/money';
import type { SubscriptionSchema } from '@/lib/validation';

/** A subscription paired with its engine-computed score. */
export interface ScoredSubscription {
  readonly subscription: SubscriptionSchema;
  readonly score: number;
  readonly recommendation: Recommendation['type'];
  /** Monthly-normalised amount from the cash-flow engine (integer sen). */
  readonly monthlySen: MoneyInSen;
}

/**
 * Run every subscription through the deterministic scoring engine and attach
 * its monthly-normalised amount. This is the single aggregation pass the
 * dashboard views share, so the engine runs once per subscription.
 */
export function buildScoredSubscriptions(
  subscriptions: readonly SubscriptionSchema[],
): readonly ScoredSubscription[] {
  return subscriptions.map((subscription) => {
    const result = computeScoreResult({
      usage: subscription.usage,
      necessity: subscription.necessity,
      affordability: subscription.affordability,
      uniqueness: subscription.uniqueness,
      satisfaction: subscription.satisfaction,
    });
    return {
      subscription,
      score: result.score,
      recommendation: result.recommendation.type,
      monthlySen: normalizeToMonthlySen(
        subscription.amountSen,
        subscription.cycle,
      ),
    };
  });
}

/** Mean of engine scores, rounded to a whole number for display. */
export function averageScore(scored: readonly ScoredSubscription[]): number {
  if (scored.length === 0) return 0;
  const total = scored.reduce((sum, s) => sum + s.score, 0);
  return Math.round(total / scored.length);
}

/* -------------------------------------------------------------------------- */
/*  Spending by merchant (donut)                                               */
/* -------------------------------------------------------------------------- */

export interface SpendingSlice {
  readonly id: string;
  readonly merchantName: string;
  readonly monthlySen: MoneyInSen;
  /** Share of the total, 0–1 (for SVG geometry only — display uses sen). */
  readonly fraction: number;
}

/** Monthly spending grouped per merchant, sorted largest first. */
export function spendingByMerchant(
  scored: readonly ScoredSubscription[],
): readonly SpendingSlice[] {
  const total = scored.reduce((sum, s) => sum + s.monthlySen, 0);
  return [...scored]
    .sort((a, b) => b.monthlySen - a.monthlySen)
    .map((s) => ({
      id: s.subscription.id,
      merchantName: s.subscription.merchantName,
      monthlySen: s.monthlySen,
      fraction: total === 0 ? 0 : s.monthlySen / total,
    }));
}

/* -------------------------------------------------------------------------- */
/*  Score distribution (band counts)                                           */
/* -------------------------------------------------------------------------- */

export interface ScoreBandCount {
  readonly recommendation: Recommendation['type'];
  readonly count: number;
}

/** Count subscriptions in each recommendation band, in fixed display order. */
export function scoreDistribution(
  scored: readonly ScoredSubscription[],
): readonly ScoreBandCount[] {
  const order: readonly Recommendation['type'][] = [
    'keep',
    'review',
    'downgrade_or_pause',
    'consider_cancelling',
  ];
  return order.map((recommendation) => ({
    recommendation,
    count: scored.filter((s) => s.recommendation === recommendation).length,
  }));
}

/* -------------------------------------------------------------------------- */
/*  Savings opportunities                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Subscriptions the engine flags as low-value (`consider_cancelling` or
 * `downgrade_or_pause`), with the projected monthly saving if cancelled.
 * Pure presentational filter + sum over engine outputs — not a new rule.
 */
export interface SavingsOpportunity {
  readonly id: string;
  readonly merchantName: string;
  readonly monthlySen: MoneyInSen;
  readonly recommendation: Recommendation['type'];
  readonly score: number;
}

export function savingsOpportunities(
  scored: readonly ScoredSubscription[],
): { readonly items: readonly SavingsOpportunity[]; readonly totalMonthlySen: MoneyInSen } {
  const items = scored
    .filter(
      (s) =>
        s.recommendation === 'consider_cancelling' ||
        s.recommendation === 'downgrade_or_pause',
    )
    .sort((a, b) => b.monthlySen - a.monthlySen)
    .map((s) => ({
      id: s.subscription.id,
      merchantName: s.subscription.merchantName,
      monthlySen: s.monthlySen,
      recommendation: s.recommendation,
      score: s.score,
    }));
  const totalMonthlySen = items.reduce((sum, s) => sum + s.monthlySen, 0);
  return { items, totalMonthlySen };
}

/* -------------------------------------------------------------------------- */
/*  Renewal forecast rows                                                      */
/* -------------------------------------------------------------------------- */

export interface ForecastRow {
  readonly id: string;
  readonly merchantName: string;
  readonly amountSen: MoneyInSen;
  readonly nextChargeDate: string;
  readonly days: number;
}

/** Next-30-day renewals as flat rows, soonest first (presentational). */
export function renewalForecast(
  renewals: readonly UpcomingRenewal[],
  fromDate: string,
): readonly ForecastRow[] {
  return renewals
    .map((r) => ({ r, days: daysUntil(r.nextChargeDate, fromDate) }))
    .filter(
      (x): x is { r: UpcomingRenewal; days: number } =>
        x.days !== null && x.days >= 0 && x.days <= 30,
    )
    .sort((a, b) => a.days - b.days)
    .map(({ r, days }) => ({
      id: r.id,
      merchantName: r.merchantName,
      amountSen: r.amountSen,
      nextChargeDate: r.nextChargeDate,
      days,
    }));
}

/* -------------------------------------------------------------------------- */
/*  Spending trend (fixed synthetic series)                                    */
/* -------------------------------------------------------------------------- */

export interface TrendPoint {
  /** Short label, e.g. 'Mar'. Language-independent month abbreviations. */
  readonly label: string;
  readonly monthlySen: MoneyInSen;
}

/**
 * Recent monthly-commitment trend. Deterministic: the final point is the live
 * engine-computed monthly commitment; the preceding points are a fixed
 * synthetic fixture series (no randomness, no Date) so the chart renders the
 * same every load. This is display data, not a financial computation.
 */
export function spendingTrend(
  currentMonthlySen: MoneyInSen,
): readonly TrendPoint[] {
  const history: readonly MoneyInSen[] = [
    245400, 261800, 253900, 288100, 290400,
  ];
  return [
    ...history.map((monthlySen, i) => ({
      label: TREND_MONTH_LABELS[i] ?? '',
      monthlySen,
    })),
    { label: TREND_MONTH_LABELS[TREND_MONTH_LABELS.length - 1], monthlySen: currentMonthlySen },
  ];
}

/** Fixed trailing-month labels ending at the current month (en abbreviations). */
const TREND_MONTH_LABELS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'] as const;

/* -------------------------------------------------------------------------- */
/*  Alerts                                                                     */
/* -------------------------------------------------------------------------- */

export type AlertKind = 'overrun' | 'due_today' | 'due_this_week';

export interface DashboardAlert {
  readonly kind: AlertKind;
  /** Count or amount context for the message; semantic, not a colour. */
  readonly count: number;
  readonly amountSen?: MoneyInSen;
}

/**
 * Deterministic alert flags from fixtures + the cash-flow summary. A
 * safe-to-spend below zero is a budget overrun; renewal counts come from
 * `daysUntil`. Pure presentation over engine output.
 */
export function buildAlerts(
  renewals: readonly UpcomingRenewal[],
  fromDate: string,
  safeToSpendSen: MoneyInSen,
): readonly DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  if (safeToSpendSen < 0) {
    alerts.push({ kind: 'overrun', count: 1, amountSen: safeToSpendSen });
  }

  const withDays = renewals
    .map((r) => daysUntil(r.nextChargeDate, fromDate))
    .filter((d): d is number => d !== null && d >= 0);

  const dueToday = withDays.filter((d) => d === 0).length;
  if (dueToday > 0) alerts.push({ kind: 'due_today', count: dueToday });

  const dueThisWeek = withDays.filter((d) => d <= 7).length;
  if (dueThisWeek > 0) alerts.push({ kind: 'due_this_week', count: dueThisWeek });

  return alerts;
}

/* -------------------------------------------------------------------------- */
/*  Category spending breakdown                                                */
/* -------------------------------------------------------------------------- */

export type SubscriptionCategory =
  | 'entertainment'
  | 'software'
  | 'telecommunications'
  | 'fitness'
  | 'utilities'
  | 'education'
  | 'other';

export interface CategorySpendingSlice {
  readonly category: SubscriptionCategory;
  readonly labelKey: string;
  readonly monthlySen: MoneyInSen;
  readonly count: number;
  readonly fraction: number;
  readonly percentage: number;
  readonly colorClass: string;
}

const MERCHANT_CATEGORY_MAP: Record<string, SubscriptionCategory> = {
  'anytime fitness': 'fitness',
  'chatgpt plus': 'software',
  'time dotcom': 'telecommunications',
  'time internet': 'telecommunications',
  spotify: 'entertainment',
  netflix: 'entertainment',
  youtube: 'entertainment',
  disney: 'entertainment',
  'icloud+': 'software',
  icloud: 'software',
  openai: 'software',
  canva: 'software',
  namecheap: 'software',
  github: 'software',
  celcomdigi: 'telecommunications',
  celcom: 'telecommunications',
  digi: 'telecommunications',
  maxis: 'telecommunications',
  unifi: 'telecommunications',
  gym: 'fitness',
  fitness: 'fitness',
  classpass: 'fitness',
};

export function inferCategory(merchantName: string): SubscriptionCategory {
  const lower = merchantName.toLowerCase();
  // Check longer specific terms first to avoid false substring collisions
  const sortedEntries = Object.entries(MERCHANT_CATEGORY_MAP).sort(
    ([a], [b]) => b.length - a.length,
  );
  for (const [key, cat] of sortedEntries) {
    if (lower.includes(key)) return cat;
  }
  return 'other';
}

export function spendingByCategory(
  scored: readonly ScoredSubscription[],
): readonly CategorySpendingSlice[] {
  const total = scored.reduce((sum, s) => sum + s.monthlySen, 0);

  const categoryTotals: Record<SubscriptionCategory, { monthlySen: number; count: number }> = {
    entertainment: { monthlySen: 0, count: 0 },
    software: { monthlySen: 0, count: 0 },
    telecommunications: { monthlySen: 0, count: 0 },
    fitness: { monthlySen: 0, count: 0 },
    utilities: { monthlySen: 0, count: 0 },
    education: { monthlySen: 0, count: 0 },
    other: { monthlySen: 0, count: 0 },
  };

  const CATEGORY_COLORS: Record<SubscriptionCategory, string> = {
    entertainment: 'bg-status-rose-text',
    software: 'bg-status-blue-text',
    telecommunications: 'bg-accent',
    fitness: 'bg-status-emerald-text',
    utilities: 'bg-status-amber-text',
    education: 'bg-purple-400',
    other: 'bg-text-faint',
  };

  for (const s of scored) {
    const cat = inferCategory(s.subscription.merchantName);
    categoryTotals[cat].monthlySen += s.monthlySen;
    categoryTotals[cat].count += 1;
  }

  const activeCategories = (Object.keys(categoryTotals) as SubscriptionCategory[])
    .filter((cat) => categoryTotals[cat].count > 0)
    .sort((a, b) => categoryTotals[b].monthlySen - categoryTotals[a].monthlySen);

  return activeCategories.map((cat) => {
    const data = categoryTotals[cat];
    const fraction = total === 0 ? 0 : data.monthlySen / total;
    const percentage = Math.round(fraction * 100);
    return {
      category: cat,
      labelKey: `categories.${cat}`,
      monthlySen: data.monthlySen,
      count: data.count,
      fraction,
      percentage,
      colorClass: CATEGORY_COLORS[cat] ?? 'bg-accent',
    };
  });
}

