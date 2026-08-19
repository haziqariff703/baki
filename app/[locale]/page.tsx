import { useTranslations } from 'next-intl';
import Navbar from '@/components/shared/Navbar';
import ValueEvaluator from '@/components/landing/ValueEvaluator';
import ParserSteps from '@/components/landing/ParserSteps';
import FeatureGrid from '@/components/landing/FeatureGrid';
import { Link } from '@/i18n/routing';
import { ArrowRight } from 'lucide-react';

/**
 * Marketing landing page — hero, interactive value evaluator, parser explainer,
 * feature grid, and footer. Server Component for fast first paint; the
 * interactive evaluator is a Client Component imported below.
 */
export default function LandingPage() {
  const tLanding = useTranslations('Landing');
  const tCommon = useTranslations('Common');

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary font-sans flex flex-col overflow-x-hidden w-full">
      <Navbar variant="public" title={tLanding('heroTitle')} />

      <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8 md:space-y-10">
        {/* Hero */}
        <div className="text-center space-y-4 max-w-3xl mx-auto pt-4">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-[-0.02em] leading-[1.1] text-text-primary">
            {tLanding('heroTitle')}
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed max-w-2xl mx-auto">
            {tLanding('heroSubtitle')}
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-border-3 bg-surface-3 text-text-primary text-sm font-medium hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span>{tCommon('openApp')}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="text-sm text-text-muted underline underline-offset-4 decoration-border-3 hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              {tLanding('signInCta')}
            </Link>
          </div>
        </div>

        {/* Interactive value evaluator */}
        <ValueEvaluator />

        {/* Statement parser explainer */}
        <ParserSteps />

        {/* Feature showcase */}
        <FeatureGrid />

        {/* Footer */}
        <footer className="border-t border-border-1 pt-8 pb-12 text-center text-xs text-text-faint space-y-2">
          <p>{tLanding('footerDisclaimer')}</p>
          <p>{tLanding('footerCopyright')}</p>
        </footer>
      </main>
    </div>
  );
}
