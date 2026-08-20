'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  User,
  Mail,
  GraduationCap,
  Wallet,
  Bell,
  Eye,
  Trash2,
  ShieldCheck,
  Check,
  Loader2,
  Building2,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  userProfileSchema,
  DEFAULT_USER_PROFILE,
  type UserProfile,
  type EducationTier,
} from '@/lib/validation/profile';
import { myrToSen, senToMyr } from '@/lib/money';
import { resolveUniversityDomain } from '@/features/settings/domainExtractor';

const LOCAL_STORAGE_KEY = 'baki_user_profile_v1';

export interface AccountProfileSettingsProps {
  readonly initialUser?: {
    readonly email?: string | null;
    readonly displayName?: string | null;
    readonly avatarUrl?: string | null;
  };
}

export function AccountProfileSettings({ initialUser }: AccountProfileSettingsProps) {
  const t = useTranslations('Settings');
  
  const [profile, setProfile] = useState<UserProfile>(() => {
    // If authenticated user is passed from server/Google Auth, pre-populate
    if (initialUser?.email) {
      const emailDomain = resolveUniversityDomain(initialUser.email);
      return {
        ...DEFAULT_USER_PROFILE,
        email: initialUser.email,
        displayName: initialUser.displayName || DEFAULT_USER_PROFILE.displayName,
        isStudent: emailDomain.isEdu,
        educationTier: emailDomain.isEdu ? 'tertiary_student' : 'general',
        universityDomain: emailDomain.isEdu ? emailDomain.domain : '',
      };
    }
    return DEFAULT_USER_PROFILE;
  });

  const [budgetInput, setBudgetInput] = useState<string>(
    senToMyr(DEFAULT_USER_PROFILE.monthlyBudgetSen)
  );
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('saved');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [testEmailFeedback, setTestEmailFeedback] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  async function handleSendTestEmail() {
    if (!profile.email) return;
    setTestEmailStatus('sending');
    setTestEmailFeedback(null);
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: profile.email, forceTest: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestEmailStatus('sent');
        setTestEmailFeedback(
          t('testEmailSent', { recipient: data.recipient ?? profile.email }) +
            (data.mocked ? ' (Simulated)' : ''),
        );
      } else {
        setTestEmailStatus('error');
        setTestEmailFeedback(
          t('testEmailFailed', { error: data.error || 'Unknown error' }),
        );
      }
    } catch (err) {
      setTestEmailStatus('error');
      setTestEmailFeedback(
        t('testEmailFailed', {
          error: err instanceof Error ? err.message : 'Network error',
        }),
      );
    }
  }

  // Derive University & Domain matching dynamically from current email
  const universityInfo = useMemo(() => {
    return resolveUniversityDomain(profile.email);
  }, [profile.email]);

  // Load persisted profile from localStorage or sync with authenticated session
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validated = userProfileSchema.safeParse(parsed);
        if (validated.success) {
          // If session user email is available from Google OAuth, prioritize verified email
          const merged: UserProfile = {
            ...validated.data,
            email: initialUser?.email || validated.data.email,
            displayName: initialUser?.displayName || validated.data.displayName,
          };
          const domainMatch = resolveUniversityDomain(merged.email);
          if (domainMatch.isEdu) {
            merged.universityDomain = domainMatch.domain;
            merged.isStudent = true;
            merged.educationTier = 'tertiary_student';
          } else if (merged.email.endsWith('@gmail.com') || merged.email.endsWith('@yahoo.com') || merged.email.endsWith('@outlook.com') || merged.email.endsWith('@hotmail.com')) {
            if (merged.educationTier === 'tertiary_student' && !merged.universityDomain) {
              merged.isStudent = false;
              merged.educationTier = 'general';
            }
          }
          setProfile(merged);
          setBudgetInput(senToMyr(merged.monthlyBudgetSen));
        }
      } else if (initialUser?.email) {
        const domainMatch = resolveUniversityDomain(initialUser.email);
        setProfile((prev) => ({
          ...prev,
          email: initialUser.email!,
          displayName: initialUser.displayName || prev.displayName,
          isStudent: domainMatch.isEdu,
          educationTier: domainMatch.isEdu ? 'tertiary_student' : 'general',
          universityDomain: domainMatch.isEdu ? domainMatch.domain : '',
        }));
      }
    } catch {
      // Use fallback
    }
  }, [initialUser]);

  // Handle email change and auto-reflect domain
  const handleEmailChange = (newEmail: string) => {
    const domainInfo = resolveUniversityDomain(newEmail);
    setProfile((prev) => ({
      ...prev,
      email: newEmail,
      universityDomain: domainInfo.isEdu ? domainInfo.domain : '',
      isStudent: domainInfo.isEdu ? true : (prev.educationTier === 'tertiary_student' ? false : prev.isStudent),
      educationTier: domainInfo.isEdu ? 'tertiary_student' : (prev.educationTier === 'tertiary_student' ? 'general' : prev.educationTier),
    }));
  };

  // Auto-Save Effect (Debounced 500ms — Quiet & Non-Intrusive Craft)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      const parsedSen = myrToSen(budgetInput || '0');
      if (parsedSen === null) {
        setErrors((prev) => ({ ...prev, budget: t('errorBudget') }));
        setSaveStatus('idle');
        return;
      }

      const candidate: UserProfile = {
        ...profile,
        monthlyBudgetSen: parsedSen,
        isStudent: profile.educationTier === 'tertiary_student',
      };

      const result = userProfileSchema.safeParse(candidate);
      if (result.success) {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(result.data));
          window.dispatchEvent(new Event('baki_profile_updated'));
          setErrors({});
          setSaveStatus('saved');
        } catch {
          setSaveStatus('idle');
        }
      } else {
        const newErrors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
          newErrors[issue.path.join('.')] = issue.message;
        });
        setErrors(newErrors);
        setSaveStatus('idle');
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [profile, budgetInput, t]);

  const getInitials = (name: string) => {
    return (
      name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'U'
    );
  };

  const [imgError, setImgError] = useState(false);
  const avatarUrl = initialUser?.avatarUrl;

  return (
    <div className="space-y-6">
      {/* 1. Account Profile Identity Card */}
      <section aria-labelledby="identity-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2
            id="identity-heading"
            className="text-xs font-mono uppercase tracking-wider text-text-faint"
          >
            {t('identityHeading')}
          </h2>

          {/* Quiet Status Indicator (Linear-grade auto-save craft) */}
          <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono" role="status" aria-live="polite">
            {saveStatus === 'saving' ? (
              <span className="inline-flex items-center gap-1 text-text-muted animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-accent" />
                <span>Saving…</span>
              </span>
            ) : saveStatus === 'saved' ? (
              <span className="inline-flex items-center gap-1.5 text-status-emerald-text">
                <span className="w-1.5 h-1.5 rounded-full bg-status-emerald-text inline-block" />
                <span>{t('savedSuccessMessage')}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="border border-border-1 rounded-xl bg-surface-1 p-5 space-y-5">
          {/* Identity Header Banner */}
          <div className="flex items-center gap-4">
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={profile.displayName || 'Profile Avatar'}
                onError={() => setImgError(true)}
                className="w-12 h-12 rounded-xl border border-border-2 object-cover shrink-0 shadow-xs"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-surface-3 border border-border-2 flex items-center justify-center font-mono text-base font-semibold text-text-primary shrink-0 shadow-xs">
                {getInitials(profile.displayName)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-semibold text-text-primary truncate">
                  {profile.displayName || t('notSet')}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-medium',
                    profile.educationTier === 'tertiary_student'
                      ? 'bg-status-emerald-surface text-status-emerald-text border-status-emerald-border'
                      : profile.educationTier === 'young_professional'
                      ? 'bg-status-blue-surface text-status-blue-text border-status-blue-border'
                      : 'bg-surface-2 text-text-secondary border-border-2'
                  )}
                >
                  {profile.educationTier === 'tertiary_student'
                    ? t('tierStudentBadge')
                    : profile.educationTier === 'young_professional'
                    ? t('tierYouthBadge')
                    : t('tierGeneralBadge')}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                {profile.email || t('notSet')} · {t('verifiedAccount')}
              </p>
            </div>
          </div>

          {/* Form Fields: Display Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border-1">
            <div className="space-y-1.5">
              <label
                htmlFor="profile-display-name"
                className="text-xs font-medium text-text-secondary flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-text-faint" aria-hidden="true" />
                <span>{t('displayName')}</span>
              </label>
              <input
                id="profile-display-name"
                type="text"
                value={profile.displayName}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, displayName: e.target.value }))
                }
                placeholder="e.g. Muhammad Haziq"
                className="w-full bg-surface-2 border border-border-2 rounded-xl px-3.5 py-2 text-sm text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              />
              {errors.displayName && (
                <p className="text-xs text-status-rose-text">{errors.displayName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="profile-email"
                className="text-xs font-medium text-text-secondary flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-text-faint" aria-hidden="true" />
                <span>{t('email')}</span>
              </label>
              <input
                id="profile-email"
                type="email"
                value={profile.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="e.g. user@siswa.um.edu.my"
                className="w-full bg-surface-2 border border-border-2 rounded-xl px-3.5 py-2 text-sm text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              />
              {errors.email && (
                <p className="text-xs text-status-rose-text">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Dynamic University Domain Detection Badge */}
          {universityInfo.isEdu && (
            <div className="p-3 rounded-xl bg-status-emerald-surface/50 border border-status-emerald-border/60 flex items-center gap-2.5 text-xs text-status-emerald-text">
              <Building2 className="w-4 h-4 shrink-0 text-status-emerald-text" aria-hidden="true" />
              <div className="min-w-0">
                <span className="font-semibold block truncate">
                  {universityInfo.institutionName} ({universityInfo.shortCode})
                </span>
                <span className="text-[11px] opacity-90 block">
                  Verified Malaysian institution domain ({universityInfo.domain}) · Student discounts unlocked
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. Academic & Youth Concessions (§1.1 / Student Savings) */}
      <section aria-labelledby="academic-heading" className="space-y-3">
        <h2
          id="academic-heading"
          className="text-xs font-mono uppercase tracking-wider text-text-faint"
        >
          {t('academicHeading')}
        </h2>

        <div className="border border-border-1 rounded-xl bg-surface-1 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-status-emerald-text" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-text-primary">
              {t('academicTierTitle')}
            </h3>
          </div>
          <p className="text-xs text-text-muted">{t('academicTierDesc')}</p>

          {/* Education Tier Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {[
              {
                id: 'tertiary_student',
                label: t('tierStudent'),
                sub: t('tierStudentSub'),
              },
              {
                id: 'young_professional',
                label: t('tierYouth'),
                sub: t('tierYouthSub'),
              },
              {
                id: 'general',
                label: t('tierGeneral'),
                sub: t('tierGeneralSub'),
              },
            ].map((opt) => {
              const active = profile.educationTier === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setProfile((p) => ({
                      ...p,
                      educationTier: opt.id as EducationTier,
                      isStudent: opt.id === 'tertiary_student',
                    }))
                  }
                  className={cn(
                    'p-3 rounded-xl border text-left transition-colors cursor-pointer',
                    active
                      ? 'border-accent bg-surface-2 text-text-primary shadow-xs ring-1 ring-accent'
                      : 'border-border-1 bg-surface-1 text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="block text-xs font-semibold">{opt.label}</span>
                    {active && <Check className="w-3.5 h-3.5 text-accent" aria-hidden="true" />}
                  </div>
                  <span className="block text-[11px] text-text-muted mt-0.5">
                    {opt.sub}
                  </span>
                </button>
              );
            })}
          </div>

          {/* University Domain Input (if student) */}
          {profile.educationTier === 'tertiary_student' && (
            <div className="space-y-1.5 pt-2">
              <label
                htmlFor="university-domain"
                className="text-xs font-medium text-text-secondary block"
              >
                {t('universityDomainLabel')}
              </label>
              <div className="relative">
                <input
                  id="university-domain"
                  type="text"
                  value={profile.universityDomain}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      universityDomain: e.target.value.toLowerCase().trim(),
                    }))
                  }
                  placeholder="e.g. siswa.um.edu.my, utm.my, uitm.edu.my"
                  className="w-full bg-surface-2 border border-border-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
              <p className="text-[11px] text-status-emerald-text flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{t('studentSavingsActiveHint')}</span>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 3. Monthly Financial Baseline & Allowance (§8.1) */}
      <section aria-labelledby="budget-heading" className="space-y-3">
        <h2
          id="budget-heading"
          className="text-xs font-mono uppercase tracking-wider text-text-faint"
        >
          {t('budgetHeading')}
        </h2>

        <div className="border border-border-1 rounded-xl bg-surface-1 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-accent" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-text-primary">
              {t('monthlyAllowanceTitle')}
            </h3>
          </div>
          <p className="text-xs text-text-muted">{t('monthlyAllowanceDesc')}</p>

          <div className="space-y-1.5 pt-1">
            <label
              htmlFor="monthly-budget-input"
              className="text-xs font-medium text-text-secondary block"
            >
              {t('monthlyBudgetLabel')}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-text-faint pointer-events-none">
                MYR
              </span>
              <input
                id="monthly-budget-input"
                type="text"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="1200.00"
                className="w-full bg-surface-2 border border-border-2 rounded-xl pl-13 pr-4 py-2 font-mono text-sm text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>
            {errors.budget && (
              <p className="text-xs text-status-rose-text">{errors.budget}</p>
            )}
            <p className="text-[11px] text-text-muted font-mono">
              {t('dailyEquivalentLabel', {
                daily: (Number(budgetInput || 0) / 30).toFixed(2),
              })}
            </p>
          </div>

          {/* Payday Anchor Day of Month */}
          <div className="space-y-2 pt-3 border-t border-border-1/60">
            <div className="space-y-0.5">
              <label
                htmlFor="payday-input"
                className="text-xs font-medium text-text-secondary block"
              >
                {t('paydayTitle')}
              </label>
              <p className="text-[11px] text-text-muted">{t('paydayDesc')}</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="payday-input"
                type="number"
                min={1}
                max={31}
                value={profile.paydayDayOfMonth || 25}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1 && val <= 31) {
                    setProfile((p) => ({ ...p, paydayDayOfMonth: val }));
                  }
                }}
                className="w-24 bg-surface-2 border border-border-2 rounded-xl px-3 py-2 font-mono text-sm text-text-primary text-center focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              />
              <span className="text-xs text-text-faint font-mono">{t('dayOfMonthSuffix')}</span>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {[
                { day: 25, key: 'presets.standard' },
                { day: 28, key: 'presets.civil' },
                { day: 1, key: 'presets.allowance' },
                { day: 15, key: 'presets.midMonth' },
              ].map(({ day, key }) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setProfile((p) => ({ ...p, paydayDayOfMonth: day }))}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-mono transition-colors border',
                    (profile.paydayDayOfMonth || 25) === day
                      ? 'bg-accent/10 text-accent border-accent/30 font-semibold'
                      : 'bg-surface-2 text-text-muted border-border-1 hover:text-text-primary hover:border-border-2'
                  )}
                >
                  {t(key as any)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Renewal Alerts & Ledger Preferences */}
      <section aria-labelledby="preferences-heading" className="space-y-3">
        <h2
          id="preferences-heading"
          className="text-xs font-mono uppercase tracking-wider text-text-faint"
        >
          {t('preferencesHeading')}
        </h2>

        <div className="border border-border-1 rounded-xl bg-surface-1 p-5 space-y-5 divide-y divide-border-1">
          {/* Renewal Reminder Lead Time */}
          <div className="space-y-2.5 pb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-text-faint" aria-hidden="true" />
              <span className="text-xs font-semibold text-text-primary">
                {t('renewalLeadTimeTitle')}
              </span>
            </div>
            <p className="text-xs text-text-muted">{t('renewalLeadTimeDesc')}</p>

            <div className="inline-flex rounded-xl border border-border-1 bg-surface-2 p-1 text-xs">
              {[
                { days: 7, label: t('reminder7Days') },
                { days: 3, label: t('reminder3Days') },
                { days: 1, label: t('reminder1Day') },
              ].map((item) => (
                <button
                  key={item.days}
                  type="button"
                  onClick={() =>
                    setProfile((p) => ({
                      ...p,
                      reminderDaysBefore: item.days as 1 | 3 | 7,
                    }))
                  }
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer',
                    profile.reminderDaysBefore === item.days
                      ? 'bg-surface-3 text-text-primary shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Email Notifications (Resend Adapter) */}
          <div className="space-y-3 pt-4 pb-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-accent" aria-hidden="true" />
                  <span className="text-xs font-semibold text-text-primary">
                    {t('emailReminderTitle')}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">{t('emailReminderDesc')}</p>
              </div>

              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={testEmailStatus === 'sending' || !profile.email}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-2 hover:bg-surface-3 border border-border-2 text-text-primary transition-all disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {testEmailStatus === 'sending' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" aria-hidden="true" />
                    <span>{t('testEmailSending')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                    <span>{t('testEmailCta')}</span>
                  </>
                )}
              </button>
            </div>

            {testEmailFeedback && (
              <div
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-mono border',
                  testEmailStatus === 'sent'
                    ? 'bg-status-emerald-surface text-status-emerald-text border-status-emerald-border'
                    : 'bg-status-rose-surface text-status-rose-text border-status-rose-border'
                )}
              >
                {testEmailFeedback}
              </div>
            )}
          </div>

          {/* Default Ledger View Mode */}
          <div className="space-y-2.5 pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-text-faint" aria-hidden="true" />
              <span className="text-xs font-semibold text-text-primary">
                {t('defaultViewModeTitle')}
              </span>
            </div>
            <p className="text-xs text-text-muted">{t('defaultViewModeDesc')}</p>

            <div className="inline-flex rounded-xl border border-border-1 bg-surface-2 p-1 text-xs">
              <button
                type="button"
                onClick={() =>
                  setProfile((p) => ({ ...p, defaultViewMode: 'actual' }))
                }
                className={cn(
                  'px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer',
                  profile.defaultViewMode === 'actual'
                    ? 'bg-surface-3 text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                {t('viewModeActual')}
              </button>
              <button
                type="button"
                onClick={() =>
                  setProfile((p) => ({ ...p, defaultViewMode: 'monthly' }))
                }
                className={cn(
                  'px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer',
                  profile.defaultViewMode === 'monthly'
                    ? 'bg-surface-3 text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                {t('viewModeMonthly')}
              </button>
            </div>
          </div>

          {/* Statement Auto-Purge Policy (§2.3 / §12) */}
          <div className="space-y-2.5 pt-4">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-status-emerald-text" aria-hidden="true" />
              <span className="text-xs font-semibold text-text-primary">
                {t('retentionPolicyTitle')}
              </span>
            </div>
            <p className="text-xs text-text-muted">{t('retentionPolicyDesc')}</p>

            <div className="inline-flex rounded-xl border border-border-1 bg-surface-2 p-1 text-xs">
              <button
                type="button"
                onClick={() =>
                  setProfile((p) => ({
                    ...p,
                    statementRetentionWindow: 'immediate',
                  }))
                }
                className={cn(
                  'px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer',
                  profile.statementRetentionWindow === 'immediate'
                    ? 'bg-surface-3 text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                {t('retentionImmediate')}
              </button>
              <button
                type="button"
                onClick={() =>
                  setProfile((p) => ({
                    ...p,
                    statementRetentionWindow: '24_hours',
                  }))
                }
                className={cn(
                  'px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer',
                  profile.statementRetentionWindow === '24_hours'
                    ? 'bg-surface-3 text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                {t('retention24Hours')}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
