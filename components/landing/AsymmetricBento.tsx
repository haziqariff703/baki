'use client';

/**
 * AsymmetricBento — Awwwards-Level Architectural Interactive Bento Grid.
 *
 * 4 High-Craft Quadrants with Real-time Interactive Micro-Widgets:
 * - 1. Live Cash-Flow & Teh Tarik Liquid Runway Simulator.
 * - 2. Verified Malaysian Student Deal Finder (.edu.my).
 * - 3. Zero-Knowledge Client Shredder Vault (PDPA 2010).
 * - 4. Deterministic 5-Pillar Decision-Tree Visualizer.
 */

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  CalendarClock,
  Coffee,
  GraduationCap,
  ShieldCheck,
  Cpu,
  Trash2,
  CheckCircle2,
  Sparkles,
  Sliders,
  Check,
} from 'lucide-react';
import { SpotlightCard } from '@/components/landing/SpotlightCard';
import { senToMyr } from '@/lib/money';

const UNIVERSITIES = [
  { domain: 'utm.my', name: 'Universiti Teknologi Malaysia (UTM)', annualSavings: 'RM 348' },
  { domain: 'um.edu.my', name: 'Universiti Malaya (UM)', annualSavings: 'RM 380' },
  { domain: 'uitm.edu.my', name: 'Universiti Teknologi MARA (UiTM)', annualSavings: 'RM 312' },
  { domain: 'taylors.edu.my', name: "Taylor's University", annualSavings: 'RM 420' },
  { domain: 'sunway.edu.my', name: 'Sunway University', annualSavings: 'RM 395' },
];

