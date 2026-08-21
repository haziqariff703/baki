'use client';

import { useTranslations } from 'next-intl';
import {
  BrainCircuit,
  Calendar,
  DollarSign,
  Repeat,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type { RecurringCandidate } from '@/features/recurring-detection';
import { formatAmount } from '@/features/recurring-detection';

interface AiTransparencyModalProps {
  readonly open: boolean;
  readonly candidate?: RecurringCandidate | null;
  readonly onClose: () => void;
}

export function AiTransparencyModal({
  open,
  candidate,
  onClose,
}: AiTransparencyModalProps) {
  const t = useTranslations('Review');

  if (!open) return null;

  const candidatePct = candidate ? Math.round(candidate.aiConfidence * 100) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-transparency-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-surface-1 border border-border-2 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1.5 pr-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-status-blue-surface border border-status-blue-border text-status-blue-text text-xs font-medium">
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>How Baki Works</span>
          </div>
          <h2 id="ai-transparency-title" className="text-lg font-semibold text-text-primary">
            How We Spot Your Subscriptions
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">
            Here is a simple look at how Baki detects recurring bills from your statements.
          </p>
        </div>

        {/* Specific Candidate Breakdown (if triggered for one) */}
        {candidate && (
          <div className="rounded-xl border border-border-2 bg-surface-2 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-text-faint">
                Detection Clues
              </span>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-3 border border-border-1 text-text-primary">
                {candidatePct}% Match
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-text-primary">{candidate.merchantName}</h3>
              <span className="font-mono text-sm text-text-primary">
                MYR {formatAmount(candidate.amountSen)} / month
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary pt-1 border-t border-border-1 font-mono">
              <div>Seen: <span className="text-text-primary">{candidate.occurrenceCount} times</span></div>
              <div>Timing: <span className="text-text-primary">Every ~{candidate.intervalDays} days</span></div>
            </div>
          </div>
        )}

        {/* 4 Simple Clues */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-text-faint">
            The 4 Clues We Look For
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Clue 1: Regular Dates */}
            <div className="p-3.5 rounded-xl border border-border-1 bg-surface-0 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-text-primary">
                <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>1. Regular Dates (35%)</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Does this charge happen around the same date every month (e.g. every ~30 days)?
              </p>
            </div>

            {/* Clue 2: Same Exact Price */}
            <div className="p-3.5 rounded-xl border border-border-1 bg-surface-0 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-text-primary">
                <DollarSign className="w-3.5 h-3.5 text-status-emerald-text shrink-0" />
                <span>2. Same Exact Price (25%)</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Is the payment the exact same ringgit amount every single time?
              </p>
            </div>

            {/* Clue 3: Repeated Charges */}
            <div className="p-3.5 rounded-xl border border-border-1 bg-surface-0 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-text-primary">
                <Repeat className="w-3.5 h-3.5 text-status-blue-text shrink-0" />
                <span>3. Repeated History (20%)</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Has this charge appeared 2, 3, or more consecutive months in your statements?
              </p>
            </div>

            {/* Clue 4: Known Brand */}
            <div className="p-3.5 rounded-xl border border-border-1 bg-surface-0 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-text-primary">
                <Sparkles className="w-3.5 h-3.5 text-status-amber-text shrink-0" />
                <span>4. Known Brand (20%)</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Does the name match a popular subscription like Spotify, Netflix, or Unifi?
              </p>
            </div>
          </div>
        </div>

        {/* Human-in-the-loop & Safety Guarantee */}
        <div className="p-4 rounded-xl border border-border-2 bg-surface-2 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-text-primary">
            <ShieldCheck className="w-4 h-4 text-status-emerald-text shrink-0" />
            <span>You Are Always in Control</span>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            These percentages are only helpful suggestions. Baki will <strong>never</strong> add, charge, or cancel anything without you clicking <strong>Confirm</strong>.
          </p>
        </div>

        {/* Dismiss Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-3 border border-border-3 text-text-primary text-xs font-medium hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
