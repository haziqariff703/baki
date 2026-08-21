import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { toErrorResponse } from '@/lib/api';
import { createServerSupabase } from '@/lib/database';
import {
  detectRecurringCadence,
  SupabaseRecurringCandidateRepository,
} from '@/features/recurring-detection';
import { SupabaseTransactionRepository } from '@/features/transactions';

export const dynamic = 'force-dynamic';

/** List the authenticated user's pending detected candidates (§2.2). */
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

/** Re-scan all transaction history to detect new recurring candidates. */
export async function POST() {
  try {
    const user = await requireUser();
    const supabase = await createServerSupabase();
    const repo = new SupabaseRecurringCandidateRepository(supabase);
    const txRepo = new SupabaseTransactionRepository(supabase);

    const history = await txRepo.list(user.id);
    let insertedCount = 0;

    if (history.length > 0) {
      const detected = detectRecurringCadence(history);
      if (detected.length > 0) {
        const newCandidates = await repo.insertMany(user.id, detected);
        insertedCount = newCandidates.length;
      }
    }

    const candidates = await repo.list(user.id);
    return NextResponse.json({ success: true, insertedCount, candidates });
  } catch (error) {
    return toErrorResponse(error, 'recurring-candidates POST');
  }
}
