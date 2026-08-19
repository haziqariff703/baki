'use client';

/**
 * Slide-over subscription create/edit form.
 *
 * Deterministic score preview runs `computeScoreResult` live on the current
 * ratings (pure client-side engine, §2.1) — the same engine the ledger uses.
 * Submission validates through `subscriptionSchema` (§7) before committing;
 * money is parsed to integer sen via `myrToSen` (§8.1), never floats.
 *
 * State model: the outer component handles open/close, Escape, and focus
 * return; the inner `FormPanel` is remounted by the parent (via `key`) on
 * every open, so its `useState` initializers seed the form cleanly with no
 * setState-in-effect.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  CheckCircle2,
  Eye,
  PauseCircle,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { computeScoreResult, type CriterionId, type Recommendation } from '@/features/scoring';
import { subscriptionSchema, type SubscriptionSchema } from '@/lib/validation';
import { billingCycleSchema, type BillingCycleSchema } from '@/lib/validation/cashflow';
import { myrToSen, senToMyr } from '@/lib/money';
import { toDatePart } from '@/lib/dates';
import { searchBrands, type BrandSuggestion } from '@/features/subscriptions';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface SubscriptionFormProps {
  readonly open: boolean;
  /** When provided the form edits this record; otherwise it creates a new one. */
  readonly initial?: SubscriptionSchema | null;
  /** Increments per open so the inner panel remounts and resets state. */
  readonly session?: number;
  readonly onSave: (subscription: SubscriptionSchema) => void;
  readonly onClose: () => void;
}

interface FieldErrors {
  merchantName?: string;
  amount?: string;
  nextChargeDate?: string;
}

/** Icon + colour per recommendation — never colour alone (§16). */
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

const CRITERIA: readonly CriterionId[] = [
  'usage',
  'necessity',
  'affordability',
  'uniqueness',
  'satisfaction',
];

const CYCLES = billingCycleSchema.options;

const POPULAR_BRANDS = [
  { name: 'Spotify', defaultAmount: '15.90' },
  { name: 'Netflix', defaultAmount: '45.00' },
  { name: 'YouTube Premium', defaultAmount: '17.90' },
  { name: 'iCloud+', defaultAmount: '3.90' },
  { name: 'ChatGPT Plus', defaultAmount: '99.00' },
  { name: 'CelcomDigi', defaultAmount: '60.00' },
  { name: 'Maxis', defaultAmount: '98.00' },
  { name: 'Unifi', defaultAmount: '89.00' },
  { name: 'Canva Pro', defaultAmount: '49.90' },
  { name: 'Anytime Fitness', defaultAmount: '159.00' },
  { name: 'Apple Music', defaultAmount: '16.90' },
  { name: 'Disney+ Hotstar', defaultAmount: '24.90' },
] as const;

/* -------------------------------------------------------------------------- */
/*  Criterion segmented control                                                */
/* -------------------------------------------------------------------------- */

function CriterionControl({
  label,
  value,
  onChange,
  name,
}: {
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly name: string;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-medium text-text-muted">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className={cn(
              'flex-1 cursor-pointer rounded-xl border py-2 text-center text-xs font-mono font-medium transition-colors',
              'focus-within:ring-1 focus-within:ring-accent',
              value === n
                ? 'border-border-3 bg-surface-3 text-text-primary'
                : 'border-border-2 bg-surface-2 text-text-muted hover:border-border-3 hover:text-text-secondary',
            )}
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            {n}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* -------------------------------------------------------------------------- */
/*  Inner panel — remounted per open so useState initializers seed the form    */
/* -------------------------------------------------------------------------- */

