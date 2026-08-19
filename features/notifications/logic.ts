import type { SubscriptionSchema } from '@/lib/validation';
import type { NotificationItem, NotificationSummary } from './types';
import { daysUntil } from '@/lib/dates';
import { senToMyr } from '@/lib/money';

/**
 * Pure deterministic notification generator (§2.1 / §8.1).
 *
 * Scans active user subscriptions and produces upcoming renewal notifications
 * based on user's configured alert lead time (e.g. 7d, 3d, 1d).
 */
export function generateRenewalNotifications(
  subscriptions: readonly SubscriptionSchema[],
  options: {
    readonly reminderDaysBefore?: number;
    readonly currentDateIso?: string;
    readonly readIds?: ReadonlySet<string>;
  } = {}
): NotificationSummary {
  const reminderDays = options.reminderDaysBefore ?? 3;
  const nowIso = options.currentDateIso ?? new Date().toISOString();
  const readIds = options.readIds ?? new Set<string>();

  const items: NotificationItem[] = [];

  for (const sub of subscriptions) {
    const remaining = daysUntil(sub.nextChargeDate, nowIso);
    if (remaining === null) continue;

    // Trigger if renewal is today or within the reminder lead time
    if (remaining >= 0 && remaining <= reminderDays) {
      const isToday = remaining === 0;
      const id = `renewal-${sub.id}-${sub.nextChargeDate}`;
      const amountStr = `MYR ${senToMyr(sub.amountSen)}`;
      const datePart = sub.nextChargeDate.slice(0, 10);

      items.push({
        id,
        type: isToday ? 'renewal_today' : 'renewal_upcoming',
        severity: isToday ? 'critical' : remaining === 1 ? 'warning' : 'info',
        title: isToday
          ? `${sub.merchantName} renews today`
          : `${sub.merchantName} renews in ${remaining} day${remaining > 1 ? 's' : ''}`,
        message: isToday
          ? `${sub.merchantName} will charge ${amountStr} today.`
          : `Upcoming charge of ${amountStr} scheduled on ${datePart}.`,
        date: datePart,
        subscriptionId: sub.id,
        merchantName: sub.merchantName,
        amountSen: sub.amountSen,
        daysRemaining: remaining,
        isRead: readIds.has(id),
      });
    }
  }

  // Sort: closest renewal first
  items.sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0));

  const unreadCount = items.filter((item) => !item.isRead).length;
  const urgentCount = items.filter(
    (item) => !item.isRead && (item.severity === 'critical' || item.severity === 'warning')
  ).length;

  return {
    items,
    unreadCount,
    urgentCount,
  };
}
