/**
 * Subscription route handlers (AGENTS.md §11).
 *
 * Sequence per request: resolve authenticated user → validate runtime input →
 * verify ownership (auth.uid()) → operate → sanitized response.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { toErrorResponse } from '@/lib/api';
import { createServerSupabase } from '@/lib/database';
import { createSubscriptionSchema } from '@/lib/validation';
import { SupabaseSubscriptionRepository } from '@/features/subscriptions';

export const dynamic = 'force-dynamic';

/** List the authenticated user's subscriptions. */
export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createServerSupabase();
    const repo = new SupabaseSubscriptionRepository(supabase);
    const subscriptions = await repo.list(user.id);
    return NextResponse.json({ subscriptions });
  } catch (error) {
    return toErrorResponse(error, 'subscriptions GET');
  }
}

/** Create a subscription for the authenticated user. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const body: unknown = await request.json().catch(() => null);
    const input = createSubscriptionSchema.parse(body);

    const supabase = await createServerSupabase();
    const repo = new SupabaseSubscriptionRepository(supabase);
    const subscription = await repo.create(user.id, input);

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, 'subscriptions POST');
  }
}
