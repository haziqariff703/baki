'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Inbox, ShieldCheck, Search, X, ArrowUpDown } from 'lucide-react';
import { senToMyr, type MoneyInSen } from '@/lib/money';
import { toDatePart } from '@/lib/dates';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';
import { CategoryBreakdown } from '@/components/transactions/CategoryBreakdown';
import { Pagination } from '@/components/shared/Pagination';

/**
 * Transactions — read-only ledger of imported transaction records with
 * optimized search and pagination (AGENTS.md §10.3, DESIGN.md).
 */

interface TransactionRecord {
  readonly id: string;
  readonly merchantName: string;
  readonly amountSen: MoneyInSen;
  readonly date: string;
  readonly category?: string;
}

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
  readonly initialTransactions?: readonly TransactionRecord[];
}

const PAGE_SIZE = 10;

export function TransactionList({ initialTransactions = SAMPLE_TRANSACTIONS }: TransactionListProps) {
  const t = useTranslations('Transactions');

  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'name'>('date-desc');

  const transactions = initialTransactions;

  // Filtered dataset
  const filtered = useMemo(() => {
    const q = activeQuery.trim().toLowerCase();
    let result = transactions;

    if (q !== '') {
      result = transactions.filter((txn) => {
        const nameMatch = txn.merchantName.toLowerCase().includes(q);
        const catMatch = txn.category?.toLowerCase().includes(q);
        const dateMatch = toDatePart(txn.date).includes(q);
        const amountMatch = senToMyr(txn.amountSen).includes(q);
        return nameMatch || catMatch || dateMatch || amountMatch;
      });
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
      if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
      if (sortBy === 'amount-desc') return b.amountSen - a.amountSen;
      if (sortBy === 'amount-asc') return a.amountSen - b.amountSen;
      return a.merchantName.localeCompare(b.merchantName);
    });
  }, [transactions, activeQuery, sortBy]);

  // Paginated slice
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchTerm);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setActiveQuery('');
    setCurrentPage(1);
  };

  const netTotalSen = transactions.reduce((sum, txn) => sum + txn.amountSen, 0);
  const filteredTotalSen = filtered.reduce((sum, txn) => sum + txn.amountSen, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Summary, Categories & Redaction note */}
      <div className="lg:col-span-4 space-y-6">
        {/* Summary */}
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
          {activeQuery && (
            <div className="flex items-baseline justify-between py-2">
              <span className="text-xs text-text-muted">Filtered Results</span>
              <span className="font-mono text-xs font-medium text-text-primary">
                {filtered.length}
              </span>
            </div>
          )}
          <div className="flex items-baseline justify-between py-2 last:pb-0">
            <span className="text-sm text-text-secondary">{t('totalLabel', { amount: senToMyr(activeQuery ? filteredTotalSen : netTotalSen) })}</span>
            <span className="font-mono text-sm font-medium text-text-primary border-l-2 border-accent pl-3">
              MYR {senToMyr(activeQuery ? filteredTotalSen : netTotalSen)}
            </span>
          </div>
        </section>

        {/* Category breakdown */}
        {transactions.length > 0 && <CategoryBreakdown transactions={transactions} />}

        {/* Provenance / redaction note */}
        <p className="text-xs text-text-faint flex items-start gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="font-mono uppercase tracking-wider">
            {t('sampleNote')} · {t('redactionNote')}
          </span>
        </p>
      </div>

      {/* Right Column: Transaction List with Search Bar & Pagination */}
      <div className="lg:col-span-8 space-y-4">
        {/* Search Bar & Sort Control */}
        <div className="bg-surface-1 border border-border-1 rounded-xl p-3 sm:p-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // Live filter as user types, or explicit search button
                  setActiveQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search transactions by merchant, category, date, or amount..."
                className="w-full bg-surface-2 border border-border-2 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-surface-3 hover:bg-surface-2 border border-border-3 text-text-primary text-xs sm:text-sm font-medium rounded-xl transition-colors shrink-0"
            >
              Search
            </button>
          </form>

          {/* Secondary bar: Sort selector + count */}
          <div className="flex items-center justify-between gap-3 text-xs text-text-muted pt-1 border-t border-border-1">
            <span className="font-mono text-[11px]">
              {filtered.length} {filtered.length === 1 ? 'record' : 'records'} found
            </span>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-text-faint shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort transactions"
                className="bg-surface-2 border border-border-2 rounded-lg px-2.5 py-1 text-xs text-text-primary focus:border-accent focus:outline-none cursor-pointer"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
                <option value="name">Merchant (A–Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table / List */}
        {filtered.length === 0 ? (
          <div
            className="bg-surface-1 border border-border-1 rounded-xl p-12 flex flex-col items-center text-center space-y-2"
            role="status"
            aria-live="polite"
          >
            <Inbox className="w-8 h-8 text-text-faint" />
            <p className="text-sm text-text-secondary font-medium">
              {transactions.length === 0 ? t('empty') : 'No matching transactions found'}
            </p>
            {activeQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-xs text-accent hover:underline font-medium pt-1"
              >
                Reset search filter
              </button>
            )}
          </div>
        ) : (
          <section aria-label={t('merchantHeading')} className="space-y-3">
            {/* Column header */}
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
              {paginatedRows.map((txn) => (
                <li
                  key={txn.id}
                  className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-surface-2/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <BrandLogo merchantName={txn.merchantName} size={28} />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-text-primary block truncate">
                        {txn.merchantName}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <span className="font-mono text-[11px]">
                          {toDatePart(txn.date)}
                        </span>
                        {txn.category && (
                          <span className="text-[11px] px-1.5 py-0.2 rounded bg-surface-2 text-text-faint border border-border-1">
                            {txn.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-medium text-text-primary text-right shrink-0">
                    MYR {senToMyr(txn.amountSen)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </section>
        )}
      </div>
    </div>
  );
}
