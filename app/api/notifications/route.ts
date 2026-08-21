import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SupabaseSubscriptionRepository } from '@/features/subscriptions/repository';
import { SupabaseProfileRepository } from '@/features/settings/repository';
import { generateRenewalNotifications } from '@/features/notifications/logic';
import { syntheticSubscriptions } from '@/tests/fixtures/subscriptions';

/**
 * Renewal Reminders & Notifications API Route (§11 / §2.1 / §8.1).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let subscriptions = syntheticSubscriptions;
    let reminderDays = 3;

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
        reminderDays = profile.reminderDaysBefore;
      }
    }

    const summary = generateRenewalNotifications(subscriptions, {
      reminderDaysBefore: reminderDays,
    });

    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
