/**
 * Pure deterministic logic for recurring-payment candidates.
 *
 * AGENTS.md §2.1: same input → same output, no LLM, no randomness.
 * §2.2: `applyConfirmation` is the ONLY way a candidate changes state, and it
 * always requires an explicit human decision with a timestamp.
 */

import { senToMyr } from '@/lib/money';
import { resolveMerchant } from '@/features/merchants';
import type { BillingCycle } from '@/features/cash-flow';
import type {
  CandidateEdit,
  ConfirmationDecision,
  ConfirmedSubscription,
  MoneyInSen,
  RecurringCandidate,
} from './types';

/**
 * Format cadence evidence as a compact mono-friendly string, e.g.
 * "3× · ~30d". Language-independent; the surrounding label is localized.
 */
export function formatCadenceEvidence(
  occurrenceCount: number,
  intervalDays: number,
): string {
  return `${occurrenceCount}× · ~${intervalDays}d`;
}

/**
 * Non-authoritative hint derived from AI confidence (§13.1 advisory only).
 * Returns a language-independent token; never drives an automatic action.
 */
export function deriveRecommendationHint(
  candidate: RecurringCandidate,
): 'likely_recurring' | 'uncertain' | 'needs_review' {
  if (candidate.aiConfidence >= 0.8 && candidate.occurrenceCount >= 3) {
    return 'likely_recurring';
  }
  if (candidate.aiConfidence >= 0.5) {
    return 'uncertain';
  }
  return 'needs_review';
}

/**
 * Apply a human confirmation decision to a candidate (§2.2).
 *
 * Only `pending` candidates may transition. Confirming an already-decided
 * candidate is a no-op that returns the candidate unchanged, so the UI can
 * never double-confirm or resurrect a rejected candidate.
 */
export function applyConfirmation(
  candidate: RecurringCandidate,
  decision: ConfirmationDecision,
): RecurringCandidate {
  if (candidate.status.state !== 'pending') {
    return candidate;
  }

  if (decision.action === 'confirm') {
    return {
      ...candidate,
      status: { state: 'confirmed', confirmedAt: decision.confirmedAt },
    };
  }

  return {
    ...candidate,
    status: { state: 'rejected', rejectedAt: decision.rejectedAt },
  };
}

/** Apply an in-place edit to a pending candidate (merchant/amount). */
export function applyEdit(
  candidate: RecurringCandidate,
  edit: CandidateEdit,
): RecurringCandidate {
  if (candidate.status.state !== 'pending') {
    return candidate;
  }
  return {
    ...candidate,
    merchantName: edit.merchantName ?? candidate.merchantName,
    amountSen: edit.amountSen ?? candidate.amountSen,
  };
}

/** Project a confirmed candidate into an active subscription row. */
export function toSubscription(
  candidate: RecurringCandidate,
): ConfirmedSubscription | null {
  if (candidate.status.state !== 'confirmed') {
    return null;
  }
  return {
    id: candidate.id,
    merchantName: candidate.merchantName,
    amountSen: candidate.amountSen,
    intervalDays: candidate.intervalDays,
    confirmedAt: candidate.status.confirmedAt,
  };
}

/** Format the authoritative sen amount for display (delegates to lib/money). */
export function formatAmount(amountSen: MoneyInSen): string {
  return senToMyr(amountSen);
}

/**
 * Map an observed interval to the closest billing cycle (deterministic, §2.1).
 *
 * Thresholds (in days): ≤10 → weekly, ≤45 → monthly, ≤100 → quarterly,
 * otherwise yearly. Same input always yields the same cycle.
 */
export function cycleFromIntervalDays(intervalDays: number): BillingCycle {
  if (intervalDays <= 10) return 'weekly';
  if (intervalDays <= 45) return 'monthly';
  if (intervalDays <= 100) return 'quarterly';
  return 'yearly';
}

/**
 * Calendar-aware next charge date (§9): adds one billing cycle to `fromDate`
 * using UTC calendar arithmetic — never fixed-millisecond addition.
 * Clamps to end-of-month when the target day doesn't exist (e.g. 31st → Feb 28).
 */
