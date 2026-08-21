/**
 * Feature grid — four plain icon + title + body cards.
 * No icon-in-box treatment per DESIGN.md §6.
 */

import { useTranslations } from 'next-intl';
import { Zap, UploadCloud, Layers, Lock } from 'lucide-react';

export default function FeatureGrid() {
  const t = useTranslations('Landing');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pt-2">
      <div className="bg-surface-1 border border-border-1 p-6 rounded-xl space-y-3 hover:border-border-3 transition-colors">
        <Zap className="w-5 h-5 text-text-muted" aria-hidden="true" />
        <h3 className="text-base font-semibold text-text-primary">{t('feature1Title')}</h3>
        <p className="text-sm text-text-muted leading-relaxed">{t('feature1Desc')}</p>
      </div>
      <div className="bg-surface-1 border border-border-1 p-6 rounded-xl space-y-3 hover:border-border-3 transition-colors">
        <UploadCloud className="w-5 h-5 text-text-muted" aria-hidden="true" />
        <h3 className="text-base font-semibold text-text-primary">{t('feature2Title')}</h3>
        <p className="text-sm text-text-muted leading-relaxed">{t('feature2Desc')}</p>
      </div>
      <div className="bg-surface-1 border border-border-1 p-6 rounded-xl space-y-3 hover:border-border-3 transition-colors">
        <Layers className="w-5 h-5 text-text-muted" aria-hidden="true" />
        <h3 className="text-base font-semibold text-text-primary">{t('feature3Title')}</h3>
        <p className="text-sm text-text-muted leading-relaxed">{t('feature3Desc')}</p>
      </div>
      <div className="bg-surface-1 border border-border-1 p-6 rounded-xl space-y-3 hover:border-border-3 transition-colors">
        <Lock className="w-5 h-5 text-text-muted" aria-hidden="true" />
        <h3 className="text-base font-semibold text-text-primary">{t('feature4Title')}</h3>
        <p className="text-sm text-text-muted leading-relaxed">{t('feature4Desc')}</p>
      </div>
    </div>
  );
}
