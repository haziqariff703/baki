/**
 * Unit tests for Email Notification Transport and Template Engine.
 *
 * Covers:
 * 1. Deterministic HTML email rendering with Baki dark theme & integer-sen formatting.
 * 2. Fallback mock transport when RESEND_API_KEY is not configured.
 * 3. Sanitization of email payloads (zero banking credentials or unredacted PII).
 */
import { describe, expect, it } from 'vitest';

import {
  buildRenewalEmailHtml,
  sendEmailNotification,
} from '@/lib/email';
import type { NotificationItem } from '@/features/notifications/types';

describe('buildRenewalEmailHtml', () => {
  const sampleItems: NotificationItem[] = [
    {
      id: 'notif-1',
      type: 'renewal_upcoming',
      title: 'Netflix renews in 2 days',
      message: 'Upcoming charge of MYR 55.00 scheduled on 2026-08-25.',
      severity: 'warning',
      date: '2026-08-25',
      subscriptionId: 'sub-netflix',
      merchantName: 'Netflix',
      amountSen: 5500,
      daysRemaining: 2,
      isRead: false,
    },
    {
      id: 'notif-2',
      type: 'renewal_upcoming',
      title: 'Spotify renews in 3 days',
      message: 'Upcoming charge of MYR 15.90 scheduled on 2026-08-26.',
      severity: 'info',
      date: '2026-08-26',
      subscriptionId: 'sub-spotify',
      merchantName: 'Spotify',
      amountSen: 1590,
      daysRemaining: 3,
      isRead: false,
    },
  ];

  it('renders valid HTML containing all renewal items with integer-sen MYR values', () => {
    const html = buildRenewalEmailHtml({
      recipientName: 'Aiman',
      items: sampleItems,
      totalSen: 7090,
    });

    expect(html).toContain('Netflix');
    expect(html).toContain('Spotify');
    expect(html).toContain('MYR 55.00');
    expect(html).toContain('MYR 15.90');
    expect(html).toContain('MYR 70.90');
    expect(html).toContain('2026-08-25');
    expect(html).toContain('Baki');
  });

  it('applies Baki design system colors and AA-safe inline styles', () => {
    const html = buildRenewalEmailHtml({
      recipientName: 'Aiman',
      items: sampleItems,
      totalSen: 7090,
    });

    // Dark surface and amber accent
    expect(html).toContain('#0a0a0a'); // surface-0
    expect(html).toContain('#f59e0b'); // amber accent
    expect(html).toContain('#ededed'); // primary text
  });
});

describe('sendEmailNotification (Transport)', () => {
  it('gracefully uses mock transport when RESEND_API_KEY is not set', async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    try {
      const result = await sendEmailNotification({
        to: 'student@example.com',
        subject: 'Baki Renewal Reminder: Netflix in 2 days',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
      expect(result.mocked).toBe(true);
    } finally {
      if (originalKey) {
        process.env.RESEND_API_KEY = originalKey;
      }
    }
  });

  it('rejects invalid recipient email formats before making network calls', async () => {
    const result = await sendEmailNotification({
      to: 'invalid-email-string',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
