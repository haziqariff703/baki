/**
 * Data-export route (AGENTS.md §11, §2.5, §2.3).
 *
 * POST /api/privacy/export  body: { format: 'json' | 'csv' }
 *
 * Assembles the user's own records server-side and returns a downloadable
 * file (JSON or CSV). Ownership is enforced via the repositories (RLS +
 * user_id scope). Also records a `data_exported` audit event.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { toErrorResponse } from '@/lib/api';
import { createServerSupabase } from '@/lib/database';
import { exportRequestSchema } from '@/lib/validation';
import { CONSENT_RULE_VERSION, SupabaseConsentRepository } from '@/features/consent';
import { assembleExport, serializeCsv, serializeJson } from '@/features/privacy';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const body: unknown = await request.json().catch(() => null);
    const { format } = exportRequestSchema.parse(body);

    const supabase = await createServerSupabase();
    const generatedAt = new Date().toISOString();

    const data = await assembleExport(
      supabase,
      user.id,
      format,
      generatedAt,
      CONSENT_RULE_VERSION,
    );

    // Record the export audit event (append-only) after successful assembly.
    const consentRepo = new SupabaseConsentRepository(supabase);
    await consentRepo.requestExport(format, generatedAt);

    if (format === 'json') {
      const json = serializeJson(data);
      return new NextResponse(json, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="baki-export-${generatedAt.slice(0, 10)}.json"`,
        },
      });
    }

    const csv = serializeCsv(data);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="baki-export-${generatedAt.slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return toErrorResponse(error, 'privacy export');
  }
}
