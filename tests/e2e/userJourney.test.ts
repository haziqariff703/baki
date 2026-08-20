/**
 * End-to-End User Journey Integration Suite (AGENTS.md §15, §18).
 *
 * Tests the complete, unbroken lifecycle of a Malaysian student/young adult user:
 * 1. Statement Ingestion (CSV/PDF transaction data).
 * 2. Multi-Tiered Recurring Detection (Catalog matching + Non-subscription exclusion).
 * 3. Review Queue Triage (Pre-confirm edit, confirmation, cycle & date derivation).
 * 4. 5-Criterion Value Scoring Matrix & Deterministic Recommendations.
 * 5. Student Discount Optimizer & Deal Surfacing.
 * 6. Cash-Flow Commitment Forecasting & Timeline.
 * 7. In-App / Email Renewal Reminder Evaluation.
 * 8. PDPA Privacy Controls (Consent, Export serialization, Account deletion phrase gate).
 */

import { describe, expect, it } from 'vitest';
import { parseCsv } from '@/features/imports/csvParser';
import {
  detectRecurringCadence,
  applyConfirmation,
  applyEdit,
  cycleFromIntervalDays,
  nextChargeAfterCycle,
  toSubscription,
} from '@/features/recurring-detection';
import { computeScoreResult } from '@/features/scoring';
import { detectStudentSavings } from '@/features/student-optimizer';
import { computeCashFlowSummary } from '@/features/cash-flow';
import { generateRenewalNotifications } from '@/features/notifications';
import { serializeCsv, serializeJson, type AssembledExport } from '@/features/privacy';
import { validateDeletionConfirmation, DELETION_PHRASE } from '@/features/consent';

