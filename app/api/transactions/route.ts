/**
 * Transactions route (AGENTS.md §11, §2.3 Privacy by Design).
 *
 * GET /api/transactions - List authenticated user's transactions
 * DELETE /api/transactions?id=<uuid> - Delete a specific transaction
 * DELETE /api/transactions?all=true - Clear all transactions for authenticated user
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { toErrorResponse } from '@/lib/api';
import { createServerSupabase } from '@/lib/database';
import { SupabaseTransactionRepository } from '@/features/transactions';
import { z } from 'zod';

const deleteTransactionQuerySchema = z
  .object({
    id: z.string().uuid().optional(),
    all: z.literal('true').optional(),
  })
  .strict()
  .refine((value) => Boolean(value.id) !== Boolean(value.all), {
    message: 'Provide exactly one of id or all=true',
  });

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createServerSupabase();
    const repo = new SupabaseTransactionRepository(supabase);
    const transactions = await repo.list(user.id);
    return NextResponse.json({ transactions });
  } catch (error) {
    return toErrorResponse(error, 'transactions GET');
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const supabase = await createServerSupabase();

    const { searchParams } = new URL(request.url);
    const { id, all } = deleteTransactionQuerySchema.parse(Object.fromEntries(searchParams));

    if (id) {
      await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);
      return NextResponse.json({ success: true, deletedId: id });
    }

    void all;
    // Clear user transactions, recurring_candidates, and import records
    await supabase.from('transactions').delete().eq('user_id', user.id);
    await supabase.from('recurring_candidates').delete().eq('user_id', user.id);
    await supabase.from('imports').delete().eq('user_id', user.id);

    return NextResponse.json({ success: true, clearedAll: true });
  } catch (error) {
    return toErrorResponse(error, 'transactions DELETE');
  }
}
