'use client';

/**
 * StatementScannerSimulator — Awwwards-Level Interactive Hero Artifact.
 *
 * An interactive, live Malaysian Bank Statement Scanner simulator:
 * - Allows user to click Maybank, CIMB, Touch 'n Go, or Bank Islam presets.
 * - Simulates real-time on-device redaction and deterministic recurring pattern detection.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, FileText, CheckCircle2, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

interface StatementPreset {
  id: string;
  bankName: string;
  accountMasked: string;
  rawSnippet: string;
  detectedMerchant: string;
  detectedAmount: string;
  detectedCadence: string;
  detectedScore: number;
  recommendation: 'keep' | 'review' | 'pause' | 'cancel';
}

const PRESETS: StatementPreset[] = [
  {
    id: 'maybank',
    bankName: 'Maybank2u',
    accountMasked: '5140 8821 ****',
    rawSnippet: '01/09 SPTF*SPOTIFY SE KUALA LUMPUR MY -15.90 DR',
    detectedMerchant: 'Spotify Premium (Individual)',
    detectedAmount: 'RM 15.90',
    detectedCadence: 'Monthly',
    detectedScore: 86,
    recommendation: 'keep',
  },
  {
    id: 'cimb',
    bankName: 'CIMB Clicks',
    accountMasked: '7041 2290 ****',
    rawSnippet: '05/09 ANYTIME FITNESS KL SENTRAL -159.00 DR',
    detectedMerchant: 'Anytime Fitness Gym Club',
    detectedAmount: 'RM 159.00',
    detectedCadence: 'Monthly',
    detectedScore: 38,
    recommendation: 'pause',
  },
  {
    id: 'tng',
    bankName: "TNG eWallet",
    accountMasked: '017-***8921',
    rawSnippet: '10/09 OPENAI *CHATGPT SUBSCRIPTION USD 20.00 -RM 94.50',
    detectedMerchant: 'ChatGPT Plus (AI)',
    detectedAmount: 'RM 94.50',
    detectedCadence: 'Monthly',
    detectedScore: 82,
    recommendation: 'keep',
  },
  {
    id: 'bankislam',
    bankName: 'Bank Islam',
    accountMasked: '1202 9941 ****',
    rawSnippet: '12/09 TM UNIFI FIBRE BROADBAND 100M -89.00 DR',
    detectedMerchant: 'TM Unifi Home Broadband',
    detectedAmount: 'RM 89.00',
    detectedCadence: 'Monthly',
    detectedScore: 92,
    recommendation: 'keep',
  },
];

export function StatementScannerSimulator() {
  const [selectedId, setSelectedId] = useState<string>('maybank');
  const activePreset = PRESETS.find((p) => p.id === selectedId) ?? PRESETS[0];

  return (
    <div className="rounded-2xl border border-border-2 bg-surface-1 overflow-hidden shadow-2xl relative font-sans text-left">
      {/* ── Terminal Window Top Bar ──────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-border-1 bg-surface-2/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-rose-text/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-status-amber-text/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-status-emerald-text/80 inline-block" />
          </div>
          <span className="text-[11px] font-mono text-text-faint ml-2 hidden sm:inline">
            baki-engine://client-parser/sandbox
          </span>
        </div>
        <div className="inline-flex items-center gap-1 text-[10px] font-mono text-status-emerald-text bg-status-emerald-surface border border-status-emerald-border px-2 py-0.5 rounded-md">
          <ShieldCheck className="w-3 h-3" />
          <span>ZERO-RETENTION ACTIVE</span>
        </div>
      </div>

      {/* ── Preset Bank Switcher Tabs ────────────────────────────────── */}
      <div className="p-3 border-b border-border-1 bg-surface-0/60 flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[10px] font-mono text-text-faint uppercase px-1 shrink-0">Sample:</span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedId(p.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer ${
              p.id === selectedId
                ? 'bg-accent-subtle text-accent border border-accent-border font-bold'
                : 'bg-surface-2 text-text-muted hover:text-text-primary border border-border-1'
            }`}
          >
            {p.bankName}
          </button>
        ))}
      </div>

      {/* ── Interactive Scanner Display ──────────────────────────────── */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Document Ingestion & Redaction Stream */}
        <div className="space-y-1.5 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-text-faint">
            <span>CLIENT-SIDE PARSER STREAM</span>
            <span className="text-accent">{activePreset.bankName} Statement</span>
          </div>

          <div className="p-3 rounded-xl bg-surface-0 border border-border-1 space-y-2 relative overflow-hidden">
            {/* Animated Laser Scanning Beam */}
            <motion.div
              key={activePreset.id}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: [0, 60, 0], opacity: [0.3, 0.8, 0.3] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent pointer-events-none z-10"
            />

            <div className="flex items-center justify-between text-[11px] text-text-muted">
              <span>Account: {activePreset.accountMasked}</span>
              <span className="text-status-emerald-text text-[10px] font-bold">[REDACTED]</span>
            </div>

            <div className="text-text-secondary text-[11px] truncate bg-surface-2/60 p-2 rounded border border-border-1">
              <code>{activePreset.rawSnippet}</code>
            </div>
          </div>
        </div>

        {/* Real-time Extracted Subscription Output */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePreset.id}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.25 }}
            className="p-3.5 rounded-xl border border-border-2 bg-surface-2 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                  Detected Recurring Candidate
                </span>
                <h4 className="text-sm sm:text-base font-bold text-text-primary font-sans">
                  {activePreset.detectedMerchant}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-base font-mono font-bold text-text-primary">
                  {activePreset.detectedAmount}
                </span>
                <span className="text-[10px] font-mono text-text-muted block">
                  / {activePreset.detectedCadence}
                </span>
              </div>
            </div>

            {/* 5-Pillar Score & Decision Bar */}
            <div className="pt-2 border-t border-border-1 flex items-center justify-between gap-2 flex-wrap text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted">Value Score:</span>
                <span className="font-bold text-accent px-1.5 py-0.5 rounded bg-accent-subtle border border-accent-border">
                  {activePreset.detectedScore}/100
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-text-muted">Recommendation:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-sans border ${
                    activePreset.recommendation === 'keep'
                      ? 'bg-status-emerald-surface text-status-emerald-text border-status-emerald-border'
                      : 'bg-status-amber-surface text-status-amber-text border-status-amber-border'
                  }`}
                >
                  {activePreset.recommendation === 'keep' ? 'Keep' : 'Pause / Downgrade'}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Audit Guarantee Note */}
        <div className="flex items-center justify-between text-[10px] font-mono text-text-faint pt-1">
          <span>⚡ Papa Parse & PDF.js Local Parsing</span>
          <span>Zero external bank login</span>
        </div>
      </div>
    </div>
  );
}
