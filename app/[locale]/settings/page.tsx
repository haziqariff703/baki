import { useTranslations } from 'next-intl';
import { User, Mail, Globe, ShieldCheck, ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { Link } from '@/i18n/routing';

/**
 * Settings shell — minimal account surface. Profile fields are placeholders
 * (non-functional) until auth lands; the language control and the privacy
 * panel link are live. Ledger-Rule row anatomy throughout (DESIGN.md §6).
 */
export default function SettingsPage() {
  const t = useTranslations('Settings');

  return (
    <AppShell title={t('title')}>
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-[-0.01em] text-text-primary">
            {t('title')}
          </h1>
          <p className="text-sm text-text-muted">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Account & Language */}
          <div className="space-y-6">
            {/* Account */}
            <section aria-labelledby="account-heading" className="space-y-3">
              <h2
                id="account-heading"
                className="text-xs font-mono uppercase tracking-wider text-text-faint"
              >
                {t('accountHeading')}
              </h2>
              <ul className="divide-y divide-border-1 border border-border-1 rounded-xl bg-surface-1">
                <li className="flex items-center justify-between gap-4 px-5 py-4">
                  <span className="flex items-center gap-3 text-sm text-text-secondary">
                    <User className="w-4 h-4 text-text-faint" aria-hidden="true" />
                    {t('displayName')}
                  </span>
                  <span className="text-sm text-text-muted">{t('notSet')}</span>
                </li>
                <li className="flex items-center justify-between gap-4 px-5 py-4">
                  <span className="flex items-center gap-3 text-sm text-text-secondary">
                    <Mail className="w-4 h-4 text-text-faint" aria-hidden="true" />
                    {t('email')}
                  </span>
                  <span className="text-sm text-text-muted">{t('notSet')}</span>
                </li>
              </ul>
            </section>

            {/* Language */}
            <section aria-labelledby="language-heading" className="space-y-3">
              <h2
                id="language-heading"
                className="text-xs font-mono uppercase tracking-wider text-text-faint"
              >
                {t('languageHeading')}
              </h2>
              <div className="border border-border-1 rounded-xl bg-surface-1 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-3 text-sm text-text-secondary">
                    <Globe className="w-4 h-4 text-text-faint" aria-hidden="true" />
                    {t('language')}
                  </span>
                  <LanguageSwitcher />
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Privacy Panel Link */}
          <div className="space-y-6">
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
                    <span className="block text-sm font-medium text-text-primary">
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
          </div>
        </div>
      </div>
    </AppShell>
  );
}
