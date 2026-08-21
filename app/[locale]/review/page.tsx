import { getTranslations } from 'next-intl/server';
import { AppShell } from '@/components/layout/AppShell';
import { CandidateQueue } from '@/components/review/CandidateQueue';
import { syntheticCandidates } from '@/tests/fixtures/candidates';
import { createClient } from '@/lib/supabase/server';
import { SupabaseRecurringCandidateRepository } from '@/features/recurring-detection/repository';

/**
 * M2 — Candidate Confirmation Queue (server-rendered shell).
 * Hydrates from Supabase when authenticated; falls back to synthetic
 * fixtures for guest/demo sessions (AGENTS.md §5.3).
 */
export default async function ReviewPage() {
  const t = await getTranslations('Review');

  let initialCandidates: any[] = [];

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const repo = new SupabaseRecurringCandidateRepository(supabase);
      const cands = await repo.list(user.id);
      initialCandidates = (cands ?? []) as any[];
    } else {
      // Guest demo fallback only when completely unauthenticated
      initialCandidates = syntheticCandidates as any[];
    }
  } catch (error) {
    console.error('[ReviewPage] Server hydration error:', error);
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
        <CandidateQueue initialCandidates={initialCandidates as any} />
      </div>
    </AppShell>
  );
}