export function nextChargeAfterCycle(
  fromDate: string,
  cycle: BillingCycle,
): string {
  const from = new Date(fromDate);
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const day = from.getUTCDate();

  if (cycle === 'weekly') {
    return new Date(Date.UTC(year, month, day + 7)).toISOString();
  }
  if (cycle === 'monthly') {
    // Day clamp: e.g. Jan 31 + 1 month → Feb 28/29, not Mar 2/3.
    const lastDayOfNext = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
    const clamped = Math.min(day, lastDayOfNext);
    return new Date(Date.UTC(year, month + 1, clamped)).toISOString();
  }
  if (cycle === 'quarterly') {
    const lastDayOfTarget = new Date(Date.UTC(year, month + 4, 0)).getUTCDate();
    const clamped = Math.min(day, lastDayOfTarget);
    return new Date(Date.UTC(year, month + 3, clamped)).toISOString();
  }
  // yearly — clamp for Feb 29 → Feb 28 in non-leap target years (§9).
  const lastDayOfNextYearMonth = new Date(Date.UTC(year + 1, month + 1, 0)).getUTCDate();
  const clampedYearly = Math.min(day, lastDayOfNextYearMonth);
  return new Date(Date.UTC(year + 1, month, clampedYearly)).toISOString();
}

import {
  canonicalMerchantName,
  normalizeMerchantToKey,
} from '@/features/subscriptions/brandRegistry';

/**
 * Common non-subscription spending patterns in Malaysian banking statements.
 * Everyday retail, groceries, dining, peer-to-peer transfers, and top-ups
 * must NEVER be auto-promoted to subscription candidates (AGENTS.md §2.1).
 */
