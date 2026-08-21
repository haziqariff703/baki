'use client';

/**
 * Subscription Ledger (Dashboard).
 *
 * Implements interactive filtering (Recommendation status, Billing cycle),
 * multi-attribute sorting (Risk/Score, Cost, Date, Name), and local merchant search.
 * Deterministic scoring via computeScoreResult (§2.1, §2.5).
 * Impeccable Ledger-Rule styling with AA contrast compliance.
 */

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  Eye,
  PauseCircle,
  XCircle,
  FileUp,
  ListChecks,
  TrendingUp,
  Search,
  Filter,
  ArrowUpDown,
  RotateCcw,
  X,
  type LucideIcon,
} from 'lucide-react';
import { computeScoreResult, type Recommendation } from '@/features/scoring';
import { senToMyr } from '@/lib/money';
import { toDatePart } from '@/lib/dates';
import { scoreInputSchema, type SubscriptionSchema } from '@/lib/validation';
import { useSearch } from '@/components/shared/SearchContext';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';
import { Pagination } from '@/components/shared/Pagination';
import { Link } from '@/i18n/routing';

interface SubscriptionLedgerProps {
  readonly subscriptions: readonly SubscriptionSchema[];
}

type SortOption = 'risk' | 'amount-desc' | 'amount-asc' | 'date' | 'name';

/** Icon + color classes per recommendation — never color alone (§16). */
const RECOMMENDATION_STYLE: Record<
  Recommendation['type'],
  { Icon: LucideIcon; className: string }
> = {
  keep: {
    Icon: CheckCircle2,
    className:
      'text-status-emerald-text border-status-emerald-border bg-status-emerald-surface',
  },
  review: {
    Icon: Eye,
    className:
      'text-status-blue-text border-status-blue-border bg-status-blue-surface',
  },
  downgrade_or_pause: {
    Icon: PauseCircle,
    className:
      'text-status-amber-text border-status-amber-border bg-status-amber-surface',
  },
  consider_cancelling: {
    Icon: XCircle,
    className:
      'text-status-rose-text border-status-rose-border bg-status-rose-surface',
  },
};

