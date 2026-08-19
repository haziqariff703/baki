import { getTranslations } from 'next-intl/server';
import { Globe, ShieldCheck, ArrowRight, Lock } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { AccountProfileSettings } from '@/components/settings/AccountProfileSettings';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';

/**
 * Settings & Account Configuration Page.
 *
 * Provides editable user profile attributes (identity, student tier,
 * monthly budget in sen, alert lead time, ledger preference) with automatic
 * domain extraction from Google OAuth or email sign-in (§1.1 / §2.3 / §8.1).
 */
export default async function SettingsPage() {
  const t = await getTranslations('Settings');

  let initialUser: {
    email?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | undefined = undefined;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      initialUser = {
        email: user.email,
        displayName:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0],
        avatarUrl:
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          null,
      };
    }
  } catch (err) {
    // Guest or offline session fallback
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Column: Interactive Profile & Preferences (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <AccountProfileSettings initialUser={initialUser} />
          </div>

          {/* Side Column: Language & Privacy Governance (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Language & Locale */}
            <section aria-labelledby="language-heading" className="space-y-3">
              <h2
                id="language-heading"
                className="text-xs font-mono uppercase tracking-wider text-text-faint"
              >
                {t('languageHeading')}
              </h2>
              <div className="border border-border-1 rounded-xl bg-surface-1 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-text-secondary">
                    <Globe className="w-4 h-4 text-text-faint" aria-hidden="true" />
                    <span>{t('language')}</span>
                  </span>
                  <LanguageSwitcher />
                </div>
              </div>
            </section>

            {/* Privacy & Data Control Panel */}
            <section aria-labelledby="privacy-heading" className="space-y-3">
              <h2
                id="privacy-heading"
                className="text-xs font-mono uppercase tracking-wider text-text-faint"
              >
                {t('privacyHeading')}
              </h2>
              <Link
                href="/settings/privacy"
                className="flex items-start justify-between gap-4 border border-border-1 rounded-xl bg-surface-1 p-5 hover:bg-surface-2 hover:border-border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <ShieldCheck
                    className="w-5 h-5 text-status-emerald-text shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 space-y-1">
                    <span className="block text-sm font-semibold text-text-primary">
                      {t('privacyLink')}
                    </span>
                    <span className="block text-xs text-text-muted leading-relaxed">
                      {t('privacyDesc')}
                    </span>
                  </div>
                </div>
                <ArrowRight
                  className="w-4 h-4 text-text-faint group-hover:text-text-primary shrink-0 transition-colors mt-1"
                  aria-hidden="true"
                />
              </Link>
            </section>

            {/* Security & Audit Summary */}
            <div className="p-4 rounded-xl border border-border-1 bg-surface-2/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                <Lock className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                <span>Malaysian PDPA 2010 Protected</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Your data stays strictly under your control. We never share personal
                financial records or sell analytical telemetry to third-party data brokers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
