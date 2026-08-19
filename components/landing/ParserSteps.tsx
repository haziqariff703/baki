/**
 * Statement parser — honest 3-step explainer.
 *
 * Non-functional by design: no fake upload form, no fake detections. Each step
 * is a static card with an icon, title, and description. The final step links
 * to the real review queue. Data-hygiene note is rendered as a ledger row.
 */

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { UploadCloud, ScanSearch, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ParserSteps() {
  const t = useTranslations('Landing');

  return (
    <section
      aria-labelledby="parser-heading"
      className="bg-surface-1 border border-border-1 rounded-xl overflow-hidden"
    >
      <div className="p-6 md:p-8 space-y-6">
        <div className="border-b border-border-1 pb-4">
          <h2
            id="parser-heading"
            className="text-xl font-semibold tracking-[-0.01em] leading-[1.25] text-text-primary"
          >
            {t('parserTitle')}
          </h2>
          <p className="text-sm text-text-muted mt-1">{t('parserSubtitle')}</p>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <li className="bg-surface-2 border border-border-1 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs text-text-faint">01</span>
              <UploadCloud className="w-4 h-4 text-text-muted" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-text-primary">
              {t('stepUploadTitle')}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              {t('stepUploadDesc')}
            </p>
          </li>

          <li className="bg-surface-2 border border-border-1 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs text-text-faint">02</span>
              <ScanSearch className="w-4 h-4 text-text-muted" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-text-primary">
              {t('stepDetectTitle')}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              {t('stepDetectDesc')}
            </p>
          </li>

          <li className="bg-surface-2 border border-border-1 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs text-text-faint">03</span>
              <CheckCircle2 className="w-4 h-4 text-text-muted" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-text-primary">
              {t('stepConfirmTitle')}
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              {t('stepConfirmDesc')}
            </p>
            <Link
              href="/review"
              className="inline-flex items-center gap-1.5 text-sm text-text-muted underline underline-offset-4 decoration-border-3 hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded pt-1"
            >
              {t('stepConfirmLink')}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </li>
        </ol>

        <div className="border-t border-border-1 pt-3">
          <p className="text-xs text-text-faint font-mono uppercase tracking-wider">
            {t('parserHygiene')}
          </p>
        </div>
      </div>
    </section>
  );
}
