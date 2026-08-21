/**
 * Cash-flow summary route (AGENTS.md §11).
 *
 * GET /api/cash-flow/summary?fromDate=YYYY-MM-DD&paydayDayOfMonth=N
 *
 * Returns the dashboard's one-paint aggregate payload: summary (monthly/annual
 * commitment, safe-to-spend, upcoming count), the next-30-day total, the sorted
 * upcoming renewals list, and (optionally) payday analysis.
 *
 * Sequence: resolve authenticated user → validate runtime input → verify
 * ownership (RLS + user_id scope inside the repo) → compose from domain
 * functions → validate response → sanitized JSON.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { toErrorResponse } from '@/lib/api';
import { createServerSupabase } from '@/lib/database';
import { cashFlowSummaryQuerySchema } from '@/lib/validation';
import {
  SupabaseRenewalRepository,
  computeCashFlowSummary,
  computeNext30DayTotalSen,
  computePaydayAnalysis,
  sortByNextCharge,
} from '@/features/cash-flow';

export const dynamic = 'force-dynamic';

/** Today as a UTC calendar date (YYYY-MM-DD), server-authoritative (§9). */
function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Resolve the user's monthly allowance in sen from `profiles`.
 * Returns 0 when the profile row is absent (pre-migration or missing) so the
 * dashboard surfaces an overrun rather than a fabricated surplus (§2.3).
 */
async function getMonthlyAllowanceSen(
  userId: string,
): Promise<number> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('profiles')
    .select('monthly_allowance_sen')
    .eq('id', userId)
    .maybeSingle();
  return data?.monthly_allowance_sen ?? 0;
}

export async function GET(request: Request) {
  try {
    // §11 step 1 — resolve authenticated user.
    const user = await requireUser();

    // §11 step 2 — validate runtime input (query params, strict).
    const { searchParams } = new URL(request.url);
    const query = cashFlowSummaryQuerySchema.parse({
      fromDate: searchParams.get('fromDate') ?? undefined,
      paydayDayOfMonth: searchParams.get('paydayDayOfMonth') ?? undefined,
    });
    const fromDate = query.fromDate ?? todayUtcDate();

    // §11 step 3 — ownership enforced by user_id scope + RLS in the repo.
    const supabase = await createServerSupabase();
    const repo = new SupabaseRenewalRepository(supabase);
    const renewals = await repo.listUpcoming(user.id, fromDate);

    // Resolve the deterministic inputs the domain functions need.
    const availableBalanceSen = await getMonthlyAllowanceSen(user.id);

    // §5.3 — aggregate composition stays in the domain layer.
    const summary = computeCashFlowSummary(renewals, availableBalanceSen, fromDate);
    const next30DayTotalSen = computeNext30DayTotalSen(renewals, fromDate);
    const upcoming = sortByNextCharge(renewals);
    const paydayAnalysis =
      query.paydayDayOfMonth !== undefined
        ? computePaydayAnalysis(renewals, query.paydayDayOfMonth, fromDate)
        : null;

    // §11 step 5 — sanitized, validated response.
    return NextResponse.json({
      summary,
      next30DayTotalSen,
      upcoming,
      paydayAnalysis,
    });
  } catch (error) {
    return toErrorResponse(error, 'cash-flow summary GET');
  }
}
