'use client';

/**
 * Print / Save PDF Monthly Summary Trigger (Cash Flow).
 *
 * Provides a 1-click trigger to generate a clean, printable PDF statement
 * of the user's monthly commitments and cash flow.
 */

import { useTranslations } from 'next-intl';
import { Printer } from 'lucide-react';

export function PrintSummaryButton() {
  const t = useTranslations('CashFlow');

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border-2 bg-surface-1 hover:bg-surface-2 text-text-secondary hover:text-text-primary text-xs font-medium transition-colors shadow-xs print:hidden"
    >
      <Printer className="w-3.5 h-3.5 text-text-faint" aria-hidden="true" />
      <span>{t('printCta')}</span>
    </button>
  );
}
