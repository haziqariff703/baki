'use client';

/**
 * ArchitecturalComparison — High-Density Terminal Ledger Matrix.
 *
 * Swiss Minimalist & Awwwards Studio Format:
 * - Monospace architectural table with crosshair grid points (+).
 * - Honest comparison between Baki, Standard Banking Apps, and Spreadsheets.
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { Check, X, Shield, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';

export function ArchitecturalComparison() {
  const t = useTranslations('Landing');

  const rows = [
    {
      title: 'Automated Recurring Pattern Detection',
      sub: 'Parses bank PDFs and CSVs without manual data entry',
      baki: true,
      bank: false,
      sheet: false,
    },
    {
      title: 'Deterministic 5-Pillar Score Matrix (0–100)',
      sub: 'Audits usage, necessity, affordability, uniqueness, satisfaction',
      baki: true,
      bank: false,
      sheet: false,
    },
    {
      title: 'Zero Bank Credentials & 100% Local Redaction',
      sub: 'No third-party online banking API logins or password sharing',
      baki: true,
      bank: false,
      sheet: true,
    },
    {
      title: 'Verified Malaysian Student Concession Optimizer',
      sub: 'Identifies university .edu.my student savings automatically',
      baki: true,
      bank: false,
      sheet: false,
    },
    {
      title: 'Payday Commitment Forecaster & Teh Tarik Burn',
      sub: 'Calculates bills due before salary/allowance in real daily metrics',
      baki: true,
      bank: false,
      sheet: false,
    },
    {
      title: '1-Click Irreversible PDPA Account Erasure',
      sub: 'Complete purge of user identity and data with zero residual traces',
      baki: true,
      bank: false,
      sheet: true,
    },
  ];

  return (
    <section id="privacy" className="space-y-8 pt-8 w-full max-w-7xl mx-auto scroll-mt-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border-1 pb-5 text-left">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-mono text-accent">
            <Terminal className="w-3.5 h-3.5" />
            <span>SYSTEM AUDIT & COMPETITIVE MATRIX</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] text-text-primary font-display">
            Why Baki is Fundamentally Different.
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-text-muted max-w-md font-sans leading-relaxed">
          Most banking apps sell credit cards. Spreadsheets require tedious manual data entry. Baki gives you deterministic clarity with zero surveillance.
        </p>
      </div>

      {/* ── Mobile Adaptive Card Stack (Visible on Mobile) ─────────── */}
      <div className="md:hidden space-y-3">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl border border-border-2 bg-surface-1 space-y-3 shadow-xs text-left"
          >
            <div>
              <span className="font-sans text-sm font-bold text-text-primary block leading-snug">
                {row.title}
              </span>
              <span className="text-[11px] font-mono text-text-muted mt-1 block leading-relaxed">
                {row.sub}
              </span>
            </div>

            {/* 3-Way Comparative Badge Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border-1 font-mono text-center">
              {/* Baki OS */}
              <div className="p-2 rounded-lg bg-accent-subtle/50 border border-accent-border flex flex-col items-center justify-center gap-1">
                <span className="text-[9px] text-accent font-bold uppercase tracking-wider">
                  Baki OS
                </span>
                <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent/20 text-accent">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                </div>
              </div>

              {/* Bank Apps */}
              <div className="p-2 rounded-lg bg-surface-2 border border-border-1 flex flex-col items-center justify-center gap-1">
                <span className="text-[9px] text-text-muted uppercase tracking-wider">
                  Bank Apps
                </span>
                <div className="inline-flex items-center justify-center w-5 h-5">
                  {row.bank ? (
                    <Check className="w-3.5 h-3.5 text-text-secondary" aria-hidden="true" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-text-faint opacity-50" aria-hidden="true" />
                  )}
                </div>
              </div>

              {/* Spreadsheets */}
              <div className="p-2 rounded-lg bg-surface-2 border border-border-1 flex flex-col items-center justify-center gap-1">
                <span className="text-[9px] text-text-muted uppercase tracking-wider">
                  Excel
                </span>
                <div className="inline-flex items-center justify-center w-5 h-5">
                  {row.sheet ? (
                    <Check className="w-3.5 h-3.5 text-text-secondary" aria-hidden="true" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-text-faint opacity-50" aria-hidden="true" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop Monospace Table (Visible on Tablets & Desktops) ─── */}
      <div className="hidden md:block border border-border-2 bg-surface-1 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-border-2 bg-surface-2/90 text-text-secondary font-sans text-xs uppercase">
                <th className="py-4 px-6 font-semibold w-1/2">Capability / Principle</th>
                <th className="py-4 px-6 font-bold text-accent text-center bg-accent-subtle/30 w-1/6 border-x border-accent-border/40">
                  Baki OS
                </th>
                <th className="py-4 px-6 font-semibold text-text-muted text-center w-1/6">
                  Standard Bank Apps
                </th>
                <th className="py-4 px-6 font-semibold text-text-muted text-center w-1/6">
                  Manual Excel / Sheets
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-1">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-surface-2/40 transition-colors">
                  <td className="py-4 px-6 text-left">
                    <span className="font-sans text-sm font-semibold text-text-primary block">
                      {row.title}
                    </span>
                    <span className="text-[11px] font-mono text-text-muted mt-0.5 block">
                      {row.sub}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center bg-accent-subtle/20 border-x border-accent-border/30">
                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent/20 text-accent mx-auto">
                      <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {row.bank ? (
                      <Check className="w-4 h-4 text-text-secondary mx-auto" aria-hidden="true" />
                    ) : (
                      <X className="w-4 h-4 text-text-faint mx-auto opacity-50" aria-hidden="true" />
                    )}
                  </td>
                  <td className="py-4 px-6 text-center">
                    {row.sheet ? (
                      <Check className="w-4 h-4 text-text-secondary mx-auto" aria-hidden="true" />
                    ) : (
                      <X className="w-4 h-4 text-text-faint mx-auto opacity-50" aria-hidden="true" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
