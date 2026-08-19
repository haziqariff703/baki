/**
 * Verified account-deletion request use-case (AGENTS.md §2.2, §2.3, §14.2).
 *
 * Staged (non-destructive) in this slice: the typed phrase is validated
 * server-side against `DELETION_PHRASE`, then an `account_deletion_requested`
 * audit event is recorded. The actual `auth.users` wipe is a deliberate,
 * follow-up operation (least privilege §2.4); recording the verified request
 * is the safe, reversible first step.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DELETION_PHRASE,
  SupabaseConsentRepository,
  validateDeletionConfirmation,
} from '@/features/consent';
import { ApplicationError } from '@/lib/logging';

/**
 * Handle a verified deletion request.
 * Returns true when the phrase matched and the request was recorded; throws a
 * typed error when the phrase is wrong (so the route can return 400).
 */
export async function requestDeletionUseCase(
  client: SupabaseClient,
  phrase: string,
): Promise<{ recorded: boolean }> {
  const gate = validateDeletionConfirmation(phrase, DELETION_PHRASE);
  if (!gate.allowed) {
    throw new ApplicationError(
      'VALIDATION_ERROR',
      'Deletion confirmation phrase does not match',
    );
  }

  const repo = new SupabaseConsentRepository(client);
  await repo.requestDeletion(new Date().toISOString());
  return { recorded: true };
}
