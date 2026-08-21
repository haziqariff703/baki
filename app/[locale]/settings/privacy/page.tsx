import { getTranslations } from 'next-intl/server';
import { AppShell } from '@/components/layout/AppShell';
import { PrivacyPanel } from '@/components/privacy/PrivacyPanel';
import { syntheticAuditEvents, syntheticConsents } from '@/tests/fixtures/consents';
import { createClient } from '@/lib/supabase/server';
import {
  CONSENT_PURPOSES,
  CONSENT_RULE_VERSION,
  SupabaseConsentRepository,
  type ConsentRecord,
  type AuditEvent,
} from '@/features/consent';

/**
 * M3 — Consent & Data Control Panel (server-rendered shell §5.1, §11).
 * Hydrates real user consents and audit events from Supabase PostgreSQL.
 */
export default async function PrivacyPage() {
  const t = await getTranslations('Privacy');

  let initialConsents: readonly ConsentRecord[] = syntheticConsents;
  let initialAuditEvents: readonly AuditEvent[] = syntheticAuditEvents;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const repo = new SupabaseConsentRepository(supabase);
      const [consents, auditEvents] = await Promise.all([
        repo.listConsents(user.id),
        repo.listAuditEvents(user.id),
      ]);

      // Ensure all canonical consent purposes are present in the list with standard signup defaults
      initialConsents = CONSENT_PURPOSES.map((purpose) => {
        const existing = consents.find((c) => c.purpose === purpose);
        if (existing) return existing;

        const isDefaultGranted =
          purpose === 'transaction_import' ||
          purpose === 'ai_assist' ||
          purpose === 'notifications';

        return {
          purpose,
          status: isDefaultGranted ? ('granted' as const) : ('withdrawn' as const),
          consentVersion: CONSENT_RULE_VERSION,
          grantedAt: isDefaultGranted ? user.created_at || new Date().toISOString() : null,
          withdrawnAt: null,
        };
      });

      initialAuditEvents = auditEvents;
    }
  } catch (error) {
    console.error('[PrivacyPage] Server hydration error:', error);
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
        <PrivacyPanel
          initialConsents={initialConsents}
          initialAuditEvents={initialAuditEvents}
        />
      </div>
    </AppShell>
  );
}