export function AsymmetricBento() {
  const t = useTranslations('Landing');

  // Interactive State for Bento 1 (Cash-Flow Runway)
  const [budget, setBudget] = useState<number>(1200);
  const [paydayDate, setPaydayDate] = useState<number>(25);

  const sampleMonthlyBills = 233.8;
  const safeToSpend = Math.max(0, budget - sampleMonthlyBills);
  const dailyBurn = (sampleMonthlyBills / 30).toFixed(2);
  const tehTarikCount = (Number(dailyBurn) / 2.5).toFixed(1);

  // Interactive State for Bento 2 (Student Deals)
  const [selectedUni, setSelectedUni] = useState(UNIVERSITIES[0]);

  // Interactive State for Bento 3 (Client Shredder)
  const [isShredded, setIsShredded] = useState(false);

  return (
    <section id="features" className="space-y-8 pt-8 w-full max-w-7xl mx-auto scroll-mt-20">
      {/* ── Section Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border-1 pb-5 text-left">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-mono text-accent">
            <Cpu className="w-3.5 h-3.5" />
            <span>CORE CAPABILITIES & LIFESTYLE TELEMETRY</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] text-text-primary font-display">
            Engineered for Malaysian Cash Flow.
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-text-muted max-w-md font-sans leading-relaxed">
          Deterministic financial safeguards, everyday lifestyle burn metrics, and verified student discounts in Ringgit Malaysia (MYR).
        </p>
      </div>

      {/* ── 4-Quadrant Asymmetric Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* ── QUADRANT 1: Live Cash-Flow & Teh Tarik Runway (7 Cols) ─────── */}
        <SpotlightCard className="lg:col-span-7 p-5 sm:p-7 space-y-5 flex flex-col justify-between">
          <div className="space-y-2.5 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 sm:p-2 rounded-xl bg-surface-2 border border-border-2 text-accent">
                  <CalendarClock className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <span className="font-mono text-[11px] sm:text-xs text-text-muted uppercase">Interactive Simulator</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-accent-subtle text-accent border border-accent-border">
                PAYDAY ANCHOR
              </span>
            </div>

            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-text-primary font-display">
              Payday Commitment Forecaster & Teh Tarik Index
            </h3>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              Drag your monthly allowance or salary to see how upcoming bills impact your real uncommitted cash before payday arrives.
            </p>
          </div>

          {/* Interactive Sliders */}
          <div className="space-y-3.5 p-3.5 sm:p-4 rounded-xl bg-surface-0 border border-border-1 font-mono text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-text-secondary text-[11px] sm:text-xs">
                <span>Monthly Budget / Allowance:</span>
                <strong className="text-text-primary text-xs sm:text-sm font-bold">MYR {budget}</strong>
              </div>
              <input
                type="range"
                min={400}
                max={4000}
                step={50}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-surface-2 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border-1">
              <div>
                <span className="text-[9px] sm:text-[10px] text-text-muted uppercase block">Total Commitments</span>
                <span className="text-xs sm:text-sm font-bold text-text-primary">MYR {sampleMonthlyBills.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[9px] sm:text-[10px] text-text-muted uppercase block">Safe-To-Spend</span>
                <span className="text-xs sm:text-sm font-bold text-status-emerald-text">MYR {safeToSpend.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[9px] sm:text-[10px] text-accent uppercase block font-bold">Teh Tarik Burn</span>
                <span className="text-xs sm:text-sm font-bold text-accent">~{tehTarikCount} cups/day</span>
              </div>
            </div>
          </div>
        </SpotlightCard>

        {/* ── QUADRANT 2: Verified Student Concession Hub (5 Cols) ───────── */}
        <SpotlightCard className="lg:col-span-5 p-5 sm:p-7 space-y-5 flex flex-col justify-between">
          <div className="space-y-2.5 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 sm:p-2 rounded-xl bg-surface-2 border border-border-2 text-accent">
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <span className="font-mono text-[11px] sm:text-xs text-text-muted uppercase">Student Optimizer</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-status-emerald-surface text-status-emerald-text border border-status-emerald-border">
                .EDU.MY
              </span>
            </div>

            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-text-primary font-display">
              Verified Student Concessions
            </h3>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              Unlock verified university discounts on Spotify, Apple Music, YouTube, and GitHub.
            </p>
          </div>

          {/* Interactive University Selector */}
          <div className="space-y-2.5 font-mono text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-text-faint uppercase block text-left">Select University:</span>
              <select
                value={selectedUni.domain}
                onChange={(e) => {
                  const found = UNIVERSITIES.find((u) => u.domain === e.target.value);
                  if (found) setSelectedUni(found);
                }}
                className="w-full p-2 rounded-lg bg-surface-0 border border-border-2 text-text-primary text-xs focus:outline-none focus:border-accent"
              >
                {UNIVERSITIES.map((u) => (
                  <option key={u.domain} value={u.domain}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-status-emerald-surface/60 border border-status-emerald-border rounded-xl space-y-1.5 text-left">
              <div className="flex items-center justify-between text-status-emerald-text font-bold text-xs sm:text-sm">
                <span>Avg Annual Savings:</span>
                <span className="font-display font-bold">{selectedUni.annualSavings} / yr</span>
              </div>
              <div className="text-[11px] text-text-secondary space-y-1">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-status-emerald-text shrink-0" />
                  <span>Spotify Student: RM 8.50/mo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-status-emerald-text shrink-0" />
                  <span>Apple Music Student: RM 8.00/mo</span>
                </div>
              </div>
            </div>
          </div>
        </SpotlightCard>

        {/* ── QUADRANT 3: Zero-Knowledge Data Sovereignty Vault (5 Cols) ──── */}
        <SpotlightCard className="lg:col-span-5 p-5 sm:p-7 space-y-5 flex flex-col justify-between">
          <div className="space-y-2.5 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 sm:p-2 rounded-xl bg-surface-2 border border-border-2 text-accent">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <span className="font-mono text-[11px] sm:text-xs text-text-muted uppercase">PDPA 2010 Protected</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-surface-2 text-text-faint border border-border-1">
                LOCAL COMPUTE
              </span>
            </div>

            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-text-primary font-display">
              Zero-Knowledge Statement Shredder
            </h3>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              Your raw bank statements never touch our database. All text is extracted locally in client memory and wiped instantly.
            </p>
          </div>

          {/* Interactive Memory Wipe Simulator */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-surface-0 border border-border-1 font-mono text-xs space-y-2.5 text-left">
            <div className="flex items-center justify-between">
              <span className="text-text-muted text-[11px]">Memory State:</span>
              <span className={isShredded ? 'text-status-emerald-text font-bold text-xs' : 'text-accent font-bold text-xs'}>
                {isShredded ? '0 BYTES (PURGED)' : 'PARSING IN RAM'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsShredded(!isShredded)}
              className="w-full py-2 px-3 rounded-lg bg-surface-2 border border-border-2 text-text-primary hover:border-border-3 flex items-center justify-center gap-2 text-xs font-mono transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-accent" />
              <span>{isShredded ? 'Simulate Next Ingestion' : 'Trigger Immediate Client Purge'}</span>
            </button>
          </div>
        </SpotlightCard>

        {/* ── QUADRANT 4: Deterministic 5-Pillar Decision Matrix (7 Cols) ─── */}
        <SpotlightCard className="lg:col-span-7 p-5 sm:p-7 space-y-5 flex flex-col justify-between">
          <div className="space-y-2.5 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 sm:p-2 rounded-xl bg-surface-2 border border-border-2 text-accent">
                  <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <span className="font-mono text-[11px] sm:text-xs text-text-muted uppercase">Pure TypeScript Engine</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-accent-subtle text-accent border border-accent-border">
                0–100 SCORE
              </span>
            </div>

            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-text-primary font-display">
              Deterministic 5-Pillar Score Matrix
            </h3>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              No AI hallucinations for financial math. Every recommendation is derived from 5 weighted criteria with hard decision-tree safeguards.
            </p>
          </div>

          {/* 5-Criterion Weight Bars */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs text-left">
            <div className="p-2 sm:p-2.5 rounded-lg bg-surface-0 border border-border-1">
              <span className="text-[9px] sm:text-[10px] text-text-muted block">Usage</span>
              <strong className="text-text-primary font-bold text-xs sm:text-sm">25%</strong>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-surface-0 border border-border-1">
              <span className="text-[9px] sm:text-[10px] text-text-muted block">Necessity</span>
              <strong className="text-text-primary font-bold text-xs sm:text-sm">25%</strong>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-surface-0 border border-border-1">
              <span className="text-[9px] sm:text-[10px] text-text-muted block">Affordability</span>
              <strong className="text-text-primary font-bold text-xs sm:text-sm">20%</strong>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-surface-0 border border-border-1">
              <span className="text-[9px] sm:text-[10px] text-text-muted block">Uniqueness</span>
              <strong className="text-text-primary font-bold text-xs sm:text-sm">15%</strong>
            </div>
            <div className="p-2 sm:p-2.5 rounded-lg bg-surface-0 border border-border-1">
              <span className="text-[9px] sm:text-[10px] text-text-muted block">Satisfaction</span>
              <strong className="text-text-primary font-bold text-xs sm:text-sm">15%</strong>
            </div>
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
}
