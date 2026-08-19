import { getTranslations } from 'next-intl/server';
import { AppShell } from '@/components/layout/AppShell';
import { ForecastLedger } from '@/components/cash-flow/ForecastLedger';
import { PrintSummaryButton } from '@/components/cash-flow/PrintSummaryButton';
import { createClient } from '@/lib/supabase/server';
import { SupabaseSubscriptionRepository } from '@/features/subscriptions/repository';
import { syntheticAvailableBalanceSen, syntheticRenewals } from '@/tests/fixtures/renewals';

/**
 * M4 — Cash-Flow / Commitment Forecast (server-rendered shell).
 * Hydrates from Supabase when authenticated; falls back to synthetic
 * fixtures for guest/demo sessions (AGENTS.md §5.3).
 */
export default async function CashFlowPage() {
  const t = await getTranslations('CashFlow');

  let renewals = syntheticRenewals as any[];
  let availableBalanceSen = syntheticAvailableBalanceSen;

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_allowance_sen')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.monthly_allowance_sen != null) {
        availableBalanceSen = profile.monthly_allowance_sen;
      }
    }
  } catch (error) {
    console.error('[CashFlowPage] Server hydration error:', error);
  }

  return (
    <AppShell title={t('title')}>
      <div className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-10 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-[-0.01em] text-text-primary">
              {t('title')}
            </h1>
            <p className="text-sm text-text-muted">{t('subtitle')}</p>
          </div>
          <PrintSummaryButton />
        </div>
        <ForecastLedger renewals={renewals} availableBalanceSen={availableBalanceSen} />
      </div>
    </AppShell>
  );
}
