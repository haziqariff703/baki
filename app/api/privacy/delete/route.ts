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

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await requireUser();

    const body: unknown = await request.json().catch(() => null);
    const { phrase } = deletionConfirmationSchema.parse(body);

    const supabase = await createServerSupabase();
    await requestDeletionUseCase(supabase, phrase);

    return NextResponse.json({ recorded: true });
  } catch (error) {
    return toErrorResponse(error, 'privacy delete');
  }
}
