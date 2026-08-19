import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/layout/AppShell';
import { PrivacyPanel } from '@/components/privacy/PrivacyPanel';
import { syntheticAuditEvents, syntheticConsents } from '@/tests/fixtures/consents';

/**
 * M3 — Consent & Data Control Panel (server-rendered shell).
 * Synthetic fixtures stand in for the ConsentRepository until a DB adapter
 * lands (§5.3); the client component owns the interactive state.
 */
export default function PrivacyPage() {
  const t = useTranslations('Privacy');

  return (
    <AppShell title={t('title')}>
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-[-0.01em] text-text-primary">
            {t('title')}
          </h1>
          <p className="text-sm text-text-muted">{t('subtitle')}</p>
        </div>
        <PrivacyPanel
          initialConsents={syntheticConsents}
          initialAuditEvents={syntheticAuditEvents}
        />
      </div>
    </AppShell>
  );
}
