'use client';

import { useState, type ComponentPropsWithoutRef, type ComponentRef } from 'react';
import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';
import { User, ArrowRight, Menu, X } from 'lucide-react';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import LanguageSwitcher from './LanguageSwitcher';
import { NotificationBell } from '@/components/layout/NotificationBell';

/* ------------------------------------------------------------------------- */
/*  Nav item model                                                         */
/* ------------------------------------------------------------------------- */

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
      'inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
      isActive(href)
        ? 'border border-border-3 bg-surface-3 text-text-primary shadow-xs'
        : 'border border-transparent text-text-muted hover:text-text-primary hover:bg-surface-2',
    );

  return { isActive, linkClass };
}

/* ------------------------------------------------------------------------- */
/*  shadcn-style primitive: NavigationLink                                      */
/* ------------------------------------------------------------------------- */

interface NavigationLinkProps extends ComponentPropsWithoutRef<typeof Link> {
  readonly active?: boolean;
}

const NavigationLink = forwardRef<ComponentRef<typeof Link>, NavigationLinkProps>(
  ({ className, active, href, ...props }, ref) => {
    const isAnchor = typeof href === 'string' && href.startsWith('#');
    if (isAnchor) {
      return (
        <a
          href={href as string}
          className={cn(
            'inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
            'border border-transparent text-text-muted hover:text-text-primary hover:bg-surface-2',
            className,
          )}
          {...(props as any)}
        />
      );
    }
    return (
      <Link
        ref={ref}
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
          active
            ? 'border border-border-3 bg-surface-3 text-text-primary shadow-xs'
            : 'border border-transparent text-text-muted hover:text-text-primary hover:bg-surface-2',
          className,
        )}
        {...props}
      />
    );
  },
);
NavigationLink.displayName = 'NavigationLink';

/* ------------------------------------------------------------------------- */
/*  Logo / wordmark & Context Tag                                              */
/* ------------------------------------------------------------------------- */

function Brandmark({ title }: { readonly title?: string }) {
  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <Link
        href="/"
        className="flex items-center gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent group"
      >
        <span className="text-base font-bold text-text-primary tracking-tight group-hover:text-accent transition-colors">
          Baki<span className="text-accent">.</span>
        </span>
      </Link>

      {title && (
        <>
          <div className="hidden sm:block h-3.5 w-px bg-border-2" aria-hidden="true" />
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono uppercase tracking-wider bg-surface-2 text-text-faint border border-border-1">
            {title}
          </span>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/*  CTAs (public variant)                                                    */
/* ------------------------------------------------------------------------- */

function SignInLink({ className }: { readonly className?: string }) {
  const tNav = useTranslations('Nav');
  return (
    <Link
      href="/login"
      className={cn(
        'inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-medium text-text-muted',
        'border border-transparent transition-colors hover:text-text-primary hover:bg-surface-2',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        className,
      )}
    >
      {tNav('signIn')}
    </Link>
  );
}

function GetStartedLink({ className }: { readonly className?: string }) {
  const tNav = useTranslations('Nav');
  return (
    <Link
      href="/login"
      className={cn(
        'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold',
        'bg-accent text-surface-0 transition-all hover:bg-accent-hover shadow-xs active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        className,
      )}
    >
      <span>{tNav('getStarted')}</span>
      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Mobile drawer (public variant)                                             */
/* -------------------------------------------------------------------------- */

interface NavbarSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly navItems: readonly NavItem[];
  readonly navLabel: string;
  readonly isActive: (href: string) => boolean;
  readonly linkClass: (href: string) => string;
  readonly showSignIn: boolean;
}

function NavbarSheet({
  open,
  onOpenChange,
  navItems,
  navLabel,
  isActive,
  linkClass,
  showSignIn,
}: NavbarSheetProps) {
  if (!open) return null;
  return (
    <div
      id="mobile-nav"
      className="md:hidden border-t border-border-1 bg-surface-0/95 backdrop-blur-md px-4 pt-3 pb-4 space-y-3"
    >
      <nav aria-label={navLabel} className="space-y-1">
        {navItems.map((item) => {
          const isAnchor = item.href.startsWith('#');
          if (isAnchor) {
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn('flex w-full', linkClass(item.href))}
              >
                {item.label}
              </a>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              onClick={() => onOpenChange(false)}
              className={cn('flex w-full', linkClass(item.href))}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {showSignIn && (
        <div className="flex items-center gap-2 pt-2 border-t border-border-1">
          <SignInLink className="flex-1 justify-center border border-border-2" />
          <GetStartedLink className="flex-1 justify-center" />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/*  Navbar                                                                  */
/* ------------------------------------------------------------------------- */

export interface NavbarProps {
  readonly title?: string;
  readonly variant?: 'app' | 'public';
  readonly mobileOpen?: boolean;
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
    { href: '#features', label: tNav('features') },
    { href: '#how-it-works', label: tNav('howItWorks') },
    { href: '#students', label: tNav('students') },
    { href: '#demo', label: tNav('demo') },
    { href: '#privacy', label: tNav('privacy') },
  ];

  const navItems = isPublic ? publicNavItems : appNavItems;
  const navLabel = isPublic ? tNav('primaryNav') : tNav('workspace');

  return (
    <header className="border-b border-border-1 bg-surface-0/90 backdrop-blur-md sticky top-0 z-30 w-full transition-colors">
      <div className="h-14 md:h-16 px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left: Brandmark + optional section title badge */}
        <Brandmark title={title} />

        {/* Right cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isPublic && navItems.length > 0 && (
            <nav aria-label={navLabel} className="hidden md:flex items-center gap-1 mr-1">
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
              <div className="hidden md:flex items-center gap-2 ml-1">
                <SignInLink />
                <GetStartedLink />
              </div>
              {/* Mobile toggle (public) */}
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                aria-label={menuOpen ? tNav('closeMenu') : tNav('openMenu')}
                className={cn(
                  'md:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer',
                  'bg-surface-2 border border-border-2 text-text-muted transition-all',
                  'hover:text-text-primary hover:border-border-3 active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
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
              {/* Mobile toggle (app) — opens the AppShell overlay sidebar drawer */}
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-controls="app-sidebar"
                aria-label={menuOpen ? tNav('closeMenu') : tNav('openMenu')}
                className={cn(
                  'lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer',
                  'bg-surface-2 border border-border-2 text-text-muted transition-all',
                  'hover:text-text-primary hover:border-border-3 active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
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

      {/* The `public` variant keeps its own push-down sheet */}
      {isPublic && (
        <NavbarSheet
          open={menuOpen}
          onOpenChange={setMenuOpen}
          navItems={navItems}
          navLabel={navLabel}
          isActive={isActive}
          linkClass={linkClass}
          showSignIn
        />
      )}
    </header>
  );
}
