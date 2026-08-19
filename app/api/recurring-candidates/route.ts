/**
 * Recurring-candidate list route (AGENTS.md §11).
 *
 * Sequence: resolve authenticated user → (no input to validate) → operate →
 * sanitized response.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { toErrorResponse } from '@/lib/api';
import { createServerSupabase } from '@/lib/database';
import { SupabaseRecurringCandidateRepository } from '@/features/recurring-detection';

export const dynamic = 'force-dynamic';

/** List the authenticated user's detected candidates. */
export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createServerSupabase();
    const repo = new SupabaseRecurringCandidateRepository(supabase);
    const candidates = await repo.list(user.id);
    return NextResponse.json({ candidates });
  } catch (error) {
    return toErrorResponse(error, 'recurring-candidates GET');
  }
}
