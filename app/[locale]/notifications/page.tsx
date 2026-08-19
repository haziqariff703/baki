import { getTranslations } from 'next-intl/server';
import { AppShell } from '@/components/layout/AppShell';
import { NotificationCentre } from '@/components/notifications/NotificationCentre';
import { syntheticRenewals, SYNTHETIC_TODAY } from '@/tests/fixtures/renewals';
import { createClient } from '@/lib/supabase/server';
import { SupabaseSubscriptionRepository } from '@/features/subscriptions/repository';

/**
 * M4 — Notifications / Reminder Centre (server-rendered shell).
 * Hydrates from Supabase when authenticated; falls back to synthetic
 * fixtures for guest/demo sessions (AGENTS.md §5.3).
 */
export default async function NotificationsPage() {
  const t = await getTranslations('Notifications');

  let renewals = syntheticRenewals as any[];

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const subRepo = new SupabaseSubscriptionRepository(supabase);
      const subscriptions = await subRepo.list(user.id);

      if (subscriptions && subscriptions.length > 0) {
        renewals = subscriptions.map((s) => ({
          id: s.id,
          merchantName: s.merchantName,
          amountSen: s.amountSen,
          cycle: s.cycle,
          nextChargeDate: s.nextChargeDate,
          reminderOffsets: [],
        }));
      }
    }
  } catch (error) {
    console.error('[NotificationsPage] Server hydration error:', error);
  }

  return (
    <AppShell title={t('title')}>
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-[-0.01em] text-text-primary">
            {t('title')}
          </h1>
          <p className="text-sm text-text-muted">{t('subtitle')}</p>
        </div>
        <NotificationCentre renewals={renewals} fromDate={SYNTHETIC_TODAY} />
      </div>
    </AppShell>
  );
}
