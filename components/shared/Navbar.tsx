'use client';

import { useState, type ComponentPropsWithoutRef, type ComponentRef } from 'react';
import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';
import { Search, User, ArrowRight, Menu, X } from 'lucide-react';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import LanguageSwitcher from './LanguageSwitcher';
import { useSearch } from './SearchContext';

/**
 * Baki navbar — shadcn-style, two variants.
 *
 * - `public` (landing + login): logo/title, public nav links, language
 *   switcher, and "Sign in" / "Open app" CTAs. No search, no avatar.
 * - `app` (dashboard/review/settings): logo/title, live search (SearchContext),
 *   app nav links with active-tab state, language switcher, avatar → /settings.
 *
 * The search input is live: when a page shell mounts a `SearchProvider`
 * (e.g. the dashboard), typing filters that page's ledger; without a provider
 * the input is a harmless, disabled no-op. On mobile the search moves into the
 * drawer so it stays reachable (the desktop input is `hidden sm:block`).
 */

/* -------------------------------------------------------------------------- */
/*  Nav item model                                                             */
/* -------------------------------------------------------------------------- */

interface NavItem {
  readonly href: string;
  readonly label: string;
}

/** Quiet active-tab treatment per DESIGN.md §6 — border-3 + surface shift. */
function useNavLinkClass() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (href: string) =>
    cn(
      'inline-flex items-center px-3 py-2 rounded-xl text-xs font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
      isActive(href)
        ? 'border border-border-3 bg-surface-3 text-text-primary'
        : 'border border-transparent text-text-muted hover:text-text-primary hover:bg-surface-3',
    );

  return { isActive, linkClass };
}

/* -------------------------------------------------------------------------- */
/*  shadcn-style primitive: NavigationLink                                     */
/* -------------------------------------------------------------------------- */

interface NavigationLinkProps extends ComponentPropsWithoutRef<typeof Link> {
  readonly active?: boolean;
}

/**
 * A forwardRef nav link with the Baki active-tab treatment. `aria-current`
 * is applied for the active route so state is never colour-only.
 */
const NavigationLink = forwardRef<ComponentRef<typeof Link>, NavigationLinkProps>(
  ({ className, active, ...props }, ref) => (
    <Link
      ref={ref}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex items-center px-3 py-2 rounded-xl text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        active
          ? 'border border-border-3 bg-surface-3 text-text-primary'
          : 'border border-transparent text-text-muted hover:text-text-primary hover:bg-surface-3',
        className,
      )}
      {...props}
    />
  ),
);
NavigationLink.displayName = 'NavigationLink';

/* -------------------------------------------------------------------------- */
/*  Logo / wordmark                                                            */
/* -------------------------------------------------------------------------- */

