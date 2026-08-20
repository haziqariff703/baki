-- Allow authenticated users to delete their own transactions and import ledgers (AGENTS.md §2.3 Privacy by Design & PDPA)

DROP POLICY IF EXISTS "transactions_delete_own" ON public.transactions;
CREATE POLICY "transactions_delete_own"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "imports_delete_own" ON public.imports;
CREATE POLICY "imports_delete_own"
  ON public.imports FOR DELETE
  USING (auth.uid() = user_id);
