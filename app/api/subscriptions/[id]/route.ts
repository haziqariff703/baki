/**
 * Single Subscription route handlers (AGENTS.md §11).
 *
 * Sequence per request: resolve authenticated user → validate runtime input →
 * verify ownership (auth.uid()) → operate → sanitized response.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { toErrorResponse } from '@/lib/api';
import { createServerSupabase } from '@/lib/database';
import { subscriptionSchema } from '@/lib/validation';
import { SupabaseSubscriptionRepository } from '@/features/subscriptions';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateSchema = subscriptionSchema.omit({ id: true }).partial();

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const params = await props.params;
    const supabase = await createServerSupabase();
    const repo = new SupabaseSubscriptionRepository(supabase);
    const subscription = await repo.get(user.id, params.id);
    
    if (!subscription) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json({ subscription });
  } catch (error) {
    return toErrorResponse(error, 'subscriptions GET single');
  }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const params = await props.params;
    
    const body: unknown = await request.json().catch(() => null);
    const input = updateSchema.parse(body);

    const supabase = await createServerSupabase();
    const repo = new SupabaseSubscriptionRepository(supabase);
    const subscription = await repo.update(user.id, params.id, input);
    
    if (!subscription) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    return toErrorResponse(error, 'subscriptions PATCH');
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const params = await props.params;
    const supabase = await createServerSupabase();
    const repo = new SupabaseSubscriptionRepository(supabase);
    await repo.remove(user.id, params.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error, 'subscriptions DELETE');
  }
}