describe('Baki End-to-End User Journey (§15 Complete MVP Pipeline)', () => {
  it('executes the full user lifecycle without regressions', () => {
    // -------------------------------------------------------------------------
    // STEP 1: Bank Statement Ingestion
    // -------------------------------------------------------------------------
    const rawBankCsv = [
      'Date,Description,Amount',
      '2026-06-01,SPTF*SPOTIFY MALAYSIA,15.90',
      '2026-07-01,SPTF*SPOTIFY MALAYSIA,15.90',
      '2026-08-01,SPTF*SPOTIFY MALAYSIA,15.90',
      '2026-07-05,CELCOMDIGI POSTPAID BILL,60.00',
      '2026-08-05,CELCOMDIGI POSTPAID BILL,60.00',
      '2026-08-03,NETFLIX COM MY,45.00',
      // Non-subscription transactions (to test filtering)
      '2026-08-01,Restoran Nasi Kandar Pelita,14.50',
      '2026-08-03,Restoran Nasi Kandar Pelita,18.00',
      '2026-08-02,99 Speedmart Setapak,24.50',
      '2026-08-04,DuitNow Transfer to Ahmad,50.00',
      '2026-08-07,TNG Reload E-Wallet,50.00',
    ].join('\n');

    const csvResult = parseCsv(rawBankCsv);
    expect(csvResult.errors).toHaveLength(0);
    expect(csvResult.rows.length).toBe(11);

    // -------------------------------------------------------------------------
    // STEP 2: Recurring Detection & Non-Subscription Filtering
    // -------------------------------------------------------------------------
    const detectableTransactions = csvResult.rows.map((r, index) => ({
      id: `tx-${index}`,
      merchantName: r.merchantName,
      amountSen: r.amountSen,
      transactionDate: r.transactionDate,
    }));

    const candidates = detectRecurringCadence(detectableTransactions);

    // Non-subscriptions (Mamak, Speedmart, DuitNow, TNG) must be filtered out!
    expect(candidates).toHaveLength(3);
    const merchantNames = candidates.map((c) => c.merchantName).sort();
    expect(merchantNames).toEqual(['CelcomDigi', 'Netflix', 'Spotify']);

    // -------------------------------------------------------------------------
    // STEP 3: Review Queue Triage & Confirmation
    // -------------------------------------------------------------------------
    const spotifyCandidate = candidates.find((c) => c.merchantName === 'Spotify')!;
    expect(spotifyCandidate.occurrenceCount).toBe(3);
    expect(spotifyCandidate.intervalDays).toBeGreaterThanOrEqual(28);

    // Human edits candidate name before confirming
    const rawCandidateObj = {
      id: 'cand-spotify-1',
      merchantName: spotifyCandidate.merchantName,
      amountSen: spotifyCandidate.amountSen,
      occurrenceCount: spotifyCandidate.occurrenceCount,
      intervalDays: spotifyCandidate.intervalDays,
      aiConfidence: spotifyCandidate.aiConfidence,
      detectedAt: '2026-08-01T00:00:00.000Z',
      status: { state: 'pending' as const },
    };

    const editedCandidate = applyEdit(rawCandidateObj, {
      merchantName: 'Spotify Premium',
    });
    expect(editedCandidate.merchantName).toBe('Spotify Premium');

    // Confirm candidate
    const confirmedAt = '2026-08-10T12:00:00.000Z';
    const confirmedCandidate = applyConfirmation(editedCandidate, {
      action: 'confirm',
      confirmedAt,
    });
    expect(confirmedCandidate.status.state).toBe('confirmed');

    // Deterministic cycle & next charge derivation
    const cycle = cycleFromIntervalDays(confirmedCandidate.intervalDays);
    expect(cycle).toBe('monthly');

    const nextChargeDate = nextChargeAfterCycle('2026-08-01T00:00:00.000Z', cycle);
    expect(nextChargeDate).toBe('2026-09-01T00:00:00.000Z');

    const subscription = toSubscription(confirmedCandidate);
    expect(subscription).not.toBeNull();
    expect(subscription?.amountSen).toBe(1590);

    // -------------------------------------------------------------------------
    // STEP 4: 5-Criterion Value Scoring Matrix & Safeguards
    // -------------------------------------------------------------------------
    // User evaluates ratings: Usage=5, Necessity=4, Affordability=5, Uniqueness=4, Satisfaction=5
    const ratings = {
      usage: 5,
      necessity: 4,
      affordability: 5,
      uniqueness: 4,
      satisfaction: 5,
    };

    const scoreResult = computeScoreResult(ratings);
    // (5*0.25 + 4*0.25 + 5*0.20 + 4*0.15 + 5*0.15) / 5 * 100 = (1.25 + 1.0 + 1.0 + 0.6 + 0.75) / 5 * 100 = 4.6 / 5 * 100 = 92
    expect(scoreResult.score).toBe(92);
    expect(scoreResult.band).toBe('high');
    expect(scoreResult.recommendation.type).toBe('keep');

    // -------------------------------------------------------------------------
    // STEP 5: Student Discount Optimizer
    // -------------------------------------------------------------------------
    const evaluatedSubscription = {
      id: 'sub-spotify-1',
      merchantName: 'Spotify',
      amountSen: 1590, // Standard RM 15.90
      cycle: 'monthly' as const,
      nextChargeDate: '2026-09-01T00:00:00.000Z',
      usage: 5,
      necessity: 4,
      affordability: 5,
      uniqueness: 4,
      satisfaction: 5,
    };

    const studentSavings = detectStudentSavings([evaluatedSubscription]);
    expect(studentSavings.totalMonthlySavingsSen).toBe(740); // RM 15.90 -> RM 8.50 (RM 7.40 savings)
    expect(studentSavings.opportunities).toHaveLength(1);
    expect(studentSavings.opportunities[0].studentAmountSen).toBe(850);
    expect(studentSavings.opportunities[0].merchantName).toBe('Spotify');

    // -------------------------------------------------------------------------
    // STEP 6: Cash-Flow Forecasting & Upcoming Timeline
    // -------------------------------------------------------------------------
    const activeRenewals = [
      {
        id: 'sub-spotify',
        merchantName: 'Spotify',
        amountSen: 1590,
        cycle: 'monthly' as const,
        nextChargeDate: '2026-08-28T00:00:00.000Z',
      },
      {
        id: 'sub-celcom',
        merchantName: 'CelcomDigi',
        amountSen: 6000,
        cycle: 'monthly' as const,
        nextChargeDate: '2026-09-05T00:00:00.000Z',
      },
      {
        id: 'sub-netflix',
        merchantName: 'Netflix',
        amountSen: 4500,
        cycle: 'monthly' as const,
        nextChargeDate: '2026-09-03T00:00:00.000Z',
      },
    ];

    const cashFlow = computeCashFlowSummary(
      activeRenewals,
      100000, // Available balance RM 1000.00
      '2026-08-20T00:00:00.000Z',
    );
    // Total: 1590 + 6000 + 4500 = 12090 Sen (RM 120.90)
    expect(cashFlow.monthlyCommitmentSen).toBe(12090);
    expect(cashFlow.annualisedTotalSen).toBe(12090 * 12);
    expect(cashFlow.safeToSpendSen).toBe(100000 - 12090);
    expect(cashFlow.upcomingCount).toBe(3);

    // -------------------------------------------------------------------------
    // STEP 7: Renewal Alert Notification Engine
    // -------------------------------------------------------------------------
    // Today is 2026-08-21; Spotify is renewing on 2026-08-24 (within 3 days lead time!)
    const subscriptionsForAlerts = [
      {
        id: 'sub-spotify',
        merchantName: 'Spotify',
        amountSen: 1590,
        cycle: 'monthly' as const,
        nextChargeDate: '2026-08-24T00:00:00.000Z',
        usage: 5,
        necessity: 4,
        affordability: 5,
        uniqueness: 4,
        satisfaction: 5,
      },
    ];

    const notifications = generateRenewalNotifications(
      subscriptionsForAlerts,
      {
        currentDateIso: '2026-08-21T00:00:00.000Z',
        reminderDaysBefore: 3,
      },
    );

    expect(notifications.unreadCount).toBe(1);
    expect(notifications.items).toHaveLength(1);
    expect(notifications.items[0].daysRemaining).toBe(3);
    expect(notifications.items[0].merchantName).toBe('Spotify');

    // -------------------------------------------------------------------------
    // STEP 8: PDPA Privacy Governance, Export & Account Deletion Gate
    // -------------------------------------------------------------------------
    // 1. Export serialization (JSON & CSV)
    const exportData: AssembledExport = {
      format: 'json',
      generatedAt: '2026-08-20T00:00:00.000Z',
      ruleVersion: 'v1',
      consents: [
        {
          purpose: 'analytics',
          status: 'granted',
          version: '1.0',
          grantedAt: '2026-08-01T00:00:00.000Z',
          withdrawnAt: null,
        },
      ],
      subscriptions: [
        {
          id: 'sub-spotify',
          merchantName: 'Spotify',
          amountSen: 1590,
          cycle: 'monthly',
          nextChargeDate: '2026-08-28T00:00:00.000Z',
          usage: 5,
          necessity: 4,
          affordability: 5,
          uniqueness: 4,
          satisfaction: 5,
        },
      ],
      candidates: [rawCandidateObj],
    };

    const jsonExport = serializeJson(exportData);
    expect(jsonExport).toContain('"Spotify"');
    expect(jsonExport).toContain('"cand-spotify-1"');

    const csvExport = serializeCsv(exportData);
    expect(csvExport).toContain('Section,Identifier,Status,Timestamp');
    expect(csvExport).toContain('Subscription,Spotify,monthly,2026-08-28T00:00:00.000Z');

    // 2. Deletion Confirmation Gate
    const wrongPhraseGate = validateDeletionConfirmation('WRONG_PHRASE', DELETION_PHRASE);
    expect(wrongPhraseGate.allowed).toBe(false);

    const correctPhraseGate = validateDeletionConfirmation('DELETE', DELETION_PHRASE);
    expect(correctPhraseGate.allowed).toBe(true);
  });
});
