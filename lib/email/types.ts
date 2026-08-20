/**
 * Types for Email Notification Transport.
 */
import type { NotificationItem } from '@/features/notifications/types';

export interface SendEmailPayload {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly from?: string;
}

export interface SendEmailResult {
  readonly success: boolean;
  readonly messageId?: string;
  readonly mocked?: boolean;
  readonly error?: string;
}

export interface RenewalEmailTemplateData {
  readonly recipientName?: string;
  readonly items: readonly NotificationItem[];
  readonly totalSen: number;
  readonly appUrl?: string;
}
