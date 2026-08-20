import { useTranslations } from 'next-intl';
import Navbar from '@/components/shared/Navbar';
import { HeroStudio } from '@/components/landing/HeroStudio';
import { MarqueeTicker } from '@/components/landing/MarqueeTicker';
import { WorkflowSteps } from '@/components/landing/WorkflowSteps';
import { AsymmetricBento } from '@/components/landing/AsymmetricBento';
import ValueEvaluator from '@/components/landing/ValueEvaluator';
import { ArchitecturalComparison } from '@/components/landing/ArchitecturalComparison';
import { HorizonCta } from '@/components/landing/HorizonCta';

/**
 * Marketing Landing Page — Awwwards-Level Architectural Showcase for Baki.
 *
 * Swiss Minimalist & Studio Fintech Aesthetic:
 * - Split-screen hero with interactive live statement scanner.
 * - Kinetic Malaysian subscription marquee stream.
 * - 4-quadrant asymmetrical bento grid with real-time interactive micro-tools.
 * - Interactive 5-pillar score matrix demo & terminal comparison ledger.
 */
export default function LandingPage() {
  const tLanding = useTranslations('Landing');

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary font-sans flex flex-col overflow-x-hidden w-full scroll-smooth">
      {/* Public Navigation Header */}
      <Navbar variant="public" />

      {/* 1. Split-Screen Studio Hero */}
      <div className="px-4 sm:px-6 md:px-10 max-w-7xl mx-auto w-full">
        <HeroStudio />
      </div>

      {/* 2. Kinetic Malaysian Subscription Stream */}
      <MarqueeTicker />

      {/* Main Content Body */}
      <main className="flex-1 px-4 sm:px-6 md:px-10 max-w-7xl mx-auto w-full space-y-16 md:space-y-24 py-12 md:py-16">
        {/* 3. 3-Step Ingestion & Human Control Workflow */}
        <WorkflowSteps />

        {/* 4. Asymmetric Bento (Runway Simulator, Student Hub, Shredder, 5-Pillars) */}
        <AsymmetricBento />

        {/* 5. Interactive Live 5-Pillar Score Matrix Demo */}
        <ValueEvaluator />

        {/* 6. Architectural Terminal Comparison Matrix */}
        <ArchitecturalComparison />

        {/* 7. Kinetic Conversion Horizon */}
        <HorizonCta />

        {/* 8. Compliant Studio Footer */}
        <footer className="border-t border-border-1 pt-12 pb-16 text-center text-xs text-text-faint space-y-3 font-mono">
          <p className="max-w-3xl mx-auto leading-relaxed">
            {tLanding('footerDisclaimer')}
          </p>
          <p>{tLanding('footerCopyright')}</p>
        </footer>
      </main>
    </div>
  );
}
