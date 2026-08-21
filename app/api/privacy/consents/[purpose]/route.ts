/**
 * Consent toggle route (AGENTS.md §11, §2.3).
 *
 * POST /api/privacy/consents/[purpose]  body: { status: 'granted' | 'withdrawn' }
 *
 * Atomically toggles the consent row + records the audit event via the
 * `set_consent` RPC. Status is server-validated; version + timestamp are
 * server-authoritative (§2.6). Next.js 16: `params` is awaited.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { toErrorResponse } from '@/lib/api';
import { createServerSupabase } from '@/lib/database';
import { consentPurposeSchema, consentToggleSchema } from '@/lib/validation';
import {
  CONSENT_RULE_VERSION,
  SupabaseConsentRepository,
} from '@/features/consent';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  props: { params: Promise<{ purpose: string }> },
) {
  try {
    await requireUser(); // session identity drives auth.uid() inside the RPC
    const { purpose } = await props.params;

    // Validate the path purpose (§7 trust boundary).
    const parsedPurpose = consentPurposeSchema.parse(purpose);

    const body: unknown = await request.json().catch(() => null);
    const { status } = consentToggleSchema.parse(body);

    const supabase = await createServerSupabase();
    const repo = new SupabaseConsentRepository(supabase);

    const consent =
      status === 'granted'
        ? await repo.grant(parsedPurpose, CONSENT_RULE_VERSION, new Date().toISOString())
        : await repo.withdraw(parsedPurpose, new Date().toISOString());

    return NextResponse.json({ consent });
  } catch (error) {
    return toErrorResponse(error, 'privacy consent toggle');
  }
}
