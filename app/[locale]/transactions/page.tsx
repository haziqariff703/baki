import { getTranslations } from 'next-intl/server';
import { AppShell } from '@/components/layout/AppShell';
import { TransactionList, SAMPLE_TRANSACTIONS } from '@/components/transactions/TransactionList';
import { createClient } from '@/lib/supabase/server';
import { SupabaseTransactionRepository } from '@/features/transactions/repository';

/**
 * Transactions — server-rendered shell.
 * Raw uploaded statements are deleted after extraction (AGENTS.md §12);
 * only the redacted, imported transaction records remain. The client
 * component owns the read-only interactive list.
 */
export default async function TransactionsPage() {
  const t = await getTranslations('Transactions');

  let initialTransactions: any[] = [];

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const repo = new SupabaseTransactionRepository(supabase);
      const transactions = await repo.list(user.id);

      if (transactions) {
        initialTransactions = transactions.map((t) => ({
          id: t.id,
          merchantName: t.merchantName,
          amountSen: t.amountSen,
          date: t.transactionDate,
          category: undefined,
        }));
      }
    } else {
      // Guest demo session fallback
      initialTransactions = SAMPLE_TRANSACTIONS as any[];
    }
  } catch (error) {
    console.error('[TransactionsPage] Server hydration error:', error);
  }

  return (
    <AppShell title={t('title')}>
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-[-0.01em] text-text-primary">
            {t('title')}
          </h1>
          <p className="text-sm text-text-muted">{t('subtitle')}</p>
        </div>
        <TransactionList initialTransactions={initialTransactions} />
      </div>
    </AppShell>
  );
}
