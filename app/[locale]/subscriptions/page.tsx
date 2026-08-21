import { getTranslations } from 'next-intl/server';
import { AppShell } from '@/components/layout/AppShell';
import { SubscriptionManager } from '@/components/subscriptions/SubscriptionManager';
import { syntheticSubscriptions } from '@/tests/fixtures/subscriptions';
import { createClient } from '@/lib/supabase/server';
import { SupabaseSubscriptionRepository } from '@/features/subscriptions/repository';

/**
 * Subscriptions management page. Server-rendered shell; the client manager
 * owns CRUD state seeded by synthetic fixtures (AGENTS.md §5.3) or live DB.
 * Scoring stays deterministic via the engine (§2.1); money stays integer sen (§8.1).
 */
export default async function SubscriptionsPage() {
  const t = await getTranslations('Subscriptions');

  let initialSubscriptions: any[] = [];

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const repo = new SupabaseSubscriptionRepository(supabase);
      const subs = await repo.list(user.id);
      initialSubscriptions = (subs ?? []) as any[];
    } else {
      // Guest demo session fallback only when unauthenticated
      initialSubscriptions = syntheticSubscriptions as any[];
    }
  } catch (error) {
    console.error('[SubscriptionsPage] Server hydration error:', error);
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
        <SubscriptionManager initialSubscriptions={initialSubscriptions as any} />
      </div>
    </AppShell>
  );
}
