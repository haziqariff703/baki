'use client';

/**
 * HorizonCta — Awwwards-Level Kinetic Horizon Conversion Banner.
 *
 * Distinctive Architecture:
 * - Geometric horizon background with glowing focal beacon.
 * - Bold display typography.
 * - Fast, immediate signup CTA.
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ArrowRight, ShieldCheck, Terminal, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export function HorizonCta() {
  const t = useTranslations('Landing');

  return (
    <section className="pt-8 sm:pt-12 w-full max-w-7xl mx-auto">
      <div className="relative rounded-3xl border border-border-2 bg-gradient-to-b from-surface-1 via-surface-1 to-surface-0 p-6 sm:p-12 lg:p-16 text-center space-y-6 sm:space-y-8 overflow-hidden shadow-2xl">
        {/* Subtle Ambient Radial Beacon */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/10 rounded-full blur-[100px] pointer-events-none"
          aria-hidden="true"
        />

        {/* Header content */}
        <div className="space-y-3 max-w-2xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-2 border border-border-2 text-[11px] sm:text-xs font-mono text-text-secondary">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>START YOUR PRIVATE WORKSPACE</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] text-text-primary font-display">
            Take control of your cash flow today.
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-text-secondary leading-relaxed font-sans">
            Join Malaysian university students and young professionals managing recurring subscriptions with 100% privacy and deterministic math.
          </p>
        </div>

        {/* CTA Button with pulse */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-1 relative z-10">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-accent text-surface-0 font-bold text-sm hover:bg-accent-hover transition-all shadow-xl shadow-accent/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span>{t('ctaBannerBtn')}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Trust audit strip */}
        <div className="pt-4 border-t border-border-1/60 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-text-faint relative z-10">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span>Zero Banking Logins</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-accent" />
            <span>100% Pure TypeScript Engine</span>
          </span>
          <span>PDPA 2010 Protected</span>
        </div>
      </div>
    </section>
  );
}
