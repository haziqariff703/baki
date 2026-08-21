'use client';

/**
 * Malaysian Student Starter Pack Catalog.
 *
 * Provides a 1-tap quick-add grid for popular student subscriptions.
 * Solves onboarding cognitive load & eliminates tedious manual form entry.
 *
 * Implements UI-UX Pro Max rules:
 * - Responsive flex-wrap / grid layout (no clipped chips or horizontal overflow)
 * - Accessible keyboard navigation & clear visible focus rings
 * - WCAG AA contrast on dark OLED surfaces
 * - Pure integer-sen price rendering in font-mono
 */

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Check, Sparkles, GraduationCap, ShieldCheck } from 'lucide-react';
import { STUDENT_PRESETS, type StudentPreset } from '@/features/student-optimizer';
import { senToMyr } from '@/lib/money';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';
import { Pagination } from '@/components/shared/Pagination';

interface StudentStarterCatalogProps {
  readonly onSelectPreset: (preset: StudentPreset) => void;
  readonly existingMerchantNames?: readonly string[];
}

export function StudentStarterCatalog({
  onSelectPreset,
  existingMerchantNames = [],
}: StudentStarterCatalogProps) {
  const t = useTranslations('Subscriptions');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 4;

  function handleAdd(preset: StudentPreset) {
    setAddedIds((prev) => new Set(prev).add(preset.id));
    onSelectPreset(preset);
  }

  const normalizedExisting = new Set(
    existingMerchantNames.map((n) => n.toLowerCase().trim()),
  );

  const start = (currentPage - 1) * PAGE_SIZE;
  const paginatedPresets = STUDENT_PRESETS.slice(start, start + PAGE_SIZE);

  return (
    <section
      aria-labelledby="student-starter-catalog-title"
      className="rounded-xl border border-border-1 bg-surface-1 p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-accent/10 text-accent border border-accent/20 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" aria-hidden="true" />
            </span>
            <h3
              id="student-starter-catalog-title"
              className="text-base font-semibold text-text-primary"
            >
              {t('starterPack.title')}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider bg-accent-subtle text-accent border border-accent-border">
              {t('starterPack.tag')}
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            {t('starterPack.subtitle')}
          </p>
        </div>
      </div>

      {/* Responsive Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {paginatedPresets.map((preset) => {
          const isAlreadyAdded =
            addedIds.has(preset.id) ||
            normalizedExisting.has(preset.name.toLowerCase());

          return (
            <div
              key={preset.id}
              className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 transition-colors ${
                isAlreadyAdded
                  ? 'border-status-emerald-border/60 bg-status-emerald-surface/20'
                  : 'border-border-1 bg-surface-2/70 hover:border-border-2 hover:bg-surface-2'
              }`}
            >
              <div className="space-y-2">
                {/* Header: Logo + Name + Discount Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <BrandLogo merchantName={preset.name} size={28} />
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-text-primary block truncate">
                        {preset.name}
                      </span>
                      <span className="text-[11px] text-text-faint block truncate">
                        {preset.category}
                      </span>
                    </div>
                  </div>

                  <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 shrink-0">
                    {preset.tag}
                  </span>
                </div>

                {/* Price Display */}
                <div className="pt-1 flex items-baseline justify-between border-t border-border-1/60">
                  <span className="text-[11px] text-text-faint">{t('starterPack.studentRate')}</span>
                  <span className="font-mono text-sm font-medium text-text-primary">
                    MYR {senToMyr(preset.studentPriceSen)}
                    <span className="text-[10px] text-text-muted font-sans">/mo</span>
                  </span>
                </div>

                {/* Micro perk description */}
                <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                  {preset.perkDescription}
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => handleAdd(preset)}
                disabled={isAlreadyAdded}
                className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                  isAlreadyAdded
                    ? 'bg-status-emerald-surface text-status-emerald-text border-status-emerald-border cursor-default'
                    : 'bg-surface-3 hover:bg-surface-2 text-text-primary border border-border-2 hover:border-border-3 active:scale-[0.98]'
                }`}
                aria-label={
                  isAlreadyAdded
                    ? `${preset.name} ${t('starterPack.added')}`
                    : `${t('starterPack.quickAdd')} ${preset.name}`
                }
              >
                {isAlreadyAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-status-emerald-text" aria-hidden="true" />
                    <span>{t('starterPack.added')}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                    <span>{t('starterPack.quickAdd')}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      <Pagination
        currentPage={currentPage}
        totalItems={STUDENT_PRESETS.length}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />
    </section>
  );
}