export const NON_SUBSCRIPTION_PATTERNS: readonly RegExp[] = [
  // 1. Peer-to-peer / Direct Transfers / Remittance
  /\b(?:duitnow(?:\s*transfer|\s*qr)?(?:\s*to)?|instant\s*transfer|fund\s*transfer|3rd\s*party\s*transfer|ibg(?:\s*transfer|\s*to)?|interbank\s*giro|remittance)\b/i,
  // 2. Banking, Cash & Service Fees
  /\b(?:atm\s*cash|meps\s*cash|cash\s*withdrawal|pengeluaran\s*wang|service\s*charge|late\s*charge|interest|faedah|cukai|annual\s*fee|stamp\s*duty)\b/i,
  // 3. E-Wallet Top-ups & Prepaid Reloads (excluding actual subscriptions like GrabUnlimited)
  /\b(?:topup|top\s*up|reload|prepaid\s*reload|tng\s*reload|tng\s*topup|touch\s*n\s*go\s*topup|tng\s*ewallet(?:\s*reload)?|grabpay\s*topup|boost\s*topup|shopeepay\s*topup|bigpay\s*topup|ewallet\s*reload)\b/i,
  // 4. Petrol Stations & Fuel
  /\b(?:petronas|shell|caltex|bhp\s*petrol|petron|stesen\s*minyak|petrol\s*station|petrol\s*pump)\b/i,
  // 5. Groceries, Supermarkets & Convenience Stores
  /\b(?:99\s*speedmart|speedmart|kk\s*supermart|kk\s*mart|7-eleven|7\s*eleven|familymart|family\s*mart|my\s*news|mynews|cu\s*mart|emart|jaya\s*grocer|village\s*grocer|lotus'?s?|tesco|aeon(?:\s*big|\s*co)?|mydin|econsave|hero\s*market|bila-bila|nasken|nsk\s*trade|pasar\s*malam|pasar\s*pagi|kedai\s*runcit|pasaraya|supermarket|hypermarket|grocer)\b/i,
  // 6. Dining, Cafes, Mamaks, Restaurants, Fast Food
  /\b(?:mcdonald'?s?|mcd|kfc|starbucks|zus\s*coffee|tealive|mixue|chagee|gong\s*cha|koi\s*the|baskin\s*robbins|subway|pizza\s*hut|burger\s*king|domino'?s?|texas\s*chicken|marrybrown|secret\s*recipe|nando'?s?|sushi\s*king|cu\s*mart|oldtown|kopitiam|mamak|warung|restoran|restaurant|cafe|coffee|bakery|bistro|food\s*court|kedai\s*kopi|dobi|laundry)\b/i,
  // 7. General E-Commerce Retail & Food Delivery Orders
  /\b(?:grabfood|foodpanda|shopee|lazada|tiktok\s*shop|taobao|zalora|shein)\b/i,
  // 8. Parking & Highway Tolls
  /\b(?:touch\s*n\s*go\s*toll|tng\s*toll|rfid\s*toll|plus\s*toll|parking|valet|jom\s*parkir|flexi\s*parking)\b/i,
  // 9. Pharmacy & Retail Stores
  /\b(?:watsons|guardian|caring\s*pharmacy|big\s*pharmacy|klinik|clinic|hospital|farmasi|mr\s*diy|eco\s*shop|daiso|uniqlo|padini|h&m|decathlon)\b/i,
];

/**
 * Checks whether a merchant descriptor represents typical one-off or discretionary spending.
 */
export function isNonSubscriptionExpense(descriptor: string): boolean {
  const normalized = descriptor.trim().toLowerCase();
  for (const pattern of NON_SUBSCRIPTION_PATTERNS) {
    if (pattern.test(normalized)) return true;
  }
  return false;
}

/**
 * Normalizes a raw transaction merchant string to a grouping key.
 * Strips bank transaction noise, reference numbers, phone numbers, and payment rails.
 */
export function getMerchantGroupKey(raw: string): {
  key: string;
  displayName: string;
  isSubscription: boolean;
} {
  const resolved = resolveMerchant(raw);
  if (resolved.isKnownMerchant) {
    return {
      key: resolved.canonicalName.toLowerCase(),
      displayName: resolved.canonicalName,
      isSubscription: true,
    };
  }

  const cleaned = normalizeMerchantToKey(raw);
  const normalizedKey = cleaned.toLowerCase();
  const displayName = canonicalMerchantName(raw);
  return {
    key: normalizedKey.length > 0 ? normalizedKey : raw.trim().toLowerCase(),
    displayName,
    isSubscription: false,
  };
}

export interface DetectableTransaction {
  readonly id?: string;
  readonly merchantName: string;
  readonly amountSen: number;
  readonly transactionDate: string;
}

/**
 * Verifies if a series of transactions represents a genuine recurring subscription cadence.
 * Returns whether it qualifies and the calculated confidence score.
 */
export function evaluateCadenceInvariants(
  intervals: readonly number[],
  amounts: readonly number[],
): { isRecurring: boolean; avgInterval: number; confidence: number } {
  if (intervals.length === 0) {
    return { isRecurring: false, avgInterval: 30, confidence: 0 };
  }

  const avgInterval = intervals.reduce((acc, v) => acc + v, 0) / intervals.length;

  // 1. Minimum interval check: Transactions spaced < 14 days apart are frequent retail shopping,
  // NOT a standard monthly subscription (unless they fit weekly cadence 6-8 days with identical amounts).
  const isWeekly = avgInterval >= 5 && avgInterval <= 9 && intervals.every((iv) => iv >= 4 && iv <= 11);
  const isMonthly = avgInterval >= 24 && avgInterval <= 36 && intervals.every((iv) => iv >= 18 && iv <= 45);
  const isQuarterly = avgInterval >= 75 && avgInterval <= 105;
  const isYearly = avgInterval >= 340 && avgInterval <= 390;

  if (!isWeekly && !isMonthly && !isQuarterly && !isYearly) {
    return { isRecurring: false, avgInterval: Math.round(avgInterval), confidence: 0 };
  }

  // 2. Amount Consistency check:
  const isIdenticalAmount = amounts.every((amt) => amt === amounts[0]);
  const minAmt = Math.min(...amounts);
  const maxAmt = Math.max(...amounts);
  const variancePct = minAmt > 0 ? (maxAmt - minAmt) / minAmt : 1;

  // Uncataloged candidates require identical amounts (e.g. fixed rent, gym, insurance)
  // or very low variance (< 15% for slight utility fluctuations)
  if (!isIdenticalAmount && variancePct > 0.20) {
    return { isRecurring: false, avgInterval: Math.round(avgInterval), confidence: 0 };
  }

  const confidence = isIdenticalAmount ? 0.99 : 0.92;
  return { isRecurring: true, avgInterval: Math.max(1, Math.round(avgInterval)), confidence };
}

/**
 * Deterministic recurring cadence and subscription candidate detection (AGENTS.md §2.1).
 * Detects recurring payments from:
 * 1. Curated Malaysian subscription catalog matches (e.g. Spotify, Netflix, Telcos, Software, Utilities).
 * 2. Multi-occurrence cadence (>= 2 transactions with verified recurring monthly/weekly intervals & consistent amounts).
 *
 * Automatically filters out non-subscription expenses (groceries, food, petrol, e-wallet top-ups, transfers).
 */
export function detectRecurringCadence(
  transactions: readonly DetectableTransaction[],
): readonly Omit<RecurringCandidate, 'id' | 'status' | 'detectedAt'>[] {
  const groups = new Map<
    string,
    {
      info: { key: string; displayName: string; isSubscription: boolean };
      items: DetectableTransaction[];
    }
  >();

  for (const t of transactions) {
    const info = getMerchantGroupKey(t.merchantName);
    if (!groups.has(info.key)) {
      groups.set(info.key, { info, items: [] });
    }
    groups.get(info.key)!.items.push(t);
  }

  const candidates: Omit<RecurringCandidate, 'id' | 'status' | 'detectedAt'>[] = [];

  for (const { info, items: txs } of groups.values()) {
    // Sort by transaction date ascending
    const sorted = [...txs].sort(
      (a, b) =>
        new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime(),
    );

    const latest = sorted[sorted.length - 1];

    // Priority 1: Known catalog subscriptions (e.g. CelcomDigi, Netflix, TNB)
    if (info.isSubscription) {
      if (txs.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < sorted.length; i++) {
          const diffMs =
            new Date(sorted[i].transactionDate).getTime() -
            new Date(sorted[i - 1].transactionDate).getTime();
          const days = diffMs / (1000 * 60 * 60 * 24);
          if (days > 0) intervals.push(days);
        }

        const avgInterval =
          intervals.length > 0
            ? intervals.reduce((acc, v) => acc + v, 0) / intervals.length
            : 30;

        candidates.push({
          merchantName: info.displayName,
          amountSen: latest.amountSen,
          occurrenceCount: sorted.length,
          intervalDays: Math.max(1, Math.round(avgInterval)),
          aiConfidence: 0.99,
        });
      } else {
        // Single-occurrence verified catalog subscription
        candidates.push({
          merchantName: info.displayName,
          amountSen: latest.amountSen,
          occurrenceCount: 1,
          intervalDays: 30,
          aiConfidence: 0.90,
        });
      }
      continue;
    }

    // Priority 2: Exclude non-subscription expenses (Groceries, Food, Transfers, Petrol, Top-ups)
    if (isNonSubscriptionExpense(info.displayName) || isNonSubscriptionExpense(latest.merchantName)) {
      continue;
    }

    // Priority 3: Uncataloged multi-occurrence cadence (e.g. Gym, Rental, Insurance, Loan commitments)
    if (txs.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        const diffMs =
          new Date(sorted[i].transactionDate).getTime() -
          new Date(sorted[i - 1].transactionDate).getTime();
        const days = diffMs / (1000 * 60 * 60 * 24);
        if (days > 0) intervals.push(days);
      }

      const amounts = sorted.map((s) => s.amountSen);
      const evaluation = evaluateCadenceInvariants(intervals, amounts);

      if (evaluation.isRecurring) {
        candidates.push({
          merchantName: info.displayName,
          amountSen: latest.amountSen,
          occurrenceCount: sorted.length,
          intervalDays: evaluation.avgInterval,
          aiConfidence: evaluation.confidence,
        });
      }
    }
  }

  return candidates;
}
