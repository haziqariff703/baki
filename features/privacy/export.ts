/**
 * Data-export use-case (AGENTS.md §2.5, §5.3, §2.3).
 *
 * Assembles the user's own records into a fully-populated export structure
 * by reading their consents, subscriptions, and recurring candidates through
 * the respective repositories. All reads are RLS-scoped and ownership-checked
 * inside the adapters. Pure assembly — serialization happens separately.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExportFormat } from '@/features/consent';
import { SupabaseConsentRepository } from '@/features/consent';
import { SupabaseSubscriptionRepository } from '@/features/subscriptions';
import { SupabaseRecurringCandidateRepository } from '@/features/recurring-detection';
import type { AssembledExport } from './serialize';

/**
 * Assemble the user's data export from all owned tables.
 * Returns a fully-populated structure ready for JSON/CSV serialization.
 */
export async function assembleExport(
  client: SupabaseClient,
  userId: string,
  format: ExportFormat,
  generatedAt: string,
  ruleVersion: string,
): Promise<AssembledExport> {
  const consentRepo = new SupabaseConsentRepository(client);
  const subscriptionRepo = new SupabaseSubscriptionRepository(client);
  const candidateRepo = new SupabaseRecurringCandidateRepository(client);

  const [consents, subscriptions, candidates] = await Promise.all([
    consentRepo.listConsents(userId),
    subscriptionRepo.list(userId),
    candidateRepo.list(userId),
  ]);

  return {
    format,
    generatedAt,
    ruleVersion,
    consents,
    subscriptions,
    candidates,
  };
}
