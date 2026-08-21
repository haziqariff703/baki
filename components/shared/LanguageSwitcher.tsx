'use client';

/**
 * Language Switcher component.
 *
 * Implements seamless toggling between English (en-MY) and Bahasa Melayu (ms-MY)
 * using next-intl locale routing (AGENTS.md §16).
 * Styled with Baki DESIGN.md tokens without emojis or decorative clutter.
 */

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLanguage = (newLocale: string) => {
    if (newLocale !== locale) {
      router.replace(pathname, { locale: newLocale });
    }
  };

  const buttonClass = (active: boolean) =>
    cn(
      'px-2 py-0.5 rounded-lg transition-colors text-xs font-mono',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
      active
        ? 'bg-accent text-surface-0 font-semibold shadow-xs'
        : 'text-text-muted hover:text-text-primary hover:bg-surface-3',
    );

  return (
    <div
      role="group"
      aria-label="Language selection"
      className="flex items-center space-x-0.5 bg-surface-2/60 p-0.5 rounded-xl border border-border-2 text-xs font-medium"
    >
      <Globe className="w-3.5 h-3.5 text-text-faint ml-1.5 mr-0.5 shrink-0" aria-hidden="true" />
      <button
        type="button"
        onClick={() => toggleLanguage('en')}
        aria-pressed={locale === 'en'}
        className={buttonClass(locale === 'en')}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => toggleLanguage('ms')}
        aria-pressed={locale === 'ms'}
        className={buttonClass(locale === 'ms')}
      >
        BM
      </button>
    </div>
  );
}
