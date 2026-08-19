'use client';

/**
 * Subscription manager — client-side CRUD over the subscription list.
 *
 * State is local (synthetic fixtures seed it). Scores come from the
 * deterministic engine `computeScoreResult` via the `scoreInputSchema`
 * trust boundary — never recomputed here (AGENTS.md §2.1, §5.1). Money is
 * integer sen throughout (§8.1). The single amber left-tick annotates the
 * highest-risk (lowest score) row per the Ledger Rule (DESIGN.md §6).
 */

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  Eye,
  PauseCircle,
  PlayCircle,
  XCircle,
  SlidersHorizontal,
  Trash2,
  Plus,
  Search,
  ListChecks,
  ShieldCheck,
  AlertTriangle,
  ArrowUpDown,
  Calculator,
  type LucideIcon,
} from 'lucide-react';
import { computeScoreResult, type Recommendation, type ScoreInput } from '@/features/scoring';
import { normalizeToMonthlySen } from '@/features/cash-flow';
import { senToMyr } from '@/lib/money';
import { toDatePart } from '@/lib/dates';
import { scoreInputSchema, type SubscriptionSchema } from '@/lib/validation';
import { useSearch } from '@/components/shared/SearchContext';
import { SubscriptionForm } from '@/components/subscriptions/SubscriptionForm';
import { ScoreBreakdown } from '@/components/subscriptions/ScoreBreakdown';
import { ScoreEvaluatorModal } from '@/components/subscriptions/ScoreEvaluatorModal';
import { StudentSavingsCard } from '@/components/subscriptions/StudentSavingsCard';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';
import { detectStudentSavings } from '@/features/student-optimizer';
import { cn } from '@/lib/utils';

interface SubscriptionManagerProps {
  readonly initialSubscriptions: readonly SubscriptionSchema[];
}

type StatusFilter = 'all' | 'active' | 'paused';
type SortOption = 'risk' | 'date' | 'amount' | 'name';
type ViewMode = 'actual' | 'monthly';

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

