'use client';

/**
 * Candidate Confirmation Queue & Fast Keyboard Triage (AGENTS.md §2.2).
 *
 * Every detected recurring candidate requires an explicit human Confirm or Reject.
 * Includes single-key keyboard hotkeys ([Y], [N], [E], [J/K], [Z]) for high-speed triage.
 * Pure deterministic state updates without emojis or clutter.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  ShieldCheck,
  Inbox,
  Undo2,
  BrainCircuit,
  ArrowUpDown,
  Tag,
  ChevronDown,
  ChevronUp,
  Keyboard,
} from 'lucide-react';
import {
  applyConfirmation,
  applyEdit,
  deriveRecommendationHint,
  formatAmount,
  formatCadenceEvidence,
  type RecurringCandidate,
} from '@/features/recurring-detection';
import { myrToSen } from '@/lib/money';
import { candidateEditSchema } from '@/lib/validation';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';
import { ConfidencePanel } from './ConfidencePanel';
import { AiTransparencyModal } from './AiTransparencyModal';
import { cn } from '@/lib/utils';

interface QueueProps {
  readonly initialCandidates: readonly RecurringCandidate[];
}

interface EditingState {
  readonly id: string;
  readonly merchantName: string;
  readonly amountMyr: string;
  readonly category?: string;
  readonly cycle?: string;
}

interface ToastState {
  readonly id: string;
  readonly merchantName: string;
  readonly action: 'confirm' | 'reject';
}

type SortOption = 'confidence' | 'amount' | 'date';

const CATEGORIES = [
  'Entertainment',
  'Software',
  'Telecommunications',
  'Utilities',
  'Insurance',
  'Instalments',
  'Memberships',
  'Education',
  'Fitness',
  'Other',
] as const;

export function CandidateQueue({ initialCandidates }: QueueProps) {
  const t = useTranslations('Review');
  const [candidates, setCandidates] = useState<readonly RecurringCandidate[]>(initialCandidates);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('confidence');
  const [expandedCadenceId, setExpandedCadenceId] = useState<string | null>(null);
  const [modalCandidate, setModalCandidate] = useState<RecurringCandidate | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignedCategories, setAssignedCategories] = useState<Record<string, string>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pending = candidates.filter((c) => c.status.state === 'pending');
  const confirmed = candidates.filter((c) => c.status.state === 'confirmed');
  const rejected = candidates.filter((c) => c.status.state === 'rejected');

  const sortedPending = useMemo(() => {
    return [...pending].sort((a, b) => {
      if (sortBy === 'confidence') {
        return b.aiConfidence - a.aiConfidence;
      }
      if (sortBy === 'amount') {
        return b.amountSen - a.amountSen;
      }
      return b.detectedAt.localeCompare(a.detectedAt);
    });
  }, [pending, sortBy]);

  // Ensure selectedIndex stays valid when list changes
  useEffect(() => {
    if (selectedIndex >= sortedPending.length && sortedPending.length > 0) {
      setSelectedIndex(sortedPending.length - 1);
    }
  }, [sortedPending.length, selectedIndex]);

  // Auto-dismiss the undo toast after ~5s
  useEffect(() => {
    if (!toast) return;
    toastTimer.current = setTimeout(() => setToast(null), 5000);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toast]);

  async function decide(id: string, action: 'confirm' | 'reject') {
    const now = new Date().toISOString();
    const candidate = candidates.find((c) => c.id === id);
    const prevCandidates = [...candidates];

    setCandidates((prev) =>
      prev.map((c) =>
        c.id === id
          ? applyConfirmation(
              c,
              action === 'confirm'
                ? { action: 'confirm', confirmedAt: now }
                : { action: 'reject', rejectedAt: now },
            )
          : c,
      ),
    );
    setEditing((e) => (e?.id === id ? null : e));
    if (candidate) {
      setToast({ id, merchantName: candidate.merchantName, action });
    }

    try {
      await fetch(`/api/recurring-candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    } catch {
      // Soft rollback on network failure
      setCandidates(prevCandidates);
    }
  }

  function undo(): void {
    if (!toast) return;
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === toast.id ? { ...c, status: { state: 'pending' } } : c,
      ),
    );
    setToast(null);
  }

  function saveEdit(): void {
    if (!editing) return;
    const amountSen = editing.amountMyr === '' ? undefined : myrToSen(editing.amountMyr) ?? undefined;
    const parsed = candidateEditSchema.safeParse({
      merchantName: editing.merchantName,
      ...(amountSen !== undefined ? { amountSen } : {}),
    });
    if (!parsed.success) return;
    setCandidates((prev) =>
      prev.map((c) => (c.id === editing.id ? applyEdit(c, parsed.data) : c)),
    );
    setEditing(null);
  }

  // Keyboard navigation & triage listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }
      if (sortedPending.length === 0) return;

      const current = sortedPending[Math.min(selectedIndex, sortedPending.length - 1)];
      if (!current) return;

      if (e.key === 'y' || e.key === 'Y' || (e.key === 'Enter' && !editing)) {
        e.preventDefault();
        decide(current.id, 'confirm');
      } else if (e.key === 'n' || e.key === 'N' || e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        decide(current.id, 'reject');
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setEditing((prev) =>
          prev?.id === current.id
            ? null
            : {
                id: current.id,
                merchantName: current.merchantName,
                amountMyr: formatAmount(current.amountSen),
                category: assignedCategories[current.id] ?? 'Entertainment',
              },
        );
      } else if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, sortedPending.length - 1));
      } else if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'z' || e.key === 'Z' || e.key === 'u' || e.key === 'U') {
        if (toast) {
          e.preventDefault();
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sortedPending, selectedIndex, editing, toast, assignedCategories]);

  const hintColor: Record<string, string> = {
    likely_recurring: 'text-status-emerald-text',
    uncertain: 'text-status-blue-text',
    needs_review: 'text-status-amber-text',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Summary & Confirmation History */}
        <div className="lg:col-span-5 space-y-6">
          {/* Queue summary row */}
          <div className="bg-surface-1 border border-border-1 rounded-xl px-5 py-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-text-secondary">{t('pendingCount')}</span>
              <span className="font-mono text-sm font-medium text-text-primary border-l-2 border-accent pl-3">
                {pending.length}
              </span>
            </div>
          </div>

          {/* AI-confidence summary + transparency panel */}
          <ConfidencePanel candidates={pending} />

          {/* Confirmed subscriptions */}
          {confirmed.length > 0 && (
            <section aria-label={t('confirmedLabel')} className="space-y-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-text-faint">
                {t('confirmedHeading')} · {confirmed.length}
              </h2>
              <ul className="divide-y divide-border-1 border border-border-1 rounded-xl bg-surface-1">
                {confirmed.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-status-emerald-text shrink-0" />
                      <BrandLogo merchantName={c.merchantName} size={20} />
                      <span className="text-sm text-text-primary">{c.merchantName}</span>
                      <span className="font-mono text-xs uppercase tracking-wider text-status-emerald-text">
                        {t('stampConfirmed')}
                      </span>
                    </div>
                    <span className="font-mono text-sm text-text-primary">
                      MYR {formatAmount(c.amountSen)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Rejected */}
          {rejected.length > 0 && (
            <section aria-label={t('dismissedLabel')} className="space-y-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-text-faint">
                {t('dismissedHeading')} · {rejected.length}
              </h2>
              <ul className="divide-y divide-border-1 border border-border-1 rounded-xl bg-surface-1 opacity-60">
                {rejected.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <XCircle className="w-4 h-4 text-text-faint shrink-0" />
                      <BrandLogo merchantName={c.merchantName} size={20} />
                      <span className="text-sm text-text-muted line-through">{c.merchantName}</span>
                      <span className="font-mono text-xs uppercase tracking-wider text-text-faint">
                        {t('stampDismissed')}
                      </span>
                    </div>
                    <span className="font-mono text-sm text-text-faint">
                      MYR {formatAmount(c.amountSen)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Right Column: Actionable Pending Candidates */}
        <div className="lg:col-span-7 space-y-4">
          {/* Header toolbar with Keyboard Shortcuts Bar */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xs font-mono uppercase tracking-wider text-text-faint">
                {t('queueLabel')} · {pending.length}
              </h2>

              {pending.length > 1 && (
                <div className="relative inline-flex items-center">
                  <ArrowUpDown className="w-3.5 h-3.5 absolute left-3 text-text-faint pointer-events-none" />
                  <select
                    value={sortBy}
                    aria-label="Sort review candidates"
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-surface-1 border border-border-1 rounded-xl pl-8 pr-3 py-1.5 text-xs text-text-primary font-medium focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                  >
                    <option value="confidence">Highest Confidence</option>
                    <option value="amount">Highest Amount</option>
                    <option value="date">Most Recent</option>
                  </select>
                </div>
              )}
            </div>

            {/* Keyboard Shortcuts Hint Strip */}
            {pending.length > 0 && (
              <div className="hidden sm:flex items-center gap-3 px-3.5 py-2 rounded-xl border border-border-1 bg-surface-1 text-xs text-text-muted">
                <div className="flex items-center gap-1.5 text-text-secondary font-medium">
                  <Keyboard className="w-3.5 h-3.5 text-text-faint" />
                  <span>{t('shortcuts.title')}:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                  <span>
                    <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-border-2 text-text-primary">Y</kbd> {t('shortcuts.confirm')}
                  </span>
                  <span>
                    <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-border-2 text-text-primary">N</kbd> {t('shortcuts.reject')}
                  </span>
                  <span>
                    <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-border-2 text-text-primary">E</kbd> {t('shortcuts.edit')}
                  </span>
                  <span>
                    <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-border-2 text-text-primary">J / K</kbd> {t('shortcuts.navigate')}
                  </span>
                  {toast && (
                    <span>
                      <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-border-2 text-text-primary">Z</kbd> {t('shortcuts.undo')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Empty state */}
          {pending.length === 0 && (
            <div
              className="bg-surface-1 border border-border-1 rounded-xl p-12 flex flex-col items-center text-center"
              role="status"
              aria-live="polite"
            >
              <Inbox className="w-8 h-8 text-text-faint mb-3" />
              <p className="text-sm text-text-secondary font-medium">{t('emptyTitle')}</p>
              <p className="text-xs text-text-muted mt-1">{t('emptyDesc')}</p>
            </div>
          )}

          {/* Pending candidates list */}
          <ul className="space-y-4" aria-label={t('queueLabel')}>
            {sortedPending.map((c, index) => {
              const hint = deriveRecommendationHint(c);
              const isEditing = editing?.id === c.id;
              const isCadenceExpanded = expandedCadenceId === c.id;
              const isFocused = index === selectedIndex;
              const currentCategory = assignedCategories[c.id] ?? 'Entertainment';

              return (
                <li
                  key={c.id}
                  onClick={() => setSelectedIndex(index)}
                  className={cn(
                    'bg-surface-1 border rounded-xl p-4 sm:p-5 space-y-4 transition-all cursor-pointer',
                    isFocused
                      ? 'border-accent border-l-3 border-l-accent shadow-xs'
                      : 'border-border-1 hover:border-border-2',
                  )}
                >
                  {/* Header: merchant + amount + category tag */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <BrandLogo merchantName={c.merchantName} size={32} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-semibold text-text-primary truncate">
                            {c.merchantName}
                          </h3>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-border-2 bg-surface-2 text-text-muted">
                            <Tag className="w-2.5 h-2.5 text-text-faint" />
                            {currentCategory}
                          </span>
                        </div>

                        {/* Interactive Cadence Chip */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCadenceId(isCadenceExpanded ? null : c.id);
                          }}
                          className="text-xs text-text-muted hover:text-text-primary mt-0.5 font-mono inline-flex items-center gap-1 transition-colors"
                        >
                          <span>{formatCadenceEvidence(c.occurrenceCount, c.intervalDays)}</span>
                          {isCadenceExpanded ? (
                            <ChevronUp className="w-3 h-3 text-text-faint" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-text-faint" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm sm:text-base font-medium text-text-primary">
                        MYR {formatAmount(c.amountSen)}
                      </p>
                      <p className="text-xs text-text-faint font-mono">/ {t('perMonth')}</p>
                    </div>
                  </div>

                  {/* Expanded Cadence Breakdown (if opened) */}
                  {isCadenceExpanded && (
                    <div className="p-3 rounded-xl border border-border-2 bg-surface-2 space-y-1 text-xs text-text-secondary">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-text-faint">
                        Detected Cadence Details
                      </div>
                      <p className="text-xs leading-relaxed">
                        Observed across <span className="text-text-primary font-medium">{c.occurrenceCount} cycles</span> spaced approximately <span className="text-text-primary font-medium">{c.intervalDays} days</span> apart.
                      </p>
                    </div>
                  )}

                  {/* Ledger rows: confidence + detection date + AI Reasoning trigger */}
                  <div className="divide-y divide-border-1 border-t border-border-1 text-xs">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-text-secondary">{t('aiConfidence')}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-medium ${hintColor[hint]}`}>
                          AI · {c.aiConfidence.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalCandidate(c);
                            setModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-status-blue-text bg-status-blue-surface border border-status-blue-border hover:brightness-110 transition-colors"
                        >
                          <BrainCircuit className="w-3 h-3" />
                          <span>Why detected?</span>
                        </button>
                      </div>
                    </div>

                    {/* Advisory confidence mini-bar */}
                    <div className="flex items-center gap-3 py-2">
                      <span className="w-20 sm:w-24 shrink-0 text-text-secondary">
                        {t('confidenceBarLabel')}
                      </span>
                      <span
                        className="h-1.5 flex-1 rounded-full bg-surface-3 overflow-hidden"
                        role="img"
                        aria-label={t('confidenceBarAria', {
                          pct: Math.round(c.aiConfidence * 100),
                        })}
                      >
                        <span
                          className="block h-full rounded-full bg-text-secondary"
                          style={{ width: `${Math.round(c.aiConfidence * 100)}%` }}
                        />
                      </span>
                      <span className="w-10 shrink-0 text-right font-mono text-text-primary">
                        {Math.round(c.aiConfidence * 100)}%
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between py-2">
                      <span className="text-text-secondary">{t('detectedOn')}</span>
                      <span className="font-mono text-text-primary">
                        {c.detectedAt.slice(0, 10)}
                      </span>
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {isEditing && editing && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-xl border border-border-2 bg-surface-2 p-3 sm:p-4 space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label
                            htmlFor={`edit-name-${c.id}`}
                            className="block text-xs font-medium text-text-muted mb-1"
                          >
                            {t('editMerchant')}
                          </label>
                          <input
                            id={`edit-name-${c.id}`}
                            type="text"
                            value={editing.merchantName}
                            onChange={(e) =>
                              setEditing({ ...editing, merchantName: e.target.value })
                            }
                            className="w-full bg-surface-0 border border-border-2 rounded-lg px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`edit-amount-${c.id}`}
                            className="block text-xs font-medium text-text-muted mb-1"
                          >
                            {t('editAmount')}
                          </label>
                          <input
                            id={`edit-amount-${c.id}`}
                            type="text"
                            inputMode="decimal"
                            value={editing.amountMyr}
                            onChange={(e) =>
                              setEditing({ ...editing, amountMyr: e.target.value })
                            }
                            className="w-full bg-surface-0 border border-border-2 rounded-lg px-3 py-1.5 text-sm font-mono text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`edit-category-${c.id}`}
                            className="block text-xs font-medium text-text-muted mb-1"
                          >
                            Category
                          </label>
                          <select
                            id={`edit-category-${c.id}`}
                            value={editing.category ?? currentCategory}
                            onChange={(e) => {
                              const cat = e.target.value;
                              setEditing({ ...editing, category: cat });
                              setAssignedCategories((prev) => ({ ...prev, [c.id]: cat }));
                            }}
                            className="w-full bg-surface-0 border border-border-2 rounded-lg px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="px-3 py-1.5 rounded-lg border border-border-3 bg-surface-3 text-xs font-medium text-text-primary hover:bg-surface-2 transition-colors"
                        >
                          {t('saveEdit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="px-3 py-1.5 rounded-lg border border-border-2 bg-surface-2 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
                        >
                          {t('cancelEdit')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions: Equal-weight Confirm / Reject + Edit */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          decide(c.id, 'confirm');
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-status-emerald-border bg-status-emerald-surface text-status-emerald-text text-xs font-semibold hover:brightness-110 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{t('confirm')}</span>
                        {isFocused && (
                          <kbd className="hidden sm:inline-block ml-1 px-1 py-0.2 rounded text-[10px] bg-status-emerald-surface border border-status-emerald-border opacity-80">
                            Y
                          </kbd>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          decide(c.id, 'reject');
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-status-rose-border bg-status-rose-surface text-status-rose-text text-xs font-semibold hover:brightness-110 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{t('reject')}</span>
                        {isFocused && (
                          <kbd className="hidden sm:inline-block ml-1 px-1 py-0.2 rounded text-[10px] bg-status-rose-surface border border-status-rose-border opacity-80">
                            N
                          </kbd>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(
                            isEditing
                              ? null
                              : {
                                  id: c.id,
                                  merchantName: c.merchantName,
                                  amountMyr: formatAmount(c.amountSen),
                                  category: currentCategory,
                                },
                          );
                        }}
                        aria-pressed={isEditing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-border-2 bg-surface-2 text-text-muted text-xs font-medium hover:text-text-primary hover:bg-surface-3 transition-colors"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>{t('editBeforeConfirm')}</span>
                      </button>
                    </div>

                    {/* Privacy Redaction Status Badge */}
                    <span className="inline-flex items-center gap-1 text-[11px] text-text-faint">
                      <ShieldCheck className="w-3.5 h-3.5 text-text-faint shrink-0" />
                      <span>{t('redactionNotice')}</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* AI Transparency Dialog Modal */}
      <AiTransparencyModal
        open={modalOpen}
        candidate={modalCandidate}
        onClose={() => {
          setModalOpen(false);
          setModalCandidate(null);
        }}
      />

      {/* Undo toast — transient, aria-live, keyboard accessible */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md"
        >
          <div className="flex items-center justify-between gap-4 bg-surface-3 border border-border-2 rounded-xl px-4 py-3 shadow-lg">
            <span className="text-sm text-text-secondary min-w-0 truncate">
              {toast.action === 'confirm'
                ? t('toastConfirmed', { merchant: toast.merchantName })
                : t('toastRejected', { merchant: toast.merchantName })}
            </span>
            <button
              type="button"
              onClick={undo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-3 bg-surface-2 text-xs font-medium text-text-primary hover:bg-surface-1 shrink-0 transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('undo')}</span>
              <kbd className="hidden sm:inline-block ml-1 px-1 py-0.2 rounded text-[10px] bg-surface-3 border border-border-3 text-text-faint">
                Z
              </kbd>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
