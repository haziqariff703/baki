'use client';

import { useTranslations } from 'next-intl';
import { Inbox, ShieldCheck } from 'lucide-react';
import { senToMyr, type MoneyInSen } from '@/lib/money';
import { toDatePart } from '@/lib/dates';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';
import { CategoryBreakdown } from '@/components/transactions/CategoryBreakdown';

/**
 * Transactions — read-only ledger of imported transaction records.
 *
 * UI-only shell: there is no `features/transactions` domain module yet, so
 * this renders a small local sample array. Raw uploaded statements are
 * deleted after extraction (AGENTS.md §12); only redacted imported records
 * persist — no account numbers, no card fragments.
 */

/** Sample record shape, mirroring the future domain entity. */
interface TransactionRecord {
  readonly id: string;
  readonly merchantName: string;
  readonly amountSen: MoneyInSen;
  readonly date: string;
  readonly category?: string;
}

/**
 * SAMPLE DATA — stands in for the repository until the transactions domain
 * module lands (AGENTS.md §5.3). Not persisted, not authoritative.
 */
export const SAMPLE_TRANSACTIONS: readonly TransactionRecord[] = [
  {
    id: 'txn-sample-01',
    merchantName: 'Spotify',
    amountSen: 1590,
    date: '2026-08-14T00:00:00.000Z',
    category: 'Entertainment',
  },
  {
    id: 'txn-sample-02',
    merchantName: 'Netflix',
    amountSen: 5500,
    date: '2026-08-12T00:00:00.000Z',
    category: 'Entertainment',
  },
  {
    id: 'txn-sample-03',
    merchantName: 'Grab',
    amountSen: 2430,
    date: '2026-08-11T00:00:00.000Z',
    category: 'Transport',
  },
  {
    id: 'txn-sample-04',
    merchantName: 'Unifi',
    amountSen: 8900,
    date: '2026-08-05T00:00:00.000Z',
    category: 'Utilities',
  },
  {
    id: 'txn-sample-05',
    merchantName: 'Shopee',
    amountSen: 6899,
    date: '2026-08-02T00:00:00.000Z',
    category: 'Shopping',
  },
  {
    id: 'txn-sample-06',
    merchantName: 'YouTube Premium',
    amountSen: 1790,
    date: '2026-07-28T00:00:00.000Z',
    category: 'Entertainment',
  },
];

interface TransactionListProps {
  initialTransactions?: readonly TransactionRecord[];
}

export function TransactionList({ initialTransactions = SAMPLE_TRANSACTIONS }: TransactionListProps) {
  const t = useTranslations('Transactions');

  const transactions = initialTransactions;
  const netTotalSen = transactions.reduce((sum, txn) => sum + txn.amountSen, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Summary, Categories & Redaction note */}
      <div className="lg:col-span-5 space-y-6">
        {/* Summary — Ledger Rule: label left, mono value right. Exactly one
            amber tick on the single most important figure (net total). */}
        <section
          aria-label={t('summaryHeading')}
          className="bg-surface-1 border border-border-1 rounded-xl px-5 py-4 divide-y divide-border-1"
        >
          <h2 className="sr-only">{t('summaryHeading')}</h2>
          <div className="flex items-baseline justify-between py-2 first:pt-0">
            <span className="text-sm text-text-secondary">{t('countLabel', { count: transactions.length })}</span>
            <span className="font-mono text-sm font-medium text-text-primary">
              {transactions.length}
            </span>
          </div>
          <div className="flex items-baseline justify-between py-2 last:pb-0">
            <span className="text-sm text-text-secondary">{t('totalLabel', { amount: senToMyr(netTotalSen) })}</span>
            <span className="font-mono text-sm font-medium text-text-primary border-l-2 border-accent pl-3">
              MYR {senToMyr(netTotalSen)}
            </span>
          </div>
        </section>

        {/* Category breakdown (local sample data) */}
        {transactions.length > 0 && <CategoryBreakdown transactions={transactions} />}

        {/* Provenance / redaction note — mono stamp, icon + text (never color alone) */}
        <p className="text-xs text-text-faint flex items-start gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="font-mono uppercase tracking-wider">
            {t('sampleNote')} · {t('redactionNote')}
          </span>
        </p>
      </div>

      {/* Right Column: Transaction List */}
      <div className="lg:col-span-7 space-y-4">
        {transactions.length === 0 ? (
          <div
            className="bg-surface-1 border border-border-1 rounded-xl p-12 flex flex-col items-center text-center"
            role="status"
            aria-live="polite"
          >
            <Inbox className="w-8 h-8 text-text-faint mb-3" />
            <p className="text-sm text-text-secondary font-medium">{t('empty')}</p>
          </div>
        ) : (
          <section aria-label={t('merchantHeading')} className="space-y-3">
            {/* Column header — mono stamps, mirrors the row anatomy */}
            <div
              aria-hidden="true"
              className="flex items-baseline justify-between gap-4 px-5"
            >
              <span className="flex items-baseline gap-6 min-w-0">
                <span className="font-mono text-xs uppercase tracking-wider text-text-faint">
                  {t('merchantHeading')}
                </span>
                <span className="hidden sm:inline font-mono text-xs uppercase tracking-wider text-text-faint">
                  {t('dateHeading')}
                </span>
              </span>
              <span className="font-mono text-xs uppercase tracking-wider text-text-faint">
                {t('amountHeading')}
              </span>
            </div>

            <ul
              aria-label={t('merchantHeading')}
              className="divide-y divide-border-1 border border-border-1 rounded-xl bg-surface-1"
            >
              {transactions.map((txn) => (
                <li
                  key={txn.id}
                  className="flex items-baseline justify-between gap-4 px-5 py-3"
                >
                  <div className="flex items-center gap-6 min-w-0">
                    <BrandLogo merchantName={txn.merchantName} size={20} />
                    <span className="text-sm text-text-primary truncate">
                      {txn.merchantName}
                    </span>
                    <span className="hidden sm:inline font-mono text-xs text-text-muted shrink-0">
                      {toDatePart(txn.date)}
                    </span>
                  </div>
                  <span className="font-mono text-sm text-text-primary text-right shrink-0">
                    MYR {senToMyr(txn.amountSen)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