function Brandmark({ title }: { readonly title?: string }) {
  const tNav = useTranslations('Nav');
  return (
    <Link
      href="/"
      className="flex items-baseline gap-2 shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="text-sm font-semibold text-text-primary tracking-tight">
        Baki
      </span>
      <span className="hidden sm:block text-xs text-text-faint truncate max-w-[140px] md:max-w-none">
        {title ?? tNav('workspace')}
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Search field (app variant)                                                 */
/* -------------------------------------------------------------------------- */

export function SearchField({ id }: { readonly id?: string }) {
  const tNav = useTranslations('Nav');
  const search = useSearch();
  return (
    <div className="relative w-full">
      <Search
        className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={search?.term ?? ''}
        onChange={(e) => search?.setTerm(e.target.value)}
        placeholder={tNav('searchPlaceholder')}
        aria-label={tNav('searchPlaceholder')}
        disabled={!search}
        className={cn(
          'w-full bg-surface-2 text-text-primary text-sm rounded-xl pl-9 pr-4 py-2',
          'border border-border-2 transition-colors',
          'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
          'disabled:opacity-50',
        )}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  CTAs                                                                       */
/* -------------------------------------------------------------------------- */

function SignInLink({ className }: { readonly className?: string }) {
  const tNav = useTranslations('Nav');
  return (
    <Link
      href="/login"
      className={cn(
        'inline-flex items-center px-3 py-2 rounded-xl text-xs font-medium text-text-muted',
        'border border-transparent transition-colors hover:text-text-primary hover:bg-surface-3',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        className,
      )}
    >
      {tNav('signIn')}
    </Link>
  );
}

function OpenAppLink({ className }: { readonly className?: string }) {
  const tCommon = useTranslations('Common');
  return (
    <Link
      href="/dashboard"
      className={cn(
        'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium',
        'border border-border-3 bg-surface-3 text-text-primary transition-colors hover:bg-surface-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        className,
      )}
    >
      <span>{tCommon('openApp')}</span>
      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  shadcn-style primitive: Navbar mobile drawer (Sheet)                       */
/* -------------------------------------------------------------------------- */

interface NavbarSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly navItems: readonly NavItem[];
  readonly navLabel: string;
  readonly isActive: (href: string) => boolean;
  readonly linkClass: (href: string) => string;
  readonly showSearch: boolean;
  readonly showSignIn: boolean;
}

/**
 * Mobile drawer. Keyboard accessible: the toggle exposes `aria-expanded` /
 * `aria-controls`, and the drawer closes on selection. Contains the mobile
 * search field (app variant) plus the nav links and CTAs.
 */
function NavbarSheet({
  open,
  onOpenChange,
  navItems,
  navLabel,
  isActive,
  linkClass,
  showSearch,
  showSignIn,
}: NavbarSheetProps) {
  if (!open) return null;
  return (
    <div
      id="mobile-nav"
      className="md:hidden border-t border-border-1 bg-surface-0 px-4 pt-3 pb-4 space-y-3"
    >
      {showSearch && <SearchField id="mobile-search" />}
      <nav aria-label={navLabel} className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? 'page' : undefined}
            onClick={() => onOpenChange(false)}
            className={cn('flex w-full', linkClass(item.href))}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {showSignIn && (
        <div className="flex items-center gap-2 pt-1 border-t border-border-1">
          <SignInLink className="flex-1 justify-center border border-border-2" />
          <OpenAppLink className="flex-1 justify-center" />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Navbar                                                                     */
/* -------------------------------------------------------------------------- */

export interface NavbarProps {
  readonly title?: string;
  /**
   * `app` (default) — in-app chrome: live search + avatar + app nav.
   * `public` — landing & login: public nav links + Sign in / Open app CTAs.
   */
  readonly variant?: 'app' | 'public';
  /**
   * Controlled mobile-menu open state for the `app` variant. When supplied,
   * the AppShell owns the drawer; the hamburger toggles the sidebar overlay
   * drawer instead of the local NavbarSheet. Optional for backward
   * compatibility with the `public` variant, which keeps its own sheet.
   */
  readonly mobileOpen?: boolean;
  /** Callback invoked when the mobile hamburger is clicked (app variant). */
  readonly onMenuClick?: () => void;
}

export default function Navbar({
  title,
  variant = 'app',
  mobileOpen,
  onMenuClick,
}: NavbarProps) {
  const tNav = useTranslations('Nav');
  const isPublic = variant === 'public';
  const { isActive, linkClass } = useNavLinkClass();
  const [localOpen, setLocalOpen] = useState(false);
  // When `onMenuClick` is provided (AppShell wiring), the hamburger is
  // controlled by the shell's drawer state; otherwise fall back to local state
  // so standalone usage (e.g. `public` landing) is unchanged.
  const isControlled = typeof onMenuClick === 'function';
  const menuOpen = isControlled ? (mobileOpen ?? false) : localOpen;
  const setMenuOpen = (open: boolean) => {
    if (isControlled) {
      onMenuClick?.();
    } else {
      setLocalOpen(open);
    }
  };

  const appNavItems: readonly NavItem[] = [];

  const publicNavItems: readonly NavItem[] = [
    { href: '/review', label: tNav('review') },
    { href: '/dashboard', label: tNav('dashboard') },
  ];

  const navItems = isPublic ? publicNavItems : appNavItems;
  const navLabel = isPublic ? tNav('primaryNav') : tNav('workspace');

  return (
    <header className="border-b border-border-1 bg-surface-0/80 backdrop-blur-md sticky top-0 z-30 w-full">
      <div className="h-16 px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left: brand + (app) desktop search */}
        <div className="flex items-center gap-4 flex-1 min-w-0 max-w-xl">
          <Brandmark title={title} />
          {!isPublic && (
            <div className="hidden sm:block w-full max-w-md">
              <SearchField />
            </div>
          )}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          {/* Desktop nav (public only) */}
          {isPublic && navItems.length > 0 && (
            <nav aria-label={navLabel} className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavigationLink
                  key={item.href}
                  href={item.href}
                  active={isActive(item.href)}
                >
                  {item.label}
                </NavigationLink>
              ))}
            </nav>
          )}

          <LanguageSwitcher />

          {isPublic ? (
            <>
              <div className="hidden md:flex items-center gap-2">
                <SignInLink />
                <OpenAppLink />
              </div>
              {/* Mobile toggle (public) */}
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                aria-label={menuOpen ? tNav('closeMenu') : tNav('openMenu')}
                className={cn(
                  'md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl',
                  'bg-surface-2 border border-border-2 text-text-muted transition-colors',
                  'hover:text-text-primary hover:border-border-3',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                {menuOpen ? (
                  <X className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Menu className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/settings"
                aria-label={tNav('settings')}
                className={cn(
                  'inline-flex items-center justify-center w-10 h-10 rounded-full',
                  'bg-surface-2 border border-border-2 text-text-muted transition-colors',
                  'hover:text-text-primary hover:border-border-3',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                <User className="w-4 h-4" aria-hidden="true" />
              </Link>

              {/* Mobile toggle (app) — opens the AppShell overlay sidebar drawer */}
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-controls="app-sidebar"
                aria-label={menuOpen ? tNav('closeMenu') : tNav('openMenu')}
                className={cn(
                  'md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl',
                  'bg-surface-2 border border-border-2 text-text-muted transition-colors',
                  'hover:text-text-primary hover:border-border-3',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                {menuOpen ? (
                  <X className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Menu className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* The `public` variant keeps its own push-down sheet. The `app` variant
          routes mobile nav through the AppShell overlay sidebar drawer, so it
          intentionally does not render a separate sheet here. */}
      {isPublic && (
        <NavbarSheet
          open={menuOpen}
          onOpenChange={setMenuOpen}
          navItems={navItems}
          navLabel={navLabel}
          isActive={isActive}
          linkClass={linkClass}
          showSearch={false}
          showSignIn
        />
      )}
    </header>
  );
}
