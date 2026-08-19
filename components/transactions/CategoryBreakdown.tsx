'use client';

import { useTranslations } from 'next-intl';
import { senToMyr, type MoneyInSen } from '@/lib/money';

/**
 * Transactions — category breakdown bars.
 *
 * Groups the LOCAL sample records by `category` and renders one settled bar
 * per category (pure CSS, no chart lib, no animation). Values are the sum of
 * integer sen per category — deterministic, hydration-safe.
 *
 * Ledger Rule: category label left (text-secondary), hairline rule, mono
 * total right. Neutral fills — no amber accent (the single amber annotation
 * on this view is the net-total row in TransactionList).
 *
 * NOTE: transactions currently have no domain module — this reads the same
 * local sample array as TransactionList. The "sample data" note stays.
 */

interface TransactionRecord {
  readonly id: string;
  readonly merchantName: string;
  readonly amountSen: MoneyInSen;
  readonly date: string;
  readonly category?: string;
}

interface CategoryBreakdownProps {
  readonly transactions: readonly TransactionRecord[];
}

export function CategoryBreakdown({ transactions }: CategoryBreakdownProps) {
  const t = useTranslations('Transactions');

  // Deterministic grouping, insertion order = first-seen order in the sample.
  const totals = new Map<string, MoneyInSen>();
  for (const txn of transactions) {
    const key = txn.category ?? t('uncategorised');
    totals.set(key, (totals.get(key) ?? 0) + txn.amountSen);
  }
  const rows = [...totals.entries()]
    .map(([category, totalSen]) => ({ category, totalSen }))
    .sort((a, b) => b.totalSen - a.totalSen);

  const max = Math.max(1, ...rows.map((r) => r.totalSen));

  if (rows.length === 0) return null;

  return (
    <section
      aria-labelledby="category-breakdown-heading"
      className="bg-surface-1 border border-border-1 rounded-xl"
    >
      <div className="px-5 pt-5 pb-4 border-b border-border-1">
        <h2
          id="category-breakdown-heading"
          className="text-xs font-mono uppercase tracking-wider text-text-faint"
        >
          {t('categoryHeading')}
        </h2>
        <p className="text-xs text-text-muted mt-0.5">{t('categorySub')}</p>
      </div>
      <ul className="divide-y divide-border-1" aria-label={t('categoryHeading')}>
        {rows.map((row) => {
          const pct = Math.round((row.totalSen / max) * 100);
          return (
            <li key={row.category} className="px-5 py-3">
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="text-sm text-text-secondary truncate">
                  {row.category}
                </span>
                <span className="font-mono text-sm text-text-primary shrink-0">
                  MYR {senToMyr(row.totalSen)}
                </span>
              </div>
              <div
                className="h-2 rounded-full bg-surface-3 overflow-hidden"
                role="img"
                aria-label={t('categoryAria', {
                  name: row.category,
                  amount: senToMyr(row.totalSen),
                })}
              >
                <div
                  className="h-full rounded-full bg-text-secondary"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
