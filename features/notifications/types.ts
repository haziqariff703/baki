import type { MoneyInSen } from '@/lib/money';

export type NotificationType =
  | 'renewal_upcoming'
  | 'renewal_today'
  | 'price_creep'
  | 'student_discount';

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface NotificationItem {
  readonly id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly severity: NotificationSeverity;
  readonly date: string;
  readonly subscriptionId?: string;
  readonly merchantName?: string;
  readonly amountSen?: MoneyInSen;
  readonly daysRemaining?: number;
  readonly isRead: boolean;
}

export interface NotificationSummary {
  readonly items: readonly NotificationItem[];
  readonly unreadCount: number;
  readonly urgentCount: number;
}
