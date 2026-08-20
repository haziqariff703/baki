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

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { GraduationCap, ExternalLink, ShieldCheck, Building2 } from 'lucide-react';
import type { StudentSavingsSummary } from '@/features/student-optimizer';
import { senToMyr } from '@/lib/money';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';
import { resolveUniversityDomain } from '@/features/settings/domainExtractor';
import type { UserProfile } from '@/lib/validation/profile';

interface StudentSavingsCardProps {
  readonly summary: StudentSavingsSummary;
}

export function StudentSavingsCard({ summary }: StudentSavingsCardProps) {
  const t = useTranslations('Subscriptions.studentSavings');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const loadProfile = () => {
      try {
        const stored = localStorage.getItem('baki_user_profile_v1');
        if (stored) {
          setProfile(JSON.parse(stored));
        }
      } catch {}
      setIsHydrated(true);
    };

    loadProfile();

    window.addEventListener('baki_profile_updated', loadProfile);
    window.addEventListener('storage', loadProfile);
    return () => {
      window.removeEventListener('baki_profile_updated', loadProfile);
      window.removeEventListener('storage', loadProfile);
    };
  }, []);

  // Do not show student discount opportunities for general or young professional users
  if (isHydrated && profile && (!profile.isStudent || profile.educationTier === 'general' || profile.educationTier === 'young_professional')) {
    return null;
  }

  // If there are no detected student savings opportunities
  if (!summary || summary.count === 0 || summary.opportunities.length === 0) {
    return null;
  }

  const universityInfo = profile?.email
    ? resolveUniversityDomain(profile.email)
    : profile?.universityDomain
    ? resolveUniversityDomain(profile.universityDomain)
    : null;

  return (
    <div className="rounded-xl border border-status-emerald-border bg-status-emerald-surface/30 p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-status-emerald-surface text-status-emerald-text border border-status-emerald-border/60 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-semibold text-text-primary">{t('title')}</h3>
            {universityInfo?.isEdu && universityInfo.institutionName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium bg-surface-1 text-status-emerald-text border-status-emerald-border">
                <Building2 className="w-3 h-3 text-status-emerald-text" aria-hidden="true" />
                <span>{universityInfo.institutionName}</span>
              </span>
            )}
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
                  <BrandLogo
                    merchantName={opp.merchantName}
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
                  {t('currentPrice')}: <span className="line-through text-text-muted">MYR {senToMyr(opp.currentMonthlySen ?? opp.currentAmountSen)}</span>
                </span>
                <span className="text-status-emerald-text font-medium">
                  {t('studentPrice')}: MYR {senToMyr(opp.studentMonthlySen ?? opp.studentAmountSen)}
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
    </div>
  );
}
