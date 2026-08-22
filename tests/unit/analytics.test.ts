import { describe, it, expect } from 'vitest';
import { buildSpendingTrend } from '@/features/dashboard/analytics';

describe('Spending Trend Analytics Engine (§8.1 / §2.1)', () => {
  const mockRefDate = new Date(Date.UTC(2026, 7, 22)); // Aug 2026

  it('returns flat 0 sen points for new users with no commitment or transactions', () => {
    const points = buildSpendingTrend(0, [], mockRefDate);
    expect(points.length).toBe(12);
    expect(points[11].label).toBe('Aug');
    expect(points.every((p) => p.monthlySen === 0)).toBe(true);
  });

  it('aggregates real user transactions into proper calendar month buckets', () => {
    const transactions = [
      { transactionDate: '2026-08-10T10:00:00Z', amountSen: 1590 },
      { transactionDate: '2026-08-15T12:00:00Z', amountSen: 5490 },
      { transactionDate: '2026-07-20T08:00:00Z', amountSen: 9490 },
      { transactionDate: '2026-06-05T09:00:00Z', amountSen: 14900 },
    ];

    const points = buildSpendingTrend(7080, transactions, mockRefDate);
    expect(points.length).toBe(12);

    // June: 149.00
    const junPoint = points.find((p) => p.label === 'Jun');
    expect(junPoint?.monthlySen).toBe(14900);

    // July: 94.90
    const julPoint = points.find((p) => p.label === 'Jul');
    expect(julPoint?.monthlySen).toBe(9490);

    // August (current): 15.90 + 54.90 = 70.80 (7080 sen)
    const augPoint = points.find((p) => p.label === 'Aug');
    expect(augPoint?.monthlySen).toBe(7080);
  });

  it('handles active subscriptions when no historical transactions are recorded', () => {
    const points = buildSpendingTrend(5000, [], mockRefDate);
    expect(points.length).toBe(12);
    expect(points[11].monthlySen).toBe(5000);
    expect(points[11].label).toBe('Aug');
  });
});
