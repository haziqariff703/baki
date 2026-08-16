'use client';

import { useTranslations } from 'next-intl';
import { Search, Shield, User } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header({ title }: { title?: string }) {
  const tNav = useTranslations('Nav');

  return (
    <header className="h-16 border-b border-[#222] bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between w-full">
      {/* Title / Search */}
      <div className="flex items-center space-x-4 flex-1 max-w-xl overflow-hidden">
        <h1 className="text-sm font-semibold text-white tracking-tight shrink-0 truncate max-w-[150px] sm:max-w-none">
          {title || tNav('workspace')}
        </h1>

        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input
            type="text"
            placeholder="Search subscriptions, merchants, or rules..."
            className="w-full bg-[#141414] text-[#ededed] text-xs rounded-lg pl-9 pr-4 py-2 border border-[#333] focus:border-[#555] focus:bg-[#1a1a1a] outline-none transition-all"
          />
        </div>
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center space-x-3">
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded border border-[#166534] bg-[#0f1f14] text-[#4ade80] text-[10px] font-semibold uppercase tracking-wider">
          <Shield className="w-3 h-3" />
          <span>PDPA Compliant</span>
        </div>

        <LanguageSwitcher />

        <div className="w-8 h-8 rounded-full bg-[#141414] border border-[#333] flex items-center justify-center text-[#888] cursor-pointer hover:text-white hover:border-[#555] transition-colors">
          <User className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
}
