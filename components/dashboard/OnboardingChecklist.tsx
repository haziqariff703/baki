'use client';

/**
 * First-Time User Onboarding Checklist (Dashboard).
 *
 * Helps Malaysian students and young professionals quickly discover and master
 * the core tools of Baki (5-question calculator, payday anchor, savings simulator, statement import).
 * Persists completion and dismissal in localStorage (hydration-safe).
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  X,
  Sparkles,
  ListTodo,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const STORAGE_STEPS_KEY = 'baki-onboarding-completed-steps';
const STORAGE_DISMISSED_KEY = 'baki-onboarding-dismissed';

interface OnboardingStep {
  readonly id: string;
  readonly titleKey: string;
  readonly descKey: string;
  readonly href: string;
}

const STEPS: readonly OnboardingStep[] = [
  {
    id: 'step1',
    titleKey: 'onboarding.step1Title',
    descKey: 'onboarding.step1Desc',
    href: '/subscriptions',
  },
  {
    id: 'step2',
    titleKey: 'onboarding.step2Title',
    descKey: 'onboarding.step2Desc',
    href: '/cash-flow',
  },
  {
    id: 'step3',
    titleKey: 'onboarding.step3Title',
    descKey: 'onboarding.step3Desc',
    href: '/cash-flow',
  },
  {
    id: 'step4',
    titleKey: 'onboarding.step4Title',
    descKey: 'onboarding.step4Desc',
    href: '/imports',
  },
];

export function OnboardingChecklist() {
  const t = useTranslations('Dashboard');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set(['step1']));
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const isDismissed = localStorage.getItem(STORAGE_DISMISSED_KEY) === 'true';
      setDismissed(isDismissed);

      const saved = localStorage.getItem(STORAGE_STEPS_KEY);
      if (saved) {
        setCompletedSteps(new Set(JSON.parse(saved)));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleStep = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem(STORAGE_STEPS_KEY, JSON.stringify([...next]));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_DISMISSED_KEY, 'true');
    } catch {
      // Ignore
    }
  };

  if (!isClient || dismissed) {
    return null;
  }

  const completedCount = completedSteps.size;
  const totalCount = STEPS.length;
  const isAllComplete = completedCount === totalCount;

  return (
    <section
      aria-labelledby="onboarding-heading"
      className="bg-surface-1 border border-border-2 rounded-xl p-5 sm:p-6 space-y-4 shadow-xs"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-3 border-b border-border-1 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-accent" aria-hidden="true" />
            <h2
              id="onboarding-heading"
              className="text-sm font-semibold text-text-primary"
            >
              {t('onboarding.title')}
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-surface-2 border border-border-2 text-text-secondary">
              {t('onboarding.progress', { completed: completedCount, total: totalCount })}
            </span>
          </div>
          <p className="text-xs text-text-muted">{t('onboarding.subtitle')}</p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs text-text-faint hover:text-text-primary transition-colors flex items-center gap-1"
          aria-label={t('onboarding.dismiss')}
        >
          <X className="w-3.5 h-3.5" />
          <span>{t('onboarding.dismiss')}</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div
        className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={completedCount}
        aria-valuemin={0}
        aria-valuemax={totalCount}
      >
        <div
          className="h-full bg-accent transition-all duration-300 rounded-full"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Step Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {STEPS.map((step) => {
          const isDone = completedSteps.has(step.id);
          return (
            <Link
              key={step.id}
              href={step.href}
              className={cn(
                'p-3.5 rounded-xl border transition-all flex items-start gap-3 group',
                isDone
                  ? 'bg-surface-2/30 border-border-1 text-text-muted'
                  : 'bg-surface-2/70 border-border-2 hover:border-accent hover:bg-surface-2 text-text-secondary',
              )}
            >
              <button
                type="button"
                onClick={(e) => toggleStep(step.id, e)}
                className="mt-0.5 shrink-0 text-text-faint hover:text-accent transition-colors focus-visible:outline-none"
                aria-label={`Toggle ${t(step.titleKey)}`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-status-emerald-text" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </button>

              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      'text-xs font-medium block truncate',
                      isDone ? 'line-through text-text-muted' : 'text-text-primary group-hover:text-accent',
                    )}
                  >
                    {t(step.titleKey)}
                  </span>
                  <ArrowRight className="w-3 h-3 text-text-faint group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
                <p className="text-[11px] text-text-faint leading-relaxed line-clamp-2">
                  {t(step.descKey)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {isAllComplete && (
        <div className="p-3 rounded-xl bg-status-emerald-surface border border-status-emerald-border text-xs text-status-emerald-text flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{t('onboarding.completedNote')}</span>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="font-medium underline hover:brightness-110"
          >
            {t('onboarding.dismiss')}
          </button>
        </div>
      )}
    </section>
  );
}
