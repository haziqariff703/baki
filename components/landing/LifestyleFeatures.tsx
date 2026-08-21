'use client';

/**
 * Malaysian Lifestyle & Student Feature Grid.
 *
 * Swiss Minimalist & Distinctly Malaysian:
 * - Payday / Allowance Forecaster (25th payday / 1st allowance).
 * - Teh Tarik Daily Burn Index.
 * - .edu.my verified student savings finder.
 * - In-app 7d / 1d / day-of reminders.
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { CalendarClock, Coffee, GraduationCap, BellRing } from 'lucide-react';
import { motion } from 'framer-motion';
import { SpotlightCard } from '@/components/landing/SpotlightCard';

export function LifestyleFeatures() {
  const t = useTranslations('Landing');

  return (
    <section id="features" className="space-y-6 pt-6 scroll-mt-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center space-y-2 max-w-2xl mx-auto"
      >
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
          {t('featuresHeading')}
        </h2>
        <p className="text-sm text-text-muted leading-relaxed">
          {t('featuresSub')}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pt-2">
        {/* Feature 1: Payday Forecaster */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <SpotlightCard className="p-6 space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border-2 flex items-center justify-center text-accent">
                <CalendarClock className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                {t('featurePaydayTitle')}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {t('featurePaydayDesc')}
              </p>
            </div>

            {/* Micro-preview visual */}
            <div className="p-3 bg-surface-2 border border-border-1 rounded-xl font-mono text-xs space-y-1.5 text-text-secondary">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted uppercase">Salary Anchor</span>
                <span className="font-bold text-text-primary">25th of Month</span>
              </div>
              <div className="flex items-center justify-between text-status-amber-text">
                <span>Due before payday</span>
                <strong>RM 70.90 (3 bills)</strong>
              </div>
            </div>
          </SpotlightCard>
        </motion.div>

        {/* Feature 2: Teh Tarik Daily Burn */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <SpotlightCard className="p-6 space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border-2 flex items-center justify-center text-accent">
                <Coffee className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                {t('featureBurnTitle')}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {t('featureBurnDesc')}
              </p>
            </div>

            {/* Micro-preview visual */}
            <div className="p-3 bg-surface-2 border border-border-1 rounded-xl font-mono text-xs space-y-1.5 text-text-secondary">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted uppercase">Daily Burn</span>
                <span className="font-bold text-text-primary">RM 7.79 / day</span>
              </div>
              <div className="flex items-center justify-between text-accent">
                <span>Mamak equivalence</span>
                <strong>~3.1 Teh Tarik / day</strong>
              </div>
            </div>
          </SpotlightCard>
        </motion.div>

        {/* Feature 3: Student Optimizer (With #students anchor) */}
        <motion.div
          id="students"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="scroll-mt-20"
        >
          <SpotlightCard className="p-6 space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border-2 flex items-center justify-center text-accent">
                <GraduationCap className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-text-primary">
                  {t('featureStudentTitle')}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-accent-subtle text-accent border border-accent-border uppercase">
                  .edu.my
                </span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">
                {t('featureStudentDesc')}
              </p>
            </div>

            {/* Micro-preview visual */}
            <div className="p-3 bg-status-emerald-surface border border-status-emerald-border rounded-xl font-mono text-xs space-y-1.5 text-status-emerald-text">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase">Spotify Student</span>
                <strong className="text-text-primary">RM 8.50/mo (Save RM 7.40)</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase">Apple Music Student</span>
                <strong className="text-text-primary">RM 8.00/mo (Save RM 8.00)</strong>
              </div>
            </div>
          </SpotlightCard>
        </motion.div>

        {/* Feature 4: Renewal Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <SpotlightCard className="p-6 space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border-2 flex items-center justify-center text-accent">
                <BellRing className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                {t('featureAlertsTitle')}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {t('featureAlertsDesc')}
              </p>
            </div>

            {/* Micro-preview visual */}
            <div className="p-3 bg-surface-2 border border-border-1 rounded-xl font-mono text-xs space-y-1.5 text-text-secondary">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted uppercase">Reminder Timing</span>
                <span className="text-text-primary">7 Days · 1 Day · Day-of</span>
              </div>
              <div className="text-[11px] text-text-faint">
                Deterministic dispatch · Never miss free trial cancellations
              </div>
            </div>
          </SpotlightCard>
        </motion.div>
      </div>
    </section>
  );
}
