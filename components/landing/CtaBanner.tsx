'use client';

/**
 * High-Converting Bottom CTA Banner.
 *
 * Swiss Minimalist & Focused:
 * - Direct action point to start managing subscriptions.
 * - Subtle Baki Amber border and crisp typography.
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { SpotlightCard } from '@/components/landing/SpotlightCard';

export function CtaBanner() {
  const t = useTranslations('Landing');

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="pt-6"
    >
      <SpotlightCard className="p-8 sm:p-12 text-center space-y-6 max-w-4xl mx-auto border-border-2">
        <div className="space-y-3 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-text-primary">
            {t('ctaBannerTitle')}
          </h2>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            {t('ctaBannerSub')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-accent text-surface-0 font-bold text-sm hover:bg-accent-hover transition-all shadow-xs active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span>{t('ctaBannerBtn')}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="pt-2 flex items-center justify-center gap-2 text-xs font-mono text-text-faint">
          <ShieldCheck className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
          <span>Free Forever · No Credit Card Required · PDPA 2010 Protected</span>
        </div>
      </SpotlightCard>
    </motion.section>
  );
}
