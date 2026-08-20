'use client';

/**
 * Competitive Comparison Matrix: Baki vs Bank Apps vs Excel.
 *
 * Swiss Minimalist & Honest:
 * - Highlights Baki's clear privacy, deterministic 0–100 score, student optimizer, and automated ingestion.
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

export function ComparisonTable() {
  const t = useTranslations('Landing');

  const rows = [
    {
      title: t('comp1'),
      baki: true,
      bank: false,
      sheet: false,
    },
    {
      title: t('comp2'),
      baki: true,
      bank: false,
      sheet: false,
    },
    {
      title: t('comp3'),
      baki: true,
      bank: false,
      sheet: true,
    },
    {
      title: t('comp4'),
      baki: true,
      bank: false,
      sheet: false,
    },
    {
      title: t('comp5'),
      baki: true,
      bank: false,
      sheet: false,
    },
    {
      title: t('comp6'),
      baki: true,
      bank: false,
      sheet: true,
    },
  ];

  return (
    <motion.section
      id="privacy"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="space-y-6 pt-6 scroll-mt-20"
    >
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
          {t('comparisonHeading')}
        </h2>
        <p className="text-sm text-text-muted leading-relaxed">
          {t('comparisonSub')}
        </p>
      </div>

      <div className="border border-border-1 bg-surface-1 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse min-w-[540px]">
            <thead>
              <tr className="border-b border-border-1 bg-surface-2/60 text-text-secondary font-sans text-xs uppercase">
                <th className="py-3.5 px-4 sm:px-6 font-semibold w-2/5">{t('compFeature')}</th>
                <th className="py-3.5 px-4 font-bold text-accent text-center bg-accent-subtle/30 w-1/5">
                  {t('compBaki')}
                </th>
                <th className="py-3.5 px-4 font-semibold text-text-muted text-center w-1/5">
                  {t('compBank')}
                </th>
                <th className="py-3.5 px-4 font-semibold text-text-muted text-center w-1/5">
                  {t('compSheet')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-1">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-surface-2/40 transition-colors">
                  <td className="py-3 px-4 sm:px-6 font-sans text-xs sm:text-sm font-medium text-text-primary">
                    {row.title}
                  </td>
                  <td className="py-3 px-4 text-center bg-accent-subtle/20">
                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent/20 text-accent mx-auto">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.bank ? (
                      <Check className="w-4 h-4 text-text-secondary mx-auto" aria-hidden="true" />
                    ) : (
                      <X className="w-4 h-4 text-text-faint mx-auto opacity-60" aria-hidden="true" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.sheet ? (
                      <Check className="w-4 h-4 text-text-secondary mx-auto" aria-hidden="true" />
                    ) : (
                      <X className="w-4 h-4 text-text-faint mx-auto opacity-60" aria-hidden="true" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.section>
  );
}
