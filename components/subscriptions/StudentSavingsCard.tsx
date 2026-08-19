'use client';

/**
 * Student Savings Optimizer Card (Subscriptions / Dashboard).
 *
 * Automatically flags active subscriptions that qualify for official Malaysian
 * university student discount plans (Spotify, Apple Music, YouTube Premium,
 * Canva for Education, Notion, Adobe CC).
 *
 * DESIGN.md tokens: Ledger-rule list, mono currency, AA contrast, zero emojis.
 */

import { useTranslations } from 'next-intl';
import { GraduationCap, ExternalLink, ShieldCheck } from 'lucide-react';
import type { StudentSavingsSummary } from '@/features/student-optimizer';
import { MerchantLogo } from '@/components/shared/MerchantLogo';
import { senToMyr } from '@/lib/money';

interface StudentSavingsCardProps {
  readonly summary: StudentSavingsSummary;
}

export function StudentSavingsCard({ summary }: StudentSavingsCardProps) {
  const t = useTranslations('Subscriptions.studentSavings');

  if (summary.count === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="student-savings-heading"
      className="bg-surface-1 border border-border-2 rounded-xl p-5 sm:p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-3 border-b border-border-1 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-accent" aria-hidden="true" />
            <h2
              id="student-savings-heading"
              className="text-sm font-semibold text-text-primary"
            >
              {t('title')}
            </h2>
            <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-accent-subtle text-accent border border-accent-border">
              {t('annualSavingsBadge', { amount: senToMyr(summary.totalAnnualSavingsSen) })}
            </span>
          </div>
          <p className="text-xs text-text-muted">{t('subtitle')}</p>
        </div>
      </div>

      {/* Savings Opportunities Grid */}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {summary.opportunities.map((opp) => (
          <li
            key={opp.subscriptionId}
            className="p-4 rounded-xl border border-border-2 bg-surface-2/60 flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              {/* Top row: Logo + Merchant + Savings pill */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <MerchantLogo
                    name={opp.merchantName}
                    domain={opp.domain}
                    size={28}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-text-primary block truncate">
                      {opp.merchantName}
                    </span>
                    <span className="text-[11px] text-text-muted block truncate">
                      {opp.planName}
                    </span>
                  </div>
                </div>

                <span className="font-mono text-xs font-medium px-2 py-0.5 rounded-md bg-status-emerald-surface text-status-emerald-text border border-status-emerald-border shrink-0">
                  {t('monthlySavingsBadge', { amount: senToMyr(opp.monthlySavingsSen) })}
                </span>
              </div>

              {/* Price comparison */}
              <div className="flex items-baseline justify-between text-xs pt-1 border-t border-border-1 font-mono">
                <span className="text-text-faint">
                  {t('currentPrice')}: <span className="line-through text-text-muted">MYR {senToMyr(opp.currentMonthlySen)}</span>
                </span>
                <span className="text-status-emerald-text font-medium">
                  {t('studentPrice')}: MYR {senToMyr(opp.studentMonthlySen)}
                </span>
              </div>

              {/* Requirement */}
              <div className="flex items-center gap-1.5 text-[11px] text-text-faint bg-surface-3/50 px-2.5 py-1.5 rounded-lg border border-border-1">
                <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
                <span className="truncate">{opp.requirement}</span>
              </div>
            </div>

            {/* Action link */}
            <div className="pt-1">
              <a
                href={opp.dealUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border-3 bg-surface-3 hover:bg-surface-2 text-text-primary text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <span>{t('applyCta')}</span>
                <ExternalLink className="w-3 h-3 text-text-faint" aria-hidden="true" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
