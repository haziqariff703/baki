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

export interface DetectableTransaction {
  readonly id?: string;
  readonly merchantName: string;
  readonly amountSen: number;
  readonly transactionDate: string;
}

/**
 * Deterministic recurring cadence and subscription candidate detection (AGENTS.md §2.1).
 * Detects recurring payments from:
 * 1. Multi-occurrence cadence (>= 2 transactions grouped by merchant).
 * 2. Curated Malaysian subscription catalog matches (e.g. Spotify, Netflix, Telcos, Software).
 */
export function detectRecurringCadence(
  transactions: readonly DetectableTransaction[],
): readonly Omit<RecurringCandidate, 'id' | 'status' | 'detectedAt'>[] {
  const groups = new Map<string, DetectableTransaction[]>();

  for (const t of transactions) {
    const name = t.merchantName.trim();
    if (!groups.has(name)) {
      groups.set(name, []);
    }
    groups.get(name)!.push(t);
  }

  const candidates: Omit<RecurringCandidate, 'id' | 'status' | 'detectedAt'>[] = [];

  for (const [merchantName, txs] of groups.entries()) {
    // Sort by transaction date ascending
    const sorted = [...txs].sort(
      (a, b) =>
        new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime(),
    );

    const latest = sorted[sorted.length - 1];

    if (txs.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        const diffMs =
          new Date(sorted[i].transactionDate).getTime() -
          new Date(sorted[i - 1].transactionDate).getTime();
        intervals.push(diffMs / (1000 * 60 * 60 * 24));
      }

      const avgInterval = intervals.reduce((acc, v) => acc + v, 0) / intervals.length;
      if (avgInterval > 0) {
        candidates.push({
          merchantName: latest.merchantName,
          amountSen: latest.amountSen,
          occurrenceCount: sorted.length,
          intervalDays: Math.round(avgInterval),
          aiConfidence: 0.98,
        });
        continue;
      }
    }

    // For single-occurrence transactions, detect known subscriptions from catalog
    const resolved = resolveMerchant(merchantName);
    if (resolved.isKnownMerchant) {
      candidates.push({
        merchantName: resolved.canonicalName,
        amountSen: latest.amountSen,
        occurrenceCount: 1,
        intervalDays: 30, // Standard 30-day monthly cadence assumption for single statement
        aiConfidence: 0.90,
      });
    }
  }

  return candidates;
}
