import { describe, it, expect } from 'vitest';
import {
  inferCategory,
  spendingByCategory,
  buildScoredSubscriptions,
} from '@/features/dashboard/analytics';
import { syntheticSubscriptions } from '@/tests/fixtures/subscriptions';

describe('Dashboard Category Analytics', () => {
  it('infers correct categories for known merchants', () => {
    expect(inferCategory('Spotify')).toBe('entertainment');
    expect(inferCategory('Netflix')).toBe('entertainment');
    expect(inferCategory('iCloud+')).toBe('software');
    expect(inferCategory('ChatGPT Plus')).toBe('software');
    expect(inferCategory('CelcomDigi')).toBe('telecommunications');
    expect(inferCategory('Anytime Fitness')).toBe('fitness');
    expect(inferCategory('Unknown Merchant')).toBe('other');
  });

  it('aggregates subscription spending into sorted lifestyle categories with integer sen totals', () => {
    const scored = buildScoredSubscriptions(syntheticSubscriptions);
    const categorySlices = spendingByCategory(scored);

    expect(categorySlices.length).toBeGreaterThan(0);

    // Verify all categories sum up to the total
    const totalSen = scored.reduce((sum, s) => sum + s.monthlySen, 0);
    const categoryTotalSen = categorySlices.reduce((sum, c) => sum + c.monthlySen, 0);
    expect(categoryTotalSen).toBe(totalSen);

    // Verify descending order by monthly sen
    for (let i = 0; i < categorySlices.length - 1; i++) {
      expect(categorySlices[i].monthlySen).toBeGreaterThanOrEqual(categorySlices[i + 1].monthlySen);
    }

    // Verify percentages sum to ~100%
    const totalPercentage = categorySlices.reduce((sum, c) => sum + c.percentage, 0);
    expect(totalPercentage).toBeGreaterThanOrEqual(95);
    expect(totalPercentage).toBeLessThanOrEqual(105);
  });
});
