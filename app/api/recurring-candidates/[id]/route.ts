/**
 * Per-candidate decision & edit routes (AGENTS.md §11, §2.2).
 *
 * PATCH — apply a human decision. `confirm` derives cycle + next charge date
 *          deterministically (§2.1, §9) and atomically creates the active
 *          subscription via the DB RPC. `reject` is terminal.
 * PUT   — edit merchant/amount of a still-pending candidate.
 *
 * Sequence: resolve authenticated user → validate runtime input → verify
 * ownership (RLS + user_id filter) → operate → sanitized response.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { toErrorResponse } from '@/lib/api';
import { createServerSupabase } from '@/lib/database';
import { candidateDecisionSchema, candidateEditSchema } from '@/lib/validation';
import {
  SupabaseRecurringCandidateRepository,
  cycleFromIntervalDays,
  nextChargeAfterCycle,
} from '@/features/recurring-detection';

export const dynamic = 'force-dynamic';

/** Resolve an owned, still-pending candidate or return an error response. */
async function requirePendingCandidate(
  repo: SupabaseRecurringCandidateRepository,
  userId: string,
  id: string,
): Promise<
  | { ok: true; candidate: NonNullable<Awaited<ReturnType<typeof repo.get>>> }
  | { ok: false; response: NextResponse }
> {
  const candidate = await repo.get(userId, id);
  if (!candidate) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 }),
    };
  }
  if (candidate.status.state !== 'pending') {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          issues: [{ path: 'id', message: 'Candidate already decided' }],
        },
        { status: 400 },
      ),
    };
  }
  return { ok: true, candidate };
}

/** Apply a confirm/reject decision to a pending candidate. */
export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await props.params;

    const body: unknown = await request.json().catch(() => null);
    const { action } = candidateDecisionSchema.parse(body);

    const supabase = await createServerSupabase();
    const repo = new SupabaseRecurringCandidateRepository(supabase);

    const gate = await requirePendingCandidate(repo, user.id, id);
    if (!gate.ok) return gate.response;

    if (action === 'reject') {
      const candidate = await repo.reject(user.id, id, new Date().toISOString());
      return NextResponse.json({ candidate });
    }

    // Deterministic derivation (§2.1, §9): interval → cycle → next charge.
    const cycle = cycleFromIntervalDays(gate.candidate.intervalDays);
    const nextChargeDate = nextChargeAfterCycle(gate.candidate.detectedAt, cycle);
    const subscription = await repo.confirm(user.id, id, cycle, nextChargeDate);

    return NextResponse.json({ subscription });
  } catch (error) {
    return toErrorResponse(error, 'recurring-candidates PATCH');
  }
}

/** Edit merchant/amount of a still-pending candidate. */
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await props.params;

    const body: unknown = await request.json().catch(() => null);
    const edit = candidateEditSchema.parse(body);

    const supabase = await createServerSupabase();
    const repo = new SupabaseRecurringCandidateRepository(supabase);

    const gate = await requirePendingCandidate(repo, user.id, id);
    if (!gate.ok) return gate.response;

    const candidate = await repo.update(user.id, id, edit);
    return NextResponse.json({ candidate });
  } catch (error) {
    return toErrorResponse(error, 'recurring-candidates PUT');
  }
}
