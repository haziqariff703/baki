'use client';

/**
 * Editorial Hero Section for Baki Landing Page.
 *
 * Swiss Minimalist & Anti-AI-Slop:
 * - Direct value proposition without hype words or generic glowing gradients.
 * - High-contrast typography with Baki Amber accent.
 * - 4-point privacy & deterministic trust bar.
 */

import React, { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ArrowRight, ShieldCheck, Lock, Award, Cpu } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { SpotlightCard } from '@/components/landing/SpotlightCard';

export function HeroSection() {
  const t = useTranslations('Landing');
  const heroRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from('.hero-badge', {
        opacity: 0,
        y: -12,
        scale: 0.96,
        duration: 0.6,
      })
        .from(
          '.hero-heading',
          {
            opacity: 0,
            y: 24,
            duration: 0.7,
          },
          '-=0.3',
        )
        .from(
          '.hero-sub',
          {
            opacity: 0,
            y: 16,
            duration: 0.6,
          },
          '-=0.4',
        )
        .from(
          '.hero-cta',
          {
            opacity: 0,
            y: 12,
            scale: 0.98,
            duration: 0.5,
            stagger: 0.1,
          },
          '-=0.3',
        )
        .from(
          '.hero-trust-card',
          {
            opacity: 0,
            y: 20,
            duration: 0.5,
            stagger: 0.08,
          },
          '-=0.2',
        );
    },
    { scope: heroRef },
  );

  return (
    <section
      ref={heroRef}
      className="relative pt-6 pb-12 md:pt-12 md:pb-16 text-center space-y-8 max-w-4xl mx-auto"
    >
      {/* ── Subdued Category / Brand Eyebrow ─────────────────────────── */}
      <div className="hero-badge inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-border-2 text-xs font-mono text-text-secondary shadow-xs">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
        <span>{t('heroBadge')}</span>
      </div>

      {/* ── Hero Main Headline ───────────────────────────────────────── */}
      <div className="space-y-4">
        <h1 className="hero-heading text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] text-text-primary">
          {t('heroTitle')}
        </h1>
        <p className="hero-sub text-sm sm:text-base md:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
          {t('heroSubtitle')}
        </p>
      </div>

      {/* ── Action CTAs ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          href="/login"
          className="hero-cta w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-surface-0 font-semibold text-sm hover:bg-accent-hover transition-all shadow-xs active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span>{t('startFreeCta')}</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
        <a
          href="#demo"
          className="hero-cta w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface-2 border border-border-2 text-text-primary font-medium text-sm hover:bg-surface-3 hover:border-border-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span>{t('exploreDemoCta')}</span>
        </a>
      </div>

      {/* ── Trust & Privacy 4-Pillar Strip ───────────────────────────── */}
      <div className="pt-8 border-t border-border-1 grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
        <SpotlightCard className="hero-trust-card p-3 space-y-1">
          <div className="flex items-center gap-2 text-accent">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span className="text-xs font-semibold text-text-primary">{t('trust1')}</span>
          </div>
          <p className="text-[11px] text-text-muted leading-tight">{t('trust1Sub')}</p>
        </SpotlightCard>

        <SpotlightCard className="hero-trust-card p-3 space-y-1">
          <div className="flex items-center gap-2 text-accent">
            <Lock className="w-4 h-4" aria-hidden="true" />
            <span className="text-xs font-semibold text-text-primary">{t('trust2')}</span>
          </div>
          <p className="text-[11px] text-text-muted leading-tight">{t('trust2Sub')}</p>
        </SpotlightCard>

        <SpotlightCard className="hero-trust-card p-3 space-y-1">
          <div className="flex items-center gap-2 text-accent">
            <Award className="w-4 h-4" aria-hidden="true" />
            <span className="text-xs font-semibold text-text-primary">{t('trust3')}</span>
          </div>
          <p className="text-[11px] text-text-muted leading-tight">{t('trust3Sub')}</p>
        </SpotlightCard>

        <SpotlightCard className="hero-trust-card p-3 space-y-1">
          <div className="flex items-center gap-2 text-accent">
            <Cpu className="w-4 h-4" aria-hidden="true" />
            <span className="text-xs font-semibold text-text-primary">{t('trust4')}</span>
          </div>
          <p className="text-[11px] text-text-muted leading-tight">{t('trust4Sub')}</p>
        </SpotlightCard>
      </div>
    </section>
  );
}
