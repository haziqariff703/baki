import { describe, it, expect } from 'vitest';
import { detectStudentSavings } from '@/features/student-optimizer';
import type { SubscriptionSchema } from '@/lib/validation';

describe('Malaysian Student Discount Optimizer (§2.1 / §8.1)', () => {
  const testSubscriptions: readonly SubscriptionSchema[] = [
    {
      id: 'sub-1',
      merchantName: 'Spotify',
      amountSen: 1590, // Standard RM 15.90
      cycle: 'monthly',
      nextChargeDate: '2026-08-25T00:00:00.000Z',
      usage: 5,
      necessity: 4,
      affordability: 4,
      uniqueness: 3,
      satisfaction: 5,
    },
    {
      id: 'sub-2',
      merchantName: 'Apple Music',
      amountSen: 1690, // Standard RM 16.90
      cycle: 'monthly',
      nextChargeDate: '2026-08-28T00:00:00.000Z',
      usage: 4,
      necessity: 3,
      affordability: 4,
      uniqueness: 3,
      satisfaction: 4,
    },
    {
      id: 'sub-3',
      merchantName: 'Canva Pro',
      amountSen: 2990, // Standard RM 29.90
      cycle: 'monthly',
      nextChargeDate: '2026-09-01T00:00:00.000Z',
      usage: 4,
      necessity: 4,
      affordability: 4,
      uniqueness: 4,
      satisfaction: 5,
    },
    {
      id: 'sub-4',
      merchantName: 'Netflix',
      amountSen: 5500, // No student plan
      cycle: 'monthly',
      nextChargeDate: '2026-09-05T00:00:00.000Z',
      usage: 3,
      necessity: 2,
      affordability: 3,
      uniqueness: 3,
      satisfaction: 3,
    },
  ];

  it('detects student savings opportunities accurately with integer sen math', () => {
    const result = detectStudentSavings(testSubscriptions, true);

    expect(result.count).toBe(3); // Spotify, Apple Music, Canva Pro

    // 1. Spotify: RM 15.90 -> RM 8.50 (Saves RM 7.40 / mo, RM 88.80 / yr)
    const spotify = result.opportunities.find((o) => o.merchantName === 'Spotify');
    expect(spotify).toBeDefined();
    expect(spotify?.monthlySavingsSen).toBe(740);
    expect(spotify?.annualSavingsSen).toBe(8880);
    expect(spotify?.dealUrl).toContain('spotify.com');

    // 2. Apple Music: RM 16.90 -> RM 8.90 (Saves RM 8.00 / mo, RM 96.00 / yr)
    const apple = result.opportunities.find((o) => o.merchantName === 'Apple Music');
    expect(apple).toBeDefined();
    expect(apple?.monthlySavingsSen).toBe(800);
    expect(apple?.annualSavingsSen).toBe(9600);

    // 3. Canva Pro: RM 29.90 -> RM 0.00 (Saves RM 29.90 / mo, RM 358.80 / yr)
    const canva = result.opportunities.find((o) => o.merchantName === 'Canva Pro');
    expect(canva).toBeDefined();
    expect(canva?.monthlySavingsSen).toBe(2990);
    expect(canva?.annualSavingsSen).toBe(35880);

    // Total savings
    expect(result.totalMonthlySavingsSen).toBe(740 + 800 + 2990);
    expect(result.totalAnnualSavingsSen).toBe((740 + 800 + 2990) * 12);
  });

  it('detects developer, productivity, and telco youth packages', () => {
    const subs: readonly SubscriptionSchema[] = [
      {
        id: 'sub-msft',
        merchantName: 'Microsoft 365',
        amountSen: 2700,
        cycle: 'monthly',
        nextChargeDate: '2026-09-01T00:00:00.000Z',
        usage: 5,
        necessity: 5,
        affordability: 3,
        uniqueness: 4,
        satisfaction: 4,
      },
      {
        id: 'sub-figma',
        merchantName: 'Figma',
        amountSen: 6500,
        cycle: 'monthly',
        nextChargeDate: '2026-09-01T00:00:00.000Z',
        usage: 4,
        necessity: 4,
        affordability: 2,
        uniqueness: 5,
        satisfaction: 5,
      },
      {
        id: 'sub-celcom',
        merchantName: 'CelcomDigi Postpaid',
        amountSen: 6000,
        cycle: 'monthly',
        nextChargeDate: '2026-09-01T00:00:00.000Z',
        usage: 5,
        necessity: 5,
        affordability: 4,
        uniqueness: 3,
        satisfaction: 4,
      },
      {
        id: 'sub-duo',
        merchantName: 'Duolingo',
        amountSen: 2890,
        cycle: 'monthly',
        nextChargeDate: '2026-09-01T00:00:00.000Z',
        usage: 3,
        necessity: 2,
        affordability: 4,
        uniqueness: 3,
        satisfaction: 4,
      },
    ];

    const result = detectStudentSavings(subs, true);
    expect(result.count).toBe(4);

    // Microsoft 365: saves 2700 sen
    const msft = result.opportunities.find((o) => o.merchantName === 'Microsoft 365');
    expect(msft?.monthlySavingsSen).toBe(2700);

    // Figma: saves 6500 sen
    const figma = result.opportunities.find((o) => o.merchantName === 'Figma');
    expect(figma?.monthlySavingsSen).toBe(6500);

    // CelcomDigi Pakej Belia: saves 2000 sen
    const celcom = result.opportunities.find((o) => o.merchantName === 'CelcomDigi');
    expect(celcom?.monthlySavingsSen).toBe(2000);

    // Duolingo: saves 1445 sen
    const duo = result.opportunities.find((o) => o.merchantName === 'Duolingo Super');
    expect(duo?.monthlySavingsSen).toBe(1445);
  });

  it('returns empty results when user is not a student', () => {
    const result = detectStudentSavings(testSubscriptions, false);
    expect(result.count).toBe(0);
    expect(result.opportunities.length).toBe(0);
    expect(result.totalAnnualSavingsSen).toBe(0);
  });
});