export function SubscriptionLedger({ subscriptions }: SubscriptionLedgerProps) {
  const tCommon = useTranslations('Common');
  const t = useTranslations('Dashboard');
  const search = useSearch();
  const term = (search?.term ?? '').trim().toLowerCase();

  const [localSearch, setLocalSearch] = useState('');
  const [recommendationFilter, setRecommendationFilter] = useState<'all' | Recommendation['type']>('all');
  const [cycleFilter, setCycleFilter] = useState<'all' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('risk');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 6;

  // Deterministic scoring per subscription via the engine (§2.1, §2.5).
  const scored = useMemo(
    () =>
      subscriptions.map((sub) => ({
        subscription: sub,
        result: computeScoreResult(
          scoreInputSchema.parse({
            usage: sub.usage,
            necessity: sub.necessity,
            affordability: sub.affordability,
            uniqueness: sub.uniqueness,
            satisfaction: sub.satisfaction,
          }),
        ),
      })),
    [subscriptions],
  );

  const activeSearch = (localSearch || term).trim().toLowerCase();

  const isFiltered =
    activeSearch !== '' ||
    recommendationFilter !== 'all' ||
    cycleFilter !== 'all' ||
    sortBy !== 'risk';

  const resetFilters = () => {
    setLocalSearch('');
    setRecommendationFilter('all');
    setCycleFilter('all');
    setSortBy('risk');
    setCurrentPage(1);
  };

  const filteredAndSorted = useMemo(() => {
    let list = scored;

    // 1. Search Filter
    if (activeSearch !== '') {
      list = list.filter((s) =>
        s.subscription.merchantName.toLowerCase().includes(activeSearch),
      );
    }

    // 2. Recommendation Filter
    if (recommendationFilter !== 'all') {
      list = list.filter((s) => s.result.recommendation.type === recommendationFilter);
    }

    // 3. Cycle Filter
    if (cycleFilter !== 'all') {
      list = list.filter((s) => s.subscription.cycle === cycleFilter);
    }

    // 4. Sorting
    return [...list].sort((a, b) => {
      if (sortBy === 'risk') return a.result.score - b.result.score; // Lowest score (highest risk) first
      if (sortBy === 'amount-desc') return b.subscription.amountSen - a.subscription.amountSen;
      if (sortBy === 'amount-asc') return a.subscription.amountSen - b.subscription.amountSen;
      if (sortBy === 'date')
        return a.subscription.nextChargeDate.localeCompare(b.subscription.nextChargeDate);
      if (sortBy === 'name')
        return a.subscription.merchantName.localeCompare(b.subscription.merchantName);
      return 0;
    });
  }, [scored, activeSearch, recommendationFilter, cycleFilter, sortBy]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSorted.slice(start, start + PAGE_SIZE);
  }, [filteredAndSorted, currentPage]);

  // The single amber left-tick annotates the highest-risk (lowest score) row.
  const riskiestId =
    scored.length === 0
      ? null
      : scored.reduce((min, s) => (s.result.score < min.result.score ? s : min))
          .subscription.id;

  const steps: ReadonlyArray<{ Icon: LucideIcon; title: string; desc: string }> = [
    { Icon: FileUp, title: t('step1Title'), desc: t('step1Desc') },
    { Icon: ListChecks, title: t('step2Title'), desc: t('step2Desc') },
    { Icon: TrendingUp, title: t('step3Title'), desc: t('step3Desc') },
  ];

  if (scored.length === 0) {
    return (
      <div className="bg-surface-1 border border-border-1 rounded-xl p-6 md:p-8">
        <h3 className="text-base font-semibold text-text-primary">
          {t('onboardingTitle')}
        </h3>
        <p className="text-sm text-text-muted mt-1">{t('onboardingDesc')}</p>
        <ol className="mt-6 space-y-4">
          {steps.map(({ Icon, title, desc }, i) => (
            <li key={title} className="flex items-start gap-4">
              <span
                className="font-mono text-xs text-text-faint mt-0.5 w-4 shrink-0"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <Icon className="w-4 h-4 text-text-faint mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">{title}</p>
                <p className="text-xs text-text-muted mt-0.5">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link
          href="/subscriptions"
          className="mt-6 inline-flex items-center bg-surface-2 border border-border-2 text-text-primary font-medium text-sm py-2 px-6 rounded-xl hover:bg-surface-3 hover:border-border-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          + {tCommon('Subscription')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Interactive Toolbar: Search, Filters & Sorting */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-surface-1/60 border border-border-1 rounded-xl p-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t('filter.searchPlaceholder')}
            className="w-full bg-surface-2 border border-border-2 rounded-lg pl-8 pr-7 py-1.5 text-xs text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                setCurrentPage(1);
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-primary p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Recommendation Filter Dropdown */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={recommendationFilter}
              aria-label="Filter by recommendation"
              onChange={(e) => {
                setRecommendationFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto bg-surface-2 border border-border-2 rounded-lg px-2.5 py-1.5 text-xs text-text-secondary font-medium focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer hover:text-text-primary transition-colors"
            >
              <option value="all">{t('filter.allRecommendations')}</option>
              <option value="keep">{t('recommendation.keep')} (75–100)</option>
              <option value="review">{t('recommendation.review')} (55–74)</option>
              <option value="downgrade_or_pause">{t('recommendation.downgrade_or_pause')} (35–54)</option>
              <option value="consider_cancelling">{t('recommendation.consider_cancelling')} (0–34)</option>
            </select>
          </div>

          {/* Billing Cycle Filter Dropdown */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={cycleFilter}
              aria-label="Filter by cycle"
              onChange={(e) => {
                setCycleFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto bg-surface-2 border border-border-2 rounded-lg px-2.5 py-1.5 text-xs text-text-secondary font-medium focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer hover:text-text-primary transition-colors"
            >
              <option value="all">{t('filter.allCycles')}</option>
              <option value="monthly">{t('cycle.monthly')}</option>
              <option value="yearly">{t('cycle.yearly')}</option>
              <option value="quarterly">{t('cycle.quarterly')}</option>
              <option value="weekly">{t('cycle.weekly')}</option>
            </select>
          </div>

          {/* Sort Order Dropdown */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={sortBy}
              aria-label={t('filter.sortBy')}
              onChange={(e) => {
                setSortBy(e.target.value as SortOption);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto bg-surface-2 border border-border-2 rounded-lg px-2.5 py-1.5 text-xs text-text-secondary font-medium focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer hover:text-text-primary transition-colors"
            >
              <option value="risk">{t('filter.sortRisk')}</option>
              <option value="amount-desc">{t('filter.sortAmountDesc')}</option>
              <option value="amount-asc">{t('filter.sortAmountAsc')}</option>
              <option value="date">{t('filter.sortDate')}</option>
              <option value="name">{t('filter.sortName')}</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              type="button"
              onClick={resetFilters}
              title={t('filter.reset')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border-2 bg-surface-2 hover:bg-surface-3 text-xs text-accent font-medium transition-colors shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden md:inline">{t('filter.reset')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Subscriptions Table / List */}
      {filteredAndSorted.length === 0 ? (
        <div className="bg-surface-1 border border-border-1 rounded-xl p-10 flex flex-col items-center justify-center text-center space-y-2">
          <Search className="w-6 h-6 text-text-faint" aria-hidden="true" />
          <p className="text-sm text-text-muted">{t('noResults')}</p>
          {isFiltered && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-accent underline underline-offset-4 hover:text-accent-hover transition-colors"
            >
              {t('filter.reset')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <ul className="divide-y divide-border-1 border border-border-1 rounded-xl bg-surface-1 overflow-hidden">
            {paginated.map(({ subscription, result }) => {
              const style = RECOMMENDATION_STYLE[result.recommendation.type];
              const { Icon } = style;
              const ticked = subscription.id === riskiestId;
              return (
                <li
                  key={subscription.id}
                  className={`flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-2/40 ${
                    ticked ? 'border-l-2 border-accent pl-4' : ''
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <BrandLogo merchantName={subscription.merchantName} size={32} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {subscription.merchantName}
                      </p>
                      <p className="text-xs text-text-faint mt-0.5">
                        {t(`cycle.${subscription.cycle}`)}
                        {' · '}
                        {t('nextChargeLabel', {
                          date: toDatePart(subscription.nextChargeDate),
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <span className="font-mono text-xs sm:text-sm font-semibold text-text-primary">
                      {result.score}
                      <span className="text-[10px] sm:text-xs font-normal text-text-faint">
                        /100
                      </span>
                    </span>
                    <span
                      className={`hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] sm:text-xs font-medium ${style.className}`}
                    >
                      <Icon className="w-3 h-3" aria-hidden="true" />
                      <span className="truncate">{t(`recommendation.${result.recommendation.type}`)}</span>
                    </span>
                    <span
                      className="font-mono text-xs sm:text-sm font-semibold text-text-primary text-right"
                      aria-label={t('amountLabel', {
                        amount: senToMyr(subscription.amountSen),
                      })}
                    >
                      MYR {senToMyr(subscription.amountSen)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between text-xs text-text-muted px-1">
            <span>
              {t('filter.showingCount', {
                count: paginated.length,
                total: filteredAndSorted.length,
              })}
            </span>
            <Pagination
              currentPage={currentPage}
              totalItems={filteredAndSorted.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