export function SubscriptionManager({ initialSubscriptions }: SubscriptionManagerProps) {
  const t = useTranslations('Subscriptions');
  const tDash = useTranslations('Dashboard');
  const search = useSearch();
  const term = (search?.term ?? '').trim().toLowerCase();

  const [subscriptions, setSubscriptions] = useState<readonly SubscriptionSchema[]>(
    initialSubscriptions,
  );
  const [pausedIds, setPausedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('risk');
  const [viewMode, setViewMode] = useState<ViewMode>('actual');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionSchema | null>(null);
  const [evaluatingSub, setEvaluatingSub] = useState<SubscriptionSchema | null>(null);
  const [formSession, setFormSession] = useState(0);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function togglePause(id: string) {
    setPausedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Deterministic scoring per subscription via the engine (§2.1, §2.5).
  const scored = useMemo(
    () =>
      subscriptions.map((sub) => {
        const isPaused = pausedIds.has(sub.id);
        return {
          subscription: sub,
          isPaused,
          monthlySen: normalizeToMonthlySen(sub.amountSen, sub.cycle),
          result: computeScoreResult(
            scoreInputSchema.parse({
              usage: sub.usage,
              necessity: sub.necessity,
              affordability: sub.affordability,
              uniqueness: sub.uniqueness,
              satisfaction: sub.satisfaction,
            }),
          ),
        };
      }),
    [subscriptions, pausedIds],
  );

  const filteredAndSorted = useMemo(() => {
    let list = scored;

    // Search filter
    if (term !== '') {
      list = list.filter((s) =>
        s.subscription.merchantName.toLowerCase().includes(term),
      );
    }

    // Status filter
    if (statusFilter === 'active') {
      list = list.filter((s) => !s.isPaused);
    } else if (statusFilter === 'paused') {
      list = list.filter((s) => s.isPaused);
    }

    // Sorting
    return [...list].sort((a, b) => {
      if (sortBy === 'risk') {
        return a.result.score - b.result.score; // Lowest score / highest risk first
      }
      if (sortBy === 'date') {
        return a.subscription.nextChargeDate.localeCompare(b.subscription.nextChargeDate);
      }
      if (sortBy === 'amount') {
        return b.monthlySen - a.monthlySen; // Highest monthly cost first
      }
      return a.subscription.merchantName.localeCompare(b.subscription.merchantName);
    });
  }, [scored, term, statusFilter, sortBy]);

  // The single amber left-tick annotates the highest-risk (lowest score) active row.
  const riskiestId = useMemo(() => {
    const activeScored = scored.filter((s) => !s.isPaused);
    if (activeScored.length === 0) return null;
    return activeScored.reduce((min, s) =>
      s.result.score < min.result.score ? s : min,
    ).subscription.id;
  }, [scored]);

  function openCreate() {
    setEditing(null);
    setFormSession((n) => n + 1);
    setFormOpen(true);
  }

  function openEdit(sub: SubscriptionSchema) {
    setEditing(sub);
    setFormSession((n) => n + 1);
    setFormOpen(true);
  }

  function openEvaluate(sub: SubscriptionSchema) {
    setEvaluatingSub(sub);
  }

  async function handleSave(sub: SubscriptionSchema) {
    const isNew = !subscriptions.find((s) => s.id === sub.id);
    const prevSubs = [...subscriptions];

    setSubscriptions((prev) => {
      const idx = prev.findIndex((s) => s.id === sub.id);
      if (idx === -1) return [...prev, sub];
      const next = [...prev];
      next[idx] = sub;
      return next;
    });

    try {
      if (isNew) {
        const { id, ...createPayload } = sub;
        const res = await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createPayload),
        });
        if (!res.ok) throw new Error('Failed to create');
        const data = await res.json();
        setSubscriptions((prev) =>
          prev.map((s) => (s.id === sub.id ? data.subscription : s)),
        );
      } else {
        const { id, ...updatePayload } = sub;
        const res = await fetch(`/api/subscriptions/${sub.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });
        if (!res.ok) throw new Error('Failed to update');
      }
    } catch (error) {
      setSubscriptions(prevSubs);
    }
  }

  async function handleSaveRatings(id: string, newRatings: ScoreInput) {
    const prevSubs = [...subscriptions];

    setSubscriptions((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const updated: SubscriptionSchema = {
        ...prev[idx],
        ...newRatings,
      };
      const next = [...prev];
      next[idx] = updated;
      return next;
    });

    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRatings),
      });
      if (!res.ok) throw new Error('Failed to update ratings');
    } catch (error) {
      setSubscriptions(prevSubs);
    }
  }

  async function handleDelete(id: string) {
    const prevSubs = [...subscriptions];

    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    setPendingDeleteId(null);

    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
    } catch (error) {
      setSubscriptions(prevSubs);
    }
  }

  const pendingDelete = pendingDeleteId
    ? subscriptions.find((s) => s.id === pendingDeleteId) ?? null
    : null;

  /* Empty state — no subscriptions at all. */
  if (subscriptions.length === 0) {
    return (
      <>
        <div className="bg-surface-1 border border-border-1 rounded-xl p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-4">
          <ListChecks className="w-8 h-8 text-text-faint" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-text-primary">{t('emptyTitle')}</h2>
            <p className="text-sm text-text-muted max-w-sm">{t('emptyBody')}</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-border-3 bg-surface-3 text-text-primary text-sm font-medium hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t('emptyCta')}
          </button>
        </div>
        <SubscriptionForm
          open={formOpen}
          initial={editing}
          session={formSession}
          onSave={handleSave}
          onClose={() => setFormOpen(false)}
        />
      </>
    );
  }

  const activeCount = scored.filter((s) => !s.isPaused).length;
  const pausedCount = scored.filter((s) => s.isPaused).length;

  const studentSavingsSummary = useMemo(
    () => detectStudentSavings(subscriptions, true),
    [subscriptions],
  );

  return (
    <div className="space-y-6">
      {/* Student Discount Optimizer Banner */}
      <StudentSavingsCard summary={studentSavingsSummary} />

      {/* Filter + sort + actions bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Status Tabs */}
          <div className="inline-flex rounded-xl border border-border-1 bg-surface-1 p-1">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                statusFilter === 'all'
                  ? 'bg-surface-3 text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary',
              )}
            >
              {t('countLabel', { count: subscriptions.length })}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                statusFilter === 'active'
                  ? 'bg-surface-3 text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary',
              )}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('paused')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                statusFilter === 'paused'
                  ? 'bg-surface-3 text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary',
              )}
            >
              Paused ({pausedCount})
            </button>
          </div>

          {/* Right Controls: View Mode, Sorting & Add CTA */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl border border-border-1 bg-surface-1 p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('actual')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-medium transition-colors',
                  viewMode === 'actual'
                    ? 'bg-surface-3 text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary',
                )}
              >
                Actual
              </button>
              <button
                type="button"
                onClick={() => setViewMode('monthly')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-medium transition-colors',
                  viewMode === 'monthly'
                    ? 'bg-surface-3 text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary',
                )}
              >
                Monthly Norm
              </button>
            </div>

            {/* Sort Selector */}
            <div className="relative inline-flex items-center">
              <ArrowUpDown className="w-3.5 h-3.5 absolute left-3 text-text-faint pointer-events-none" />
              <select
                value={sortBy}
                aria-label="Sort subscriptions"
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-surface-1 border border-border-1 rounded-xl pl-8 pr-3 py-1.5 text-xs text-text-primary font-medium focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
              >
                <option value="risk">Highest Risk First</option>
                <option value="date">Next Due Date</option>
                <option value="amount">Highest Cost</option>
                <option value="name">Name (A–Z)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border-3 bg-surface-3 text-text-primary text-xs font-medium hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              {t('addCta')}
            </button>
          </div>
        </div>
      </div>

      {/* Ledger list */}
      {filteredAndSorted.length === 0 ? (
        <div className="bg-surface-1 border border-border-1 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <Search className="w-6 h-6 text-text-faint mb-3" aria-hidden="true" />
          <p className="text-sm text-text-muted">{t('noResults')}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAndSorted.map(({ subscription, result, isPaused, monthlySen }) => {
            const style = RECOMMENDATION_STYLE[result.recommendation.type];
            const { Icon } = style;
            const ticked = subscription.id === riskiestId;
            const confirmingDelete = pendingDeleteId === subscription.id;

            // Decision-Tree Safeguard Rules (§3.2)
            const isEssentialSafeguard =
              subscription.necessity >= 4 &&
              (result.recommendation.type === 'downgrade_or_pause' ||
                result.recommendation.type === 'consider_cancelling');
            const hasUsageInconsistency = result.score >= 75 && subscription.usage <= 2;

            return (
              <li
                key={subscription.id}
                className={cn(
                  'border border-border-1 rounded-xl bg-surface-1 p-5 flex flex-col justify-between transition-opacity',
                  ticked && 'border-l-2 border-l-accent pl-4',
                  isPaused && 'opacity-65',
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-3">
                      <BrandLogo merchantName={subscription.merchantName} size={36} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {subscription.merchantName}
                          </p>
                          {isPaused && (
                            <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-status-amber-border text-status-amber-text bg-status-amber-surface">
                              Paused
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-faint mt-0.5">
                          {tDash(`cycle.${subscription.cycle}`)}
                          {' · '}
                          {tDash('nextChargeLabel', {
                            date: toDatePart(subscription.nextChargeDate),
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Score Badge & Recommendation - Clickable to open Evaluator */}
                      <button
                        type="button"
                        onClick={() => openEvaluate(subscription)}
                        title={t('evaluator.openCta')}
                        aria-label={t('evaluator.openCta')}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer group"
                      >
                        <span className="font-mono text-sm font-medium text-text-primary group-hover:text-accent transition-colors">
                          {result.score}
                          <span className="text-xs font-normal text-text-faint">/100</span>
                        </span>

                        <span
                          className={cn(
                            'hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium',
                            style.className,
                          )}
                        >
                          <Icon className="w-3 h-3" aria-hidden="true" />
                          {tDash(`recommendation.${result.recommendation.type}`)}
                        </span>
                      </button>

                      {/* Displayed Amount */}
                      <span
                        className="font-mono text-sm text-text-primary text-right pl-2"
                        aria-label={tDash('amountLabel', {
                          amount: senToMyr(
                            viewMode === 'monthly' ? monthlySen : subscription.amountSen,
                          ),
                        })}
                      >
                        MYR{' '}
                        {senToMyr(
                          viewMode === 'monthly' ? monthlySen : subscription.amountSen,
                        )}
                        {viewMode === 'monthly' && (
                          <span className="text-[10px] text-text-faint block -mt-1 font-sans">
                            /mo
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Decision Tree Safeguard / Inconsistency Alerts (§3.2) */}
                  {(isEssentialSafeguard || hasUsageInconsistency) && (
                    <div className="space-y-1.5 pt-1">
                      {isEssentialSafeguard && (
                        <p className="text-[11px] text-status-blue-text bg-status-blue-surface border border-status-blue-border rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Essential safeguard: Review cheaper plan rather than cancelling.</span>
                        </p>
                      )}
                      {hasUsageInconsistency && (
                        <p className="text-[11px] text-status-amber-text bg-status-amber-surface border border-status-amber-border rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Inconsistency: High score recorded despite infrequent usage.</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Row: Score Breakdown & Action Buttons */}
                <div className="mt-4 pt-3 border-t border-border-1 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <ScoreBreakdown
                      breakdown={result.breakdown}
                      totalScore={result.score}
                    />
                  </div>

                  {/* Row actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEvaluate(subscription)}
                      aria-label={t('evaluator.openCta')}
                      title={t('evaluator.openCta')}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-accent hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    >
                      <Calculator className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePause(subscription.id)}
                      aria-label={isPaused ? 'Resume subscription' : 'Pause subscription'}
                      title={isPaused ? 'Resume subscription' : 'Pause subscription'}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    >
                      {isPaused ? (
                        <PlayCircle className="w-4 h-4 text-status-emerald-text" />
                      ) : (
                        <PauseCircle className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(subscription)}
                      aria-label={t('editLabel', { name: subscription.merchantName })}
                      title={t('editLabel', { name: subscription.merchantName })}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    >
                      <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(subscription.id)}
                      aria-label={t('deleteLabel', { name: subscription.merchantName })}
                      title={t('deleteLabel', { name: subscription.merchantName })}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-status-rose-text hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Inline delete confirmation — never delete on one misclick. */}
                {confirmingDelete && (
                  <div
                    role="alert"
                    className="mt-3 flex items-center justify-between gap-4 flex-wrap border border-status-rose-border bg-status-rose-surface rounded-xl px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-status-rose-text">
                        {t('deleteConfirmTitle')}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {t('deleteConfirmBody', { name: subscription.merchantName })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(null)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                      >
                        {t('deleteCancelAction')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(subscription.id)}
                        className="px-3 py-1.5 rounded-xl border border-status-rose-border bg-status-rose-surface text-status-rose-text text-xs font-semibold hover:brightness-110 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                      >
                        {t('deleteConfirmAction')}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Slide-over create/edit form */}
      <SubscriptionForm
        open={formOpen}
        initial={editing}
        session={formSession}
        onSave={handleSave}
        onClose={() => setFormOpen(false)}
      />

      {/* 5-Question Value Score Calculator Modal */}
      <ScoreEvaluatorModal
        open={!!evaluatingSub}
        subscription={evaluatingSub}
        onSaveRatings={handleSaveRatings}
        onClose={() => setEvaluatingSub(null)}
      />

      {/* Screen-reader safety: pendingDelete is derived; no dialog when null. */}
      <span className="sr-only" aria-live="polite">
        {pendingDelete ? t('deleteConfirmTitle') : ''}
      </span>
    </div>
  );
}
