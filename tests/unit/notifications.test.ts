import { describe, it, expect } from 'vitest';
import { generateRenewalNotifications } from '@/features/notifications/logic';
import type { SubscriptionSchema } from '@/lib/validation';

const baseSub: SubscriptionSchema = {
  id: 'sub-1',
  merchantName: 'Spotify',
  amountSen: 1590,
  cycle: 'monthly',
  nextChargeDate: '2026-08-23T00:00:00.000Z',
  usage: 4,
  necessity: 4,
  affordability: 4,
  uniqueness: 4,
  satisfaction: 4,
};

describe('Renewal Notifications Engine (§2.1 / §8.1 / §9)', () => {
  it('generates upcoming renewal notification within lead time', () => {
    const subs = [baseSub];
    const summary = generateRenewalNotifications(subs, {
      reminderDaysBefore: 3,
      currentDateIso: '2026-08-20T00:00:00.000Z',
    });

    expect(summary.items.length).toBe(1);
    expect(summary.items[0].type).toBe('renewal_upcoming');
    expect(summary.items[0].daysRemaining).toBe(3);
    expect(summary.items[0].amountSen).toBe(1590);
    expect(summary.unreadCount).toBe(1);
  });

  it('generates renewal_today critical alert when remaining days is 0', () => {
    const subs = [{ ...baseSub, nextChargeDate: '2026-08-20T00:00:00.000Z' }];
    const summary = generateRenewalNotifications(subs, {
      reminderDaysBefore: 3,
      currentDateIso: '2026-08-20T00:00:00.000Z',
    });

    expect(summary.items.length).toBe(1);
    expect(summary.items[0].type).toBe('renewal_today');
    expect(summary.items[0].severity).toBe('critical');
    expect(summary.items[0].daysRemaining).toBe(0);
  });

  it('respects readIds set and reports unread count accurately', () => {
    const subs = [baseSub];
    const readIds = new Set(['renewal-sub-1-2026-08-23T00:00:00.000Z']);
    const summary = generateRenewalNotifications(subs, {
      reminderDaysBefore: 3,
      currentDateIso: '2026-08-20T00:00:00.000Z',
      readIds,
    });

    expect(summary.items.length).toBe(1);
    expect(summary.items[0].isRead).toBe(true);
    expect(summary.unreadCount).toBe(0);
  });
});
