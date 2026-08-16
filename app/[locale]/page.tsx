'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Header from '@/components/shared/Header';
import { DecryptedText } from '@/components/ui/DecryptedText';
import { SpecularButton } from '@/components/ui/SpecularButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator,
  UploadCloud,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Layers,
  Zap,
} from 'lucide-react';

export default function WorkspacePage() {
  const tLanding = useTranslations('Landing');
  const tCommon = useTranslations('Common');

  // Interactive Demo Evaluator State
  const [activeTab, setActiveTab] = useState<'evaluator' | 'parser' | 'overview'>('evaluator');
  const [providerName, setProviderName] = useState('Spotify Premium');
  const [monthlyAmount, setMonthlyAmount] = useState('15.90');

  // 5 Criteria Ratings (1 to 5)
  const [usage, setUsage] = useState(5);
  const [necessity, setNecessity] = useState(3);
  const [affordability, setAffordability] = useState(5);
  const [uniqueness, setUniqueness] = useState(3);
  const [satisfaction, setSatisfaction] = useState(4);

  // Deterministic Value Score Calculation: Sum((rating / 5) * weight) * 100
  // Weights: Usage 25%, Necessity 25%, Affordability 20%, Uniqueness 15%, Satisfaction 15%
  const score = Math.round(
    ((usage / 5) * 0.25 +
      (necessity / 5) * 0.25 +
      (affordability / 5) * 0.2 +
      (uniqueness / 5) * 0.15 +
      (satisfaction / 5) * 0.15) *
      100
  );

  // Safeguard Decision Tree
  let recommendation = { label: tCommon('Keep'), color: 'emerald', code: 'keep' };
  if (score < 35) {
    recommendation = { label: tCommon('Cancel'), color: 'rose', code: 'cancel' };
  } else if (score < 55) {
    recommendation = { label: tCommon('Pause'), color: 'amber', code: 'pause' };
  } else if (score < 75) {
    recommendation = { label: tCommon('Review'), color: 'blue', code: 'review' };
  }

  if (necessity >= 4 && affordability >= 4 && score < 55) {
    recommendation = { label: `${tCommon('Review')} (Essential)`, color: 'blue', code: 'review' };
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] font-sans flex flex-col overflow-x-hidden w-full">
      <Header title={tLanding('heroTitle')} />

      <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8 md:space-y-10">
          {/* Hero Header Section */}
          <div className="text-center space-y-4 max-w-3xl mx-auto pt-4">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              <DecryptedText text={tLanding('heroTitle')} />
            </h1>

            <p className="text-sm md:text-base text-[#a1a1aa] leading-relaxed max-w-2xl mx-auto">
              {tLanding('heroSubtitle')}
            </p>
          </div>

          {/* Central Tool Workspace Card */}
          <div className="bg-[#0f0f0f] border border-[#222222] rounded-2xl shadow-2xl overflow-hidden">
            {/* Tab Bar Header */}
            <div className="border-b border-[#222222] bg-[#0a0a0a] p-3">
              {/* Mobile Dropdown */}
              <div className="block md:hidden">
                <Select value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
                  <SelectTrigger className="w-full bg-[#141414] text-white border-[#333333] rounded-xl h-12 focus:ring-[#555] font-semibold text-sm px-4">
                    <SelectValue placeholder="Select tab" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141414] border-[#333333] text-white">
                    <SelectItem value="evaluator" className="font-semibold text-sm py-2.5 focus:bg-[#222222] focus:text-white">{tLanding('tabEvaluator')}</SelectItem>
                    <SelectItem value="parser" className="font-semibold text-sm py-2.5 focus:bg-[#222222] focus:text-white">{tLanding('tabParser')}</SelectItem>
                    <SelectItem value="overview" className="font-semibold text-sm py-2.5 focus:bg-[#222222] focus:text-white">{tLanding('tabOverview')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Desktop Tabs */}
              <div className="hidden md:flex items-center space-x-3 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                <SpecularButton
                  active={activeTab === 'evaluator'}
                  onClick={() => setActiveTab('evaluator')}
                  className="shrink-0 text-xs py-2 px-4"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  <span>{tLanding('tabEvaluator')}</span>
                </SpecularButton>

                <SpecularButton
                  active={activeTab === 'parser'}
                  onClick={() => setActiveTab('parser')}
                  className="shrink-0 text-xs py-2 px-4"
                >
                  <UploadCloud className="w-4 h-4 mr-2" />
                  <span>{tLanding('tabParser')}</span>
                </SpecularButton>

                <SpecularButton
                  active={activeTab === 'overview'}
                  onClick={() => setActiveTab('overview')}
                  className="shrink-0 text-xs py-2 px-4"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  <span>{tLanding('tabOverview')}</span>
                </SpecularButton>
              </div>
            </div>

            {/* Tab 1: Interactive Value Evaluator */}
            {activeTab === 'evaluator' && (
              <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Form Input Column */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="border-b border-[#222] pb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-[#888]" />
                      {tLanding('evaluatorTitle')}
                    </h2>
                    <p className="text-xs text-[#888] mt-1">{tLanding('evaluatorSubtitle')}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#888] mb-1.5">
                        {tLanding('providerName')}
                      </label>
                      <input
                        type="text"
                        value={providerName}
                        onChange={(e) => setProviderName(e.target.value)}
                        className="w-full bg-[#141414] border border-[#333] rounded-xl px-3 py-2 text-xs text-white focus:border-[#555] outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#888] mb-1.5">
                        {tLanding('monthlyPrice')}
                      </label>
                      <input
                        type="number"
                        step="0.10"
                        value={monthlyAmount}
                        onChange={(e) => setMonthlyAmount(e.target.value)}
                        className="w-full bg-[#141414] border border-[#333] rounded-xl px-3 py-2 text-xs text-white focus:border-[#555] outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* 5 Rating Sliders */}
                  <div className="space-y-4 pt-2">
                    {[
                      { label: tLanding('usage'), val: usage, set: setUsage, pct: '25%' },
                      { label: tLanding('necessity'), val: necessity, set: setNecessity, pct: '25%' },
                      { label: tLanding('affordability'), val: affordability, set: setAffordability, pct: '20%' },
                      { label: tLanding('uniqueness'), val: uniqueness, set: setUniqueness, pct: '15%' },
                      { label: tLanding('satisfaction'), val: satisfaction, set: setSatisfaction, pct: '15%' },
                    ].map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-[#888]">{item.label} ({item.pct})</span>
                          <span className="text-white font-bold">{item.val} / 5</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={item.val}
                          onChange={(e) => item.set(Number(e.target.value))}
                          className="w-full accent-[#444] cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Live Score Output Column */}
                <div className="lg:col-span-5 bg-[#141414] border border-[#222] rounded-xl p-6 flex flex-col justify-between space-y-6">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-[#666]">
                      Engine Output
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1">{providerName || 'Subscription'}</h3>
                    <p className="text-xs text-[#888]">MYR {monthlyAmount || '0.00'} / month</p>
                  </div>

                  <div className="text-center py-4 bg-[#0a0a0a] rounded-xl border border-[#222]">
                    <span className="text-xs font-medium text-[#888] block mb-1">
                      {tLanding('resultScore')}
                    </span>
                    <div className="text-5xl font-extrabold text-white tracking-tight">
                      {score}
                      <span className="text-base font-normal text-[#555] ml-1">/ 100</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-xs font-medium text-[#888] block">
                      {tLanding('resultAction')}
                    </span>

                    <div
                      className={`p-3 rounded-xl border flex items-center space-x-3 ${
                        recommendation.color === 'emerald'
                          ? 'bg-[#0f1f14] border-[#166534] text-[#4ade80]'
                          : recommendation.color === 'blue'
                          ? 'bg-[#0f172a] border-[#1e3a8a] text-[#60a5fa]'
                          : recommendation.color === 'amber'
                          ? 'bg-[#422006] border-[#78350f] text-[#fbbf24]'
                          : 'bg-[#4c0519] border-[#881337] text-[#f43f5e]'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <div className="text-xs font-bold uppercase tracking-wide">
                        {recommendation.label}
                      </div>
                    </div>

                    <div className="text-[11px] text-[#666] leading-normal flex items-start space-x-1.5 pt-2">
                      <ShieldCheck className="w-4 h-4 text-[#444] shrink-0 mt-0.5" />
                      <span>
                        Calculated deterministically via 5 weighted criteria with decision-tree safeguard rules applied.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Statement Parser Demo */}
            {activeTab === 'parser' && (
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-[#333] flex items-center justify-center text-[#888] mx-auto">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-lg font-bold text-white">{tLanding('feature2Title')}</h3>
                  <p className="text-xs text-[#888] leading-relaxed">{tLanding('feature2Desc')}</p>
                </div>

                <div className="max-w-lg mx-auto border-2 border-dashed border-[#333] rounded-2xl p-8 bg-[#0a0a0a] hover:border-[#555] transition-colors cursor-pointer">
                  <UploadCloud className="w-8 h-8 text-[#555] mx-auto mb-2" />
                  <span className="text-xs font-semibold text-[#ccc] block">
                    Drop CSV or PDF statement files here to extract transactions
                  </span>
                  <span className="text-[11px] text-[#666] block mt-1">
                    Papa Parse & PDF.js • Files deleted immediately after processing
                  </span>
                </div>
              </div>
            )}

            {/* Tab 3: Live Overview Teaser */}
            {activeTab === 'overview' && (
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#141414] p-5 rounded-xl border border-[#333]">
                    <span className="text-xs text-[#888] font-medium">{tCommon('MonthlyCommitment')}</span>
                    <p className="text-2xl font-bold text-white mt-1">MYR 184.50</p>
                  </div>
                  <div className="bg-[#141414] p-5 rounded-xl border border-[#333]">
                    <span className="text-xs text-[#888] font-medium">Annualised Total</span>
                    <p className="text-2xl font-bold text-white mt-1">MYR 2,214.00</p>
                  </div>
                  <div className="bg-[#141414] p-5 rounded-xl border border-[#333]">
                    <span className="text-xs text-[#888] font-medium">Average Value Score</span>
                    <p className="text-2xl font-bold text-white mt-1">78 / 100</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Feature Showcase Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
            <div className="bg-[#0f0f0f] border border-[#222] p-6 rounded-2xl space-y-3 hover:border-[#444] transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#333] flex items-center justify-center text-white">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">{tLanding('feature1Title')}</h3>
              <p className="text-xs text-[#888] leading-relaxed">{tLanding('feature1Desc')}</p>
            </div>

            <div className="bg-[#0f0f0f] border border-[#222] p-6 rounded-2xl space-y-3 hover:border-[#444] transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#333] flex items-center justify-center text-white">
                <UploadCloud className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">{tLanding('feature2Title')}</h3>
              <p className="text-xs text-[#888] leading-relaxed">{tLanding('feature2Desc')}</p>
            </div>

            <div className="bg-[#0f0f0f] border border-[#222] p-6 rounded-2xl space-y-3 hover:border-[#444] transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#333] flex items-center justify-center text-white">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">{tLanding('feature3Title')}</h3>
              <p className="text-xs text-[#888] leading-relaxed">{tLanding('feature3Desc')}</p>
            </div>

            <div className="bg-[#0f0f0f] border border-[#222] p-6 rounded-2xl space-y-3 hover:border-[#444] transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#333] flex items-center justify-center text-white">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">{tLanding('feature4Title')}</h3>
              <p className="text-xs text-[#888] leading-relaxed">{tLanding('feature4Desc')}</p>
            </div>
          </div>

          {/* Footer Disclaimer */}
          <footer className="border-t border-[#222] pt-8 pb-12 text-center text-xs text-[#555] space-y-2">
            <p>
              Baki is a non-directive personal decision-support system. Recommendations are advisory and do not constitute regulated financial advice under Bank Negara Malaysia or Securities Commission Malaysia guidelines.
            </p>
            <p>© 2026 Baki System • Privacy by Design • PostgreSQL Row Level Security Enforced</p>
          </footer>
        </main>
    </div>
  );
}
