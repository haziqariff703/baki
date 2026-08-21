'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Printer, FileText, X, Download, Eye } from 'lucide-react';
import { CashFlowPrintReport } from './CashFlowPrintReport';
import type { SubscriptionSchema } from '@/lib/validation';
import type { UpcomingRenewal } from '@/features/cash-flow';
import type { UserProfile } from '@/lib/validation/profile';

interface PrintSummaryButtonProps {
  readonly subscriptions: readonly SubscriptionSchema[];
  readonly renewals: readonly UpcomingRenewal[];
  readonly availableBalanceSen: number;
  readonly profile?: UserProfile | null;
}

export function PrintSummaryButton({
  subscriptions,
  renewals,
  availableBalanceSen,
  profile,
}: PrintSummaryButtonProps) {
  const t = useTranslations('CashFlow');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleDirectPrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          aria-label={t('previewTitle')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-2 bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-text-primary text-xs font-medium transition-colors shadow-xs"
        >
          <Eye className="w-3.5 h-3.5 text-text-faint" aria-hidden="true" />
          <span>{t('previewTitle')}</span>
        </button>

        <button
          type="button"
          onClick={handleDirectPrint}
          aria-label={t('printCta')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent font-medium text-xs transition-colors shadow-xs"
        >
          <Printer className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t('printCta')}</span>
        </button>
      </div>

      {/* Interactive Statement Preview Modal */}
      {isPreviewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-modal-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 print:hidden overflow-y-auto animate-in fade-in duration-150"
        >
          <div className="bg-surface-1 border border-border-2 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-border-1 flex items-center justify-between gap-4 bg-surface-2/60 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <h3 id="preview-modal-title" className="text-sm font-semibold text-text-primary truncate">
                    {t('previewTitle')}
                  </h3>
                  <p className="text-xs text-text-muted truncate">{t('previewSubtitle')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDirectPrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-surface-0 hover:bg-accent-hover font-semibold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t('printConfirmCta')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  aria-label={t('closePreview')}
                  className="p-1.5 rounded-lg border border-border-2 bg-surface-2 hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable White Paper View */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-surface-0/50 flex justify-center">
              <div className="w-full max-w-4xl shadow-xl rounded-xl overflow-hidden border border-slate-200 bg-white">
                <CashFlowPrintReport
                  subscriptions={subscriptions}
                  renewals={renewals}
                  availableBalanceSen={availableBalanceSen}
                  profile={profile}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
