/**
 * Consent + audit read route (AGENTS.md §11).
 *
 * GET /api/privacy/consents — returns the user's consent records and their
 * append-only audit trail. Ownership is enforced by user_id scope + RLS.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { toErrorResponse } from '@/lib/api';
import { createServerSupabase } from '@/lib/database';
import { SupabaseConsentRepository } from '@/features/consent';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createServerSupabase();
    const repo = new SupabaseConsentRepository(supabase);
    const [consents, auditEvents] = await Promise.all([
      repo.listConsents(user.id),
      repo.listAuditEvents(user.id),
    ]);
    return NextResponse.json({ consents, auditEvents });
  } catch (error) {
    return toErrorResponse(error, 'privacy consents GET');
  }
}
