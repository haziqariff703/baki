import { getTranslations } from 'next-intl/server';
import { AppShell } from '@/components/layout/AppShell';
import { ForecastLedger } from '@/components/cash-flow/ForecastLedger';
import { PrintSummaryButton } from '@/components/cash-flow/PrintSummaryButton';
import { createClient } from '@/lib/supabase/server';
import { SupabaseSubscriptionRepository } from '@/features/subscriptions/repository';
import { syntheticAvailableBalanceSen, syntheticRenewals } from '@/tests/fixtures/renewals';
import { syntheticSubscriptions } from '@/tests/fixtures/subscriptions';
import type { UserProfile } from '@/lib/validation/profile';

import { CashFlowPrintReport } from '@/components/cash-flow/CashFlowPrintReport';

/**
 * M4 — Cash-Flow / Commitment Forecast (server-rendered shell).
 * Hydrates from Supabase when authenticated; falls back to synthetic
 * fixtures for guest/demo sessions (AGENTS.md §5.3).
 */
export default async function CashFlowPage() {
  const t = await getTranslations('CashFlow');

  let subscriptions: any[] = [];
  let renewals: any[] = [];
  let availableBalanceSen = 0;
  let userProfile: UserProfile | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const subRepo = new SupabaseSubscriptionRepository(supabase);
      const userSubs = await subRepo.list(user.id);

      subscriptions = (userSubs ?? []) as any[];
      renewals = (userSubs ?? []).map((s) => ({
        id: s.id,
        merchantName: s.merchantName,
        amountSen: s.amountSen,
        cycle: s.cycle,
        nextChargeDate: s.nextChargeDate,
        reminderOffsets: [],
      }));

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        if (profile.monthly_allowance_sen != null) {
          availableBalanceSen = profile.monthly_allowance_sen;
        }
        userProfile = {
          displayName: profile.display_name || user.user_metadata?.full_name || '',
          email: user.email || '',
          isStudent: Boolean(profile.is_student),
          educationTier: profile.education_tier || 'general',
          universityDomain: profile.university_domain || '',
          monthlyBudgetSen: profile.monthly_allowance_sen ?? availableBalanceSen,
          paydayDayOfMonth: profile.payday_day_of_month ?? 25,
          reminderDaysBefore: profile.reminder_days_before ?? 7,
          defaultViewMode: profile.default_view_mode || 'actual',
          statementRetentionWindow: profile.statement_retention_window || 'immediate',
        };
      }
    } else {
      // Guest demo session fallback only when unauthenticated
      subscriptions = syntheticSubscriptions as any[];
      renewals = syntheticRenewals as any[];
      availableBalanceSen = syntheticAvailableBalanceSen;
    }
  } catch (error) {
    console.error('[CashFlowPage] Server hydration error:', error);
  }

  return (
    <AppShell title={t('title')}>
      {/* Screen Interactive Dashboard — completely hidden when printing */}
      <div className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-10 space-y-6 print:hidden">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-[-0.01em] text-text-primary">
              {t('title')}
            </h1>
            <p className="text-sm text-text-muted">{t('subtitle')}</p>
          </div>
          <PrintSummaryButton
            subscriptions={subscriptions}
            renewals={renewals}
            availableBalanceSen={availableBalanceSen}
            profile={userProfile}
          />
        </div>
        <ForecastLedger renewals={renewals} availableBalanceSen={availableBalanceSen} />
      </div>

      {/* Dedicated Print Statement — rendered ONLY when printing / saving PDF */}
      <div className="hidden print:block w-full">
        <CashFlowPrintReport
          subscriptions={subscriptions}
          renewals={renewals}
          availableBalanceSen={availableBalanceSen}
          profile={userProfile}
        />
      </div>
    </AppShell>
  );
}
