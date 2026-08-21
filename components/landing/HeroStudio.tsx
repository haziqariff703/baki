'use client';

/**
 * HeroStudio — Awwwards-Level Split-Screen Architectural Hero.
 *
 * Distinctive Studio Fintech Aesthetics:
 * - Asymmetrical layout: High-impact typography on left, live interactive scanner on right.
 * - Display Font: Syne with tight tracking & editorial italics.
 * - GSAP timeline orchestrating typography, stats bar, and interactive simulator.
 */

import React, { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ArrowRight, ShieldCheck, Cpu, Lock, Sparkles, Terminal } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { StatementScannerSimulator } from '@/components/landing/StatementScannerSimulator';

export function HeroStudio() {
  const t = useTranslations('Landing');
  const heroRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from('.studio-badge', {
        opacity: 0,
        y: -10,
        scale: 0.95,
        duration: 0.5,
      })
        .from(
          '.studio-title',
          {
            opacity: 0,
            y: 30,
            duration: 0.8,
          },
          '-=0.3',
        )
        .from(
          '.studio-sub',
          {
            opacity: 0,
            y: 18,
            duration: 0.6,
          },
          '-=0.5',
        )
        .from(
          '.studio-cta-group',
          {
            opacity: 0,
            y: 16,
            duration: 0.5,
          },
          '-=0.4',
        )
        .from(
          '.studio-stats-bar',
          {
            opacity: 0,
            y: 20,
            duration: 0.6,
          },
          '-=0.3',
        )
        .from(
          '.studio-scanner-window',
          {
            opacity: 0,
            x: 20,
            scale: 0.96,
            duration: 0.8,
          },
          '-=0.7',
        );
    },
    { scope: heroRef },
  );

  return (
    <section
      ref={heroRef}
      className="relative pt-6 pb-12 md:pt-10 md:pb-16 w-full max-w-7xl mx-auto space-y-12"
    >
      {/* ── Top Architectural Coordinate Ribbon ────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border-1 pb-3 text-[10px] sm:text-[11px] font-mono text-text-faint">
        <div className="studio-badge flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-accent animate-ping shrink-0" />
          <span className="text-text-secondary uppercase truncate">
            [KUL · 3.1390° N, 101.6869° E] · MALAYSIAN FINANCIAL INTELLIGENCE V1
          </span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-text-faint shrink-0">
          <span>RLS_PROTECTED</span>
          <span>PDPA_2010</span>
          <span>ZERO_LOGINS</span>
        </div>
      </div>

      {/* ── Main Asymmetric 2-Column Grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Bold Display Typography & CTAs (7 Cols) */}
        <div className="lg:col-span-7 space-y-5 text-left">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-surface-2 border border-border-2 text-[11px] sm:text-xs font-mono text-text-secondary">
            <span className="text-accent font-bold">01 / ARCHITECTURE</span>
            <span className="text-border-3">|</span>
            <span>Deterministic Subscription OS</span>
          </div>

          {/* Heading with Syne Display Typeface */}
          <h1 className="studio-title text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] leading-[1.1] text-text-primary font-display">
            Take control of every{' '}
            <span className="text-accent italic font-serif tracking-normal font-normal">
              ringgit
            </span>{' '}
            before it renews.
          </h1>

          {/* Editorial Subtitle */}
          <p className="studio-sub text-sm sm:text-base lg:text-lg text-text-secondary leading-relaxed max-w-xl font-sans">
            {t('heroSubtitle')}
          </p>

          {/* Dual Action CTAs */}
          <div className="studio-cta-group flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-surface-0 font-bold text-sm hover:bg-accent-hover transition-all shadow-lg shadow-accent/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span>{t('startFreeCta')}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface-2 border border-border-2 text-text-primary font-medium text-sm hover:bg-surface-3 hover:border-border-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent font-mono"
            >
              <Terminal className="w-4 h-4 text-accent" />
              <span>{t('exploreDemoCta')}</span>
            </a>
          </div>

          {/* Architectural Numeric Telemetry Bar */}
          <div className="studio-stats-bar pt-5 border-t border-border-1 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 font-mono text-left">
            <div>
              <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-text-primary block font-display">
                100%
              </span>
              <span className="text-[10px] sm:text-[11px] text-text-muted uppercase">Client Redaction</span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-accent block font-display">
                0
              </span>
              <span className="text-[10px] sm:text-[11px] text-text-muted uppercase">Bank Passwords</span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-text-primary block font-display">
                0.0s
              </span>
              <span className="text-[10px] sm:text-[11px] text-text-muted uppercase">Math Latency</span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-status-emerald-text block font-display">
                RM 340+
              </span>
              <span className="text-[10px] sm:text-[11px] text-text-muted uppercase">Student Concessions</span>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Statement Scanner (5 Cols) */}
        <div className="studio-scanner-window lg:col-span-5 w-full">
          <StatementScannerSimulator />
        </div>
      </div>
    </section>
  );
}
