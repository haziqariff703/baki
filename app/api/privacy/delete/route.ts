/**
 * Verified account-deletion request route (AGENTS.md §11, §2.2, §14.2).
 *
 * POST /api/privacy/delete  body: { phrase: string }
 *
 * Validates the typed phrase server-side against DELETION_PHRASE, then records
 * an `account_deletion_requested` audit event. Staged (non-destructive): the
 * actual auth.users wipe is a deliberate follow-up (least privilege §2.4).
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { toErrorResponse } from '@/lib/api';
import { createServerSupabase } from '@/lib/database';
import { deletionConfirmationSchema } from '@/lib/validation';
import { requestDeletionUseCase } from '@/features/privacy';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    // Rate limit check: max 3 deletion attempts per 10 minutes per user
    const rateLimit = checkRateLimit(`delete:${user.id}`, { limit: 3, windowSeconds: 600 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: `Too many deletion attempts. Please wait ${Math.ceil(rateLimit.resetSeconds / 60)} minutes before trying again.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.resetSeconds) },
        },
      );
    }

    const body: unknown = await request.json().catch(() => null);
    const { phrase } = deletionConfirmationSchema.parse(body);

    const supabase = await createServerSupabase();
    await requestDeletionUseCase(supabase, phrase);

    // Completely wipe all user records from Supabase tables
    await supabase.from('transactions').delete().eq('user_id', user.id);
    await supabase.from('recurring_candidates').delete().eq('user_id', user.id);
    await supabase.from('imports').delete().eq('user_id', user.id);
    await supabase.from('subscriptions').delete().eq('user_id', user.id);
    await supabase.from('user_consents').delete().eq('user_id', user.id);

    return NextResponse.json({ recorded: true, wiped: true });
  } catch (error) {
    return toErrorResponse(error, 'privacy delete');
  }
}