function FormPanel({
  initial,
  onSave,
  onClose,
}: {
  readonly initial: SubscriptionSchema | null;
  readonly onSave: (s: SubscriptionSchema) => void;
  readonly onClose: () => void;
}) {
  const t = useTranslations('Subscriptions');
  const tDash = useTranslations('Dashboard');
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const editing = initial;

  // useState initializers run once per mount — the parent remounts this panel
  // (via key) on every open, so no reset effect is needed.
  const [merchantName, setMerchantName] = useState(editing?.merchantName ?? '');
  const [amountMyr, setAmountMyr] = useState(editing ? senToMyr(editing.amountSen) : '');
  const [cycle, setCycle] = useState<BillingCycleSchema>(editing?.cycle ?? 'monthly');
  const [nextChargeDate, setNextChargeDate] = useState(
    editing ? toDatePart(editing.nextChargeDate) : '',
  );
  const [usage, setUsage] = useState(editing?.usage ?? 3);
  const [necessity, setNecessity] = useState(editing?.necessity ?? 3);
  const [affordability, setAffordability] = useState(editing?.affordability ?? 3);
  const [uniqueness, setUniqueness] = useState(editing?.uniqueness ?? 3);
  const [satisfaction, setSatisfaction] = useState(editing?.satisfaction ?? 3);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Live brand suggestions as the user types the merchant name.
  const suggestions = useMemo<readonly BrandSuggestion[]>(
    () => searchBrands(merchantName),
    [merchantName],
  );

  // Focus the first field once the panel mounts.
  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  // Live deterministic score preview — the same engine the ledger renders.
  const preview = useMemo(
    () => computeScoreResult({ usage, necessity, affordability, uniqueness, satisfaction }),
    [usage, necessity, affordability, uniqueness, satisfaction],
  );
  const previewStyle = RECOMMENDATION_STYLE[preview.recommendation.type];
  const PreviewIcon = previewStyle.Icon;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: FieldErrors = {};

    const trimmedName = merchantName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 120) {
      nextErrors.merchantName = t('errorMerchant');
    }

    const amountSen = myrToSen(amountMyr);
    if (amountSen === null || amountSen <= 0) {
      nextErrors.amount = t('errorAmount');
    }

    const isoDate = nextChargeDate ? `${nextChargeDate}T00:00:00.000Z` : '';
    if (!nextChargeDate || Number.isNaN(Date.parse(isoDate))) {
      nextErrors.nextChargeDate = t('errorDate');
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const candidate = {
      id: editing?.id ?? `s-${crypto.randomUUID()}`,
      merchantName: trimmedName,
      amountSen: amountSen as number,
      cycle,
      nextChargeDate: isoDate,
      usage,
      necessity,
      affordability,
      uniqueness,
      satisfaction,
    };

    // Trust boundary: runtime-validate before committing (AGENTS.md §7).
    const parsed = subscriptionSchema.safeParse(candidate);
    if (!parsed.success) return;

    onSave(parsed.data);
    onClose();
  }

  const setters: Record<CriterionId, (v: number) => void> = {
    usage: setUsage,
    necessity: setNecessity,
    affordability: setAffordability,
    uniqueness: setUniqueness,
    satisfaction: setSatisfaction,
  };
  const values: Record<CriterionId, number> = {
    usage,
    necessity,
    affordability,
    uniqueness,
    satisfaction,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-form-title"
      className="absolute inset-y-0 right-0 w-full sm:max-w-md bg-surface-1 border-l border-border-1 shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border-1">
        <h2 id="subscription-form-title" className="text-base font-semibold text-text-primary">
          {editing ? t('formEditTitle') : t('formCreateTitle')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('formClose')}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Body */}
      <form id="subscription-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Merchant */}
        <div className="space-y-1.5">
          <label htmlFor="sub-merchant" className="text-xs font-medium text-text-muted block">
            {t('formMerchant')}
          </label>
          <div className="relative">
            {merchantName.trim() && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10">
                <BrandLogo merchantName={merchantName} size={20} />
              </div>
            )}
            <input
              ref={firstFieldRef}
              id="sub-merchant"
              type="text"
              value={merchantName}
              onChange={(e) => { setMerchantName(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setShowSuggestions(false)}
              placeholder={t('formMerchantPlaceholder')}
              maxLength={120}
              role="combobox"
              aria-autocomplete="list"
              aria-invalid={errors.merchantName !== undefined}
              aria-describedby={errors.merchantName ? 'sub-merchant-error' : undefined}
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-controls="sub-merchant-suggestions"
              className={cn(
                'w-full bg-surface-2 text-text-primary text-sm rounded-xl py-2 border transition-colors placeholder:text-text-faint focus:outline-none focus:ring-1',
                merchantName.trim() ? 'pl-9 pr-3' : 'px-3',
                errors.merchantName
                  ? 'border-status-rose-border focus:border-status-rose-border focus:ring-status-rose-border'
                  : 'border-border-2 focus:border-accent focus:ring-accent',
              )}
            />
            {/* Brand autocomplete — deterministic logo preview as you type */}
            {showSuggestions && suggestions.length > 0 && (
              <ul
                id="sub-merchant-suggestions"
                role="listbox"
                aria-label={t('brandSuggestionsLabel')}
                className="absolute z-20 mt-1 w-full bg-surface-1 border border-border-2 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-border-1"
              >
                {suggestions.map((s) => (
                  <li key={s.slug} role="option" aria-selected="false">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        // onMouseDown fires before input blur, so the click registers.
                        e.preventDefault();
                        setMerchantName(s.name);
                        setShowSuggestions(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent transition-colors"
                    >
                      <BrandLogo merchantName={s.name} size={22} />
                      <span className="font-medium truncate">{s.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {errors.merchantName && (
            <p id="sub-merchant-error" role="alert" className="text-xs text-status-rose-text">
              {errors.merchantName}
            </p>
          )}

          {/* Quick Popular Brand Registry Selector */}
          {!editing && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-text-faint block">
                Popular Services
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {POPULAR_BRANDS.map((brand) => {
                  const isSelected = merchantName.toLowerCase() === brand.name.toLowerCase();
                  return (
                    <button
                      key={brand.name}
                      type="button"
                      onClick={() => {
                        setMerchantName(brand.name);
                        if (!amountMyr) setAmountMyr(brand.defaultAmount);
                        setShowSuggestions(false);
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer',
                        isSelected
                          ? 'border-accent bg-accent/15 text-text-primary font-semibold'
                          : 'border-border-2 bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-text-primary',
                      )}
                    >
                      <BrandLogo merchantName={brand.name} size={14} />
                      <span>{brand.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Amount + cycle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="sub-amount" className="text-xs font-medium text-text-muted block">
              {t('formAmount')}
            </label>
            <input
              id="sub-amount"
              type="text"
              inputMode="decimal"
              value={amountMyr}
              onChange={(e) => setAmountMyr(e.target.value)}
              placeholder={t('formAmountPlaceholder')}
              aria-invalid={errors.amount !== undefined}
              aria-describedby={errors.amount ? 'sub-amount-error' : undefined}
              className={cn(
                'w-full bg-surface-2 text-text-primary text-sm rounded-xl px-3 py-2 border transition-colors placeholder:text-text-faint focus:outline-none focus:ring-1',
                errors.amount
                  ? 'border-status-rose-border focus:border-status-rose-border focus:ring-status-rose-border'
                  : 'border-border-2 focus:border-accent focus:ring-accent',
              )}
            />
            {errors.amount && (
              <p id="sub-amount-error" role="alert" className="text-xs text-status-rose-text">
                {errors.amount}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sub-cycle" className="text-xs font-medium text-text-muted block">
              {t('formCycle')}
            </label>
            <select
              id="sub-cycle"
              value={cycle}
              onChange={(e) => setCycle(e.target.value as BillingCycleSchema)}
              className="w-full bg-surface-2 text-text-primary text-sm rounded-xl px-3 py-2 border border-border-2 transition-colors focus:outline-none focus:ring-1 focus:border-accent focus:ring-accent"
            >
              {CYCLES.map((c) => (
                <option key={c} value={c}>
                  {tDash(`cycle.${c}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Next charge date */}
        <div className="space-y-1.5">
          <label htmlFor="sub-date" className="text-xs font-medium text-text-muted block">
            {t('formNextCharge')}
          </label>
          <input
            id="sub-date"
            type="date"
            value={nextChargeDate}
            onChange={(e) => setNextChargeDate(e.target.value)}
            aria-invalid={errors.nextChargeDate !== undefined}
            aria-describedby={errors.nextChargeDate ? 'sub-date-error' : undefined}
            className={cn(
              'w-full bg-surface-2 text-text-primary text-sm rounded-xl px-3 py-2 border transition-colors focus:outline-none focus:ring-1 [color-scheme:dark]',
              errors.nextChargeDate
                ? 'border-status-rose-border focus:border-status-rose-border focus:ring-status-rose-border'
                : 'border-border-2 focus:border-accent focus:ring-accent',
            )}
          />
          {errors.nextChargeDate && (
            <p id="sub-date-error" role="alert" className="text-xs text-status-rose-text">
              {errors.nextChargeDate}
            </p>
          )}
        </div>

        {/* Ratings */}
        <div className="space-y-3 border-t border-border-1 pt-4">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-text-faint">
              {t('formRatingsHeading')}
            </h3>
            <p className="text-xs text-text-faint mt-0.5">{t('formRatingsSub')}</p>
          </div>
          {CRITERIA.map((id) => (
            <CriterionControl
              key={id}
              name={`sub-${id}`}
              label={t(id)}
              value={values[id]}
              onChange={setters[id]}
            />
          ))}
        </div>

        {/* Live score preview */}
        <div
          className="bg-surface-2 border border-border-1 rounded-xl p-4 flex items-center justify-between gap-4"
          aria-live="polite"
        >
          <div>
            <p className="text-xs text-text-muted font-medium">{t('previewLabel')}</p>
            <p className="font-mono text-2xl font-medium text-text-primary mt-0.5">
              {preview.score}
              <span className="text-sm font-normal text-text-faint">/100</span>
            </p>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium',
              previewStyle.className,
            )}
          >
            <PreviewIcon className="w-3.5 h-3.5" aria-hidden="true" />
            {tDash(`recommendation.${preview.recommendation.type}`)}
          </span>
        </div>
      </form>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border-1">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-medium text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          {t('formCancel')}
        </button>
        <button
          type="submit"
          form="subscription-form"
          className="px-4 py-2 rounded-xl border border-border-3 bg-surface-3 text-text-primary text-sm font-medium hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          {t('formSave')}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Outer wrapper — open/close, Escape, focus return, backdrop                 */
/* -------------------------------------------------------------------------- */

export function SubscriptionForm({ open, initial, session = 0, onSave, onClose }: SubscriptionFormProps) {
  const lastTriggerRef = useRef<Element | null>(null);
  const editing = initial ?? null;

  // Capture the invoking element on open; return focus to it on close.
  useEffect(() => {
    if (open) {
      lastTriggerRef.current = document.activeElement;
      return;
    }
    const el = lastTriggerRef.current;
    if (el instanceof HTMLElement) el.focus();
  }, [open]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <FormPanel key={session} initial={editing} onSave={onSave} onClose={onClose} />
    </div>
  );
}
