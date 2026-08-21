import { describe, it, expect } from 'vitest';
import { detectPriceCreep } from '@/features/recurring-detection';

describe('Stealth Price Creep / Hike Detector (§2.1)', () => {
  it('detects a price increase between statement cycles', () => {
    const prev = { amountSen: 4500, date: '2026-07-01' };
    const current = { amountSen: 4990, date: '2026-08-01' };

    const event = detectPriceCreep(current, prev, 'Netflix');
    expect(event).not.toBeNull();
    expect(event?.merchantName).toBe('Netflix');
    expect(event?.deltaSen).toBe(490);
    expect(event?.percentageIncrease).toBe(11); // 4.90 / 45.00 ≈ 11%
  });

  it('returns null when charge remains identical or decreases', () => {
    const prev = { amountSen: 1590, date: '2026-07-01' };
    const current = { amountSen: 1590, date: '2026-08-01' };

    const event = detectPriceCreep(current, prev, 'Spotify');
    expect(event).toBeNull();
  });
});
