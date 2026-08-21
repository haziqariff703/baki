import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/layout/AppShell';
import { ImportWizard } from '@/components/imports/ImportWizard';

/**
 * Imports page — CSV/PDF statement upload + deterministic in-browser parse.
 * Server-rendered shell; the client wizard owns upload/parse state. No
 * backend, no persistence — raw files never leave the browser (§12).
 */
export default function ImportsPage() {
  const t = useTranslations('Imports');

  return (
    <AppShell title={t('title')}>
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-[-0.01em] text-text-primary">
            {t('title')}
          </h1>
          <p className="text-sm text-text-muted">{t('subtitle')}</p>
        </div>
        <ImportWizard />
      </div>
    </AppShell>
  );
}
