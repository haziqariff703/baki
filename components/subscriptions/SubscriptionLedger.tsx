'use client';

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
  type LucideIcon,
} from 'lucide-react';
import { computeScoreResult, type Recommendation } from '@/features/scoring';
import { senToMyr } from '@/lib/money';
import { toDatePart } from '@/lib/dates';
import { scoreInputSchema, type SubscriptionSchema } from '@/lib/validation';
import { useSearch } from '@/components/shared/SearchContext';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';
import { Pagination } from '@/components/shared/Pagination';

interface SubscriptionLedgerProps {
  readonly subscriptions: readonly SubscriptionSchema[];
}

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

/**
 * Client subscription ledger. Owns the live search filter (via SearchContext,
 * fed by the Header input) and renders the Ledger-Rule rows. Scores are
 * computed by the deterministic engine — never recomputed here (§2.1, §5.1).
 * Shows a guided 3-step onboarding card when there is nothing to list.
 */
export function SubscriptionLedger({ subscriptions }: SubscriptionLedgerProps) {
  const tCommon = useTranslations('Common');
  const t = useTranslations('Dashboard');
  const search = useSearch();
  const term = (search?.term ?? '').trim().toLowerCase();

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

  const filtered = useMemo(
    () =>
      term === ''
        ? scored
        : scored.filter((s) =>
            s.subscription.merchantName.toLowerCase().includes(term),
          ),
    [scored, term],
  );

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 6;

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

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
        <button className="mt-6 bg-surface-2 border border-border-2 text-text-primary font-medium text-sm py-2 px-6 rounded-xl hover:bg-surface-3 hover:border-border-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          + {tCommon('Subscription')}
        </button>
      </div>
    );
  }

  return (
    <>
      {filtered.length === 0 ? (
        <div className="bg-surface-1 border border-border-1 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <Search className="w-6 h-6 text-text-faint mb-3" aria-hidden="true" />
          <p className="text-sm text-text-muted">{t('noResults')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="divide-y divide-border-1 border border-border-1 rounded-xl bg-surface-1">
            {paginated.map(({ subscription, result }) => {
              const style = RECOMMENDATION_STYLE[result.recommendation.type];
              const { Icon } = style;
              const ticked = subscription.id === riskiestId;
              return (
                <li
                  key={subscription.id}
                  className={`flex items-center justify-between gap-4 px-5 py-4 ${
                    ticked ? 'border-l-2 border-accent pl-3' : ''
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <BrandLogo merchantName={subscription.merchantName} size={32} />
                    <div className="min-w-0">
                      <p className="text-sm text-text-primary truncate">
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

          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </>
  );
}
