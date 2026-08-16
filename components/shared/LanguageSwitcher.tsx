'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLanguage = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center space-x-1 bg-[#141414] p-1 rounded-lg border border-[#333] text-xs font-medium">
      <Globe className="w-3.5 h-3.5 text-[#555] ml-1" />
      <button
        onClick={() => toggleLanguage('en')}
        className={`px-2 py-1 rounded transition-colors ${
          locale === 'en'
            ? 'bg-[#222] text-white shadow-sm font-semibold'
            : 'text-[#888] hover:text-white'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => toggleLanguage('ms')}
        className={`px-2 py-1 rounded transition-colors ${
          locale === 'ms'
            ? 'bg-[#222] text-white shadow-sm font-semibold'
            : 'text-[#888] hover:text-white'
        }`}
      >
        MS
      </button>
    </div>
  );
}
