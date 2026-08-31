import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseSubscriptionRepository } from '@/features/subscriptions/repository';
import { SupabaseProfileRepository } from '@/features/settings/repository';
import { generateRenewalNotifications } from '@/features/notifications/logic';
import { buildRenewalEmailHtml, sendEmailNotification } from '@/lib/email';
import { syntheticSubscriptions } from '@/tests/fixtures/subscriptions';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { requireUser } from '@/lib/auth';
import { toErrorResponse } from '@/lib/api';
import { z } from 'zod';

const notificationRequestSchema = z.object({ forceTest: z.boolean().optional() }).strict();

/**
 * Dispatch Email Notifications Route (§11 / §2.3 / §14.1).
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const rateLimit = checkRateLimit(`notify:${user.id}`, { limit: 10, windowSeconds: 60 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: `Too many notification requests. Please retry in ${rateLimit.resetSeconds} seconds.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.resetSeconds) },
        },
      );
    }

    const supabase = await createClient();
    let subscriptions = syntheticSubscriptions;
    let reminderDays = 3;
    let recipientEmail = 'user@example.com';
    let recipientName = 'there';

    const body: unknown = await req.json().catch(() => null);
    const input = notificationRequestSchema.parse(body ?? {});

    const subRepo = new SupabaseSubscriptionRepository(supabase);
    const profileRepo = new SupabaseProfileRepository(supabase);

    const [userSubs, profile] = await Promise.all([
      subRepo.list(user.id),
      profileRepo.getProfile(user.id),
    ]);

    if (userSubs && userSubs.length > 0) {
      subscriptions = userSubs;
    }
    if (profile) {
      reminderDays = profile.reminderDaysBefore ?? 3;
    }
    recipientEmail = user.email ?? profile?.email ?? 'user@example.com';
    recipientName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'there';

    const summary = generateRenewalNotifications(subscriptions, {
      reminderDaysBefore: reminderDays,
    });

    if (summary.items.length === 0 && !input.forceTest) {
      return NextResponse.json({
        message: 'No upcoming renewals due within reminder window.',
        itemsCount: 0,
        sent: false,
      });
    }

    const itemsToSend =
      summary.items.length > 0
        ? summary.items
        : [
            {
              id: 'test-preview',
              type: 'renewal_upcoming' as const,
              title: 'Spotify (Sample Preview)',
              message: 'Sample test reminder from Baki.',
              severity: 'info' as const,
              date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
              merchantName: 'Spotify Student',
              amountSen: 850,
              daysRemaining: 3,
              isRead: false,
            },
          ];


    const totalSen = itemsToSend.reduce(
      (sum, item) => sum + (item.amountSen ?? 0),
      0,
    );

    const emailHtml = buildRenewalEmailHtml({
      recipientName,
      items: itemsToSend,
      totalSen,
    });

    const subject =
      itemsToSend.length === 1
        ? 'Baki Reminder: ' + (itemsToSend[0].merchantName ?? 'Subscription') + ' renews soon'
        : 'Baki Reminder: ' + itemsToSend.length + ' subscriptions renewing soon';

    const result = await sendEmailNotification({
      to: recipientEmail,
      subject,
      html: emailHtml,
    });


    const maskedRecipient =
      recipientEmail.length > 4
        ? `${recipientEmail.slice(0, 3)}***@${recipientEmail.split('@')[1] ?? 'example.com'}`
        : 'user';

    return NextResponse.json({
      success: result.success,
      itemsCount: itemsToSend.length,
      recipient: maskedRecipient,
      mocked: result.mocked ?? false,
      error: result.error,
    });
  } catch (error) {
    return toErrorResponse(error, 'notifications send POST');
  }
}
