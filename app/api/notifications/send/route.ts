import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseSubscriptionRepository } from '@/features/subscriptions/repository';
import { SupabaseProfileRepository } from '@/features/settings/repository';
import { generateRenewalNotifications } from '@/features/notifications/logic';
import { buildRenewalEmailHtml, sendEmailNotification } from '@/lib/email';
import { syntheticSubscriptions } from '@/tests/fixtures/subscriptions';

/**
 * Dispatch Email Notifications Route (�§11 / §2.3 / £Ĵ.1).
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let subscriptions = syntheticSubscriptions;
    let reminderDays = 3;
    let recipientEmail = 'user@example.com';
    let recipientName = 'there';

    const body = await req.json().catch(() => ({}));

    if (user) {
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
    }

    if (body.testEmail && typeof body.testEmail === 'string') {
      recipientEmail = body.testEmail.trim();
    }

    const summary = generateRenewalNotifications(subscriptions, {
      reminderDaysBefore: reminderDays,
    });

    if (summary.items.length === 0 && !body.forceTest) {
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
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
