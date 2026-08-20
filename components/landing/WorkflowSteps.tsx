'use client';

/**
 * 3-Step Statement Parsing & Human Control Workflow Explainer.
 *
 * Swiss Minimalist & Transparent:
 * - Highlights local document parsing (Maybank, CIMB, TNG, Bank Islam).
 * - Emphasizes immediate raw file purging and human confirmation.
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { UploadCloud, SearchCheck, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { SpotlightCard } from '@/components/landing/SpotlightCard';

export function WorkflowSteps() {
  const t = useTranslations('Landing');

  return (
    <section id="how-it-works" className="space-y-6 pt-4 scroll-mt-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center space-y-2 max-w-2xl mx-auto"
      >
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
          {t('workflowHeading')}
        </h2>
        <p className="text-sm text-text-muted leading-relaxed">
          {t('workflowSub')}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pt-2">
        {/* Step 1 */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <SpotlightCard className="p-6 space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-accent px-2 py-0.5 rounded bg-accent-subtle border border-accent-border">
                  STEP 01
                </span>
                <UploadCloud className="w-5 h-5 text-text-muted" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-text-primary">
                  {t('workflowStep1Title')}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  {t('workflowStep1Desc')}
                </p>
              </div>
            </div>
            <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono text-text-faint">
              <span className="px-2 py-0.5 rounded bg-surface-2 border border-border-1">Maybank</span>
              <span className="px-2 py-0.5 rounded bg-surface-2 border border-border-1">CIMB</span>
              <span className="px-2 py-0.5 rounded bg-surface-2 border border-border-1">TNG eWallet</span>
              <span className="px-2 py-0.5 rounded bg-surface-2 border border-border-1">Bank Islam</span>
            </div>
          </SpotlightCard>
        </motion.div>

        {/* Step 2 */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <SpotlightCard className="p-6 space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-accent px-2 py-0.5 rounded bg-accent-subtle border border-accent-border">
                  STEP 02
                </span>
                <SearchCheck className="w-5 h-5 text-text-muted" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-text-primary">
                  {t('workflowStep2Title')}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  {t('workflowStep2Desc')}
                </p>
              </div>
            </div>
            <div className="pt-2 flex items-center gap-1.5 text-[10px] font-mono text-status-emerald-text">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Raw statements purged instantly</span>
            </div>
          </SpotlightCard>
        </motion.div>

        {/* Step 3 */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <SpotlightCard className="p-6 space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-accent px-2 py-0.5 rounded bg-accent-subtle border border-accent-border">
                  STEP 03
                </span>
                <CheckCircle2 className="w-5 h-5 text-text-muted" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-text-primary">
                  {t('workflowStep3Title')}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  {t('workflowStep3Desc')}
                </p>
              </div>
            </div>
            <div className="pt-2 flex items-center gap-1.5 text-[10px] font-mono text-text-faint">
              <span className="px-2 py-0.5 rounded bg-status-emerald-surface text-status-emerald-text border border-status-emerald-border font-medium">Keep</span>
              <span className="px-2 py-0.5 rounded bg-status-blue-surface text-status-blue-text border border-status-blue-border font-medium">Review</span>
              <span className="px-2 py-0.5 rounded bg-status-amber-surface text-status-amber-text border border-status-amber-border font-medium">Pause</span>
              <span className="px-2 py-0.5 rounded bg-status-rose-surface text-status-rose-text border border-status-rose-border font-medium">Cancel</span>
            </div>
          </SpotlightCard>
        </motion.div>
      </div>
    </section>
  );
}
