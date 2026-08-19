import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/layout/AppShell';
import { NotificationCentre } from '@/components/notifications/NotificationCentre';
import { syntheticRenewals, SYNTHETIC_TODAY } from '@/tests/fixtures/renewals';

/**
 * M4 — Notifications / Reminder Centre (server-rendered shell).
 * Synthetic fixtures stand in for the repository until a DB adapter lands
 * (AGENTS.md §5.3); the client component owns the interactive state.
 */
export default function NotificationsPage() {
  const t = useTranslations('Notifications');

  return (
    <AppShell title={t('title')}>
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-[-0.01em] text-text-primary">
            {t('title')}
          </h1>
          <p className="text-sm text-text-muted">{t('subtitle')}</p>
        </div>
        <NotificationCentre renewals={syntheticRenewals} fromDate={SYNTHETIC_TODAY} />
      </div>
    </AppShell>
  );
}
