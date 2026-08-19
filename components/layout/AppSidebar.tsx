'use client';

/**
 * Global collapsible app sidebar — shared chrome across all in-app pages.
 *
 * Expanded: grouped sections (Overview / Manage / Account) with icons + labels
 * and the amber left-tick active state (DESIGN.md §6 Ledger Rule).
 * Collapsed: slim icon-only rail; labels hidden, icons keep aria-label so the
 * nav stays accessible. Active item still shows the amber tick.
 *
 * Collapse state is lifted up via `collapsed` + `onToggle` props and persisted
 * by the parent AppShell (localStorage). Mobile keeps the drawer behaviour.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  ListChecks,
  Inbox,
  UploadCloud,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  LogOut,
  Bell,
  TrendingUp,
  ReceiptText,
  type LucideIcon,
} from 'lucide-react';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface SideItem {
  readonly href: string;
  readonly label: string;
  readonly Icon: LucideIcon;
  readonly disabled?: boolean;
}

interface SideGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly SideItem[];
}

interface AppSidebarProps {
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  readonly onNavigate?: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Data                                                                       */
/* -------------------------------------------------------------------------- */

function useGroups(): readonly SideGroup[] {
  const tNav = useTranslations('Nav');
  const t = useTranslations('Dashboard');

  return [
    {
      id: 'overview',
      label: t('sidebarGroupOverview'),
      items: [
        { href: '/dashboard', label: tNav('overview'), Icon: LayoutDashboard },
      ],
    },
    {
      id: 'manage',
      label: t('sidebarGroupManage'),
      items: [
        { href: '/subscriptions', label: tNav('subscriptions'), Icon: ListChecks },
        { href: '/review', label: tNav('review'), Icon: Inbox },
        { href: '/imports', label: tNav('import'), Icon: UploadCloud },
        { href: '/cash-flow', label: tNav('cashFlow'), Icon: TrendingUp },
        { href: '/transactions', label: tNav('transactions'), Icon: ReceiptText },
      ],
    },
    {
      id: 'account',
      label: t('sidebarGroupAccount'),
      items: [
        { href: '/notifications', label: tNav('notifications'), Icon: Bell },
        { href: '/settings', label: tNav('settings'), Icon: Settings },
        { href: '/settings/privacy', label: tNav('privacy'), Icon: ShieldCheck },
      ],
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                     */
/* -------------------------------------------------------------------------- */

function linkClass(active: boolean, disabled: boolean | undefined, collapsed: boolean) {
  return cn(
    'flex items-center text-sm transition-colors w-full min-h-[40px]',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
    collapsed ? 'justify-center px-0 py-2 rounded-lg' : 'gap-3 px-3 py-2 rounded-xl',
    disabled && 'opacity-45 cursor-not-allowed text-text-faint',
    !disabled &&
      (active
        ? collapsed
          ? 'bg-surface-3 text-text-primary font-medium rounded-lg'
          : 'bg-surface-3 text-text-primary font-medium rounded-xl border-l-2 border-l-accent pl-[10px]'
        : 'text-text-muted hover:text-text-primary hover:bg-surface-2/60'),
  );
}

/* -------------------------------------------------------------------------- */
/*  Account widget                                                             */
/* -------------------------------------------------------------------------- */

import { useRouter } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  readonly name: string;
  readonly email: string;
  readonly avatarUrl: string | null;
  readonly initials: string;
}

function AccountWidget({ collapsed }: { readonly collapsed: boolean }) {
  const t = useTranslations('Dashboard');
  const tNav = useTranslations('Nav');
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => {
        const user = data?.user;
        if (user) {
          const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
          const rawName = String(meta.full_name || meta.name || meta.user_name || '').trim();
          const email = user.email ?? '';
          const displayName = rawName || (email ? email.split('@')[0] : 'User');
          const avatarUrl =
            typeof meta.avatar_url === 'string'
              ? meta.avatar_url
              : typeof meta.picture === 'string'
                ? meta.picture
                : null;

          let initials = '??';
          if (rawName) {
            const parts = rawName.split(/\s+/).filter(Boolean);
            initials =
              parts.length >= 2
                ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
                : rawName.slice(0, 2).toUpperCase();
          } else if (email) {
            initials = email.slice(0, 2).toUpperCase();
          }

          setUser({
            name: displayName,
            email,
            avatarUrl,
            initials,
          });
        }
      })
      .catch((err) => {
        console.error('[AppSidebar] Auth state error:', err);
      });
  }, [supabase.auth]);

  async function handleLogout() {
    setOpen(false);
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  }

  // Close on click-outside + Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const linkItems: readonly { readonly href: string; readonly Icon: LucideIcon; readonly label: string }[] = [
    { href: '/settings', Icon: Settings, label: tNav('settings') },
    { href: '/settings/privacy', Icon: ShieldCheck, label: tNav('privacy') },
    { href: '/notifications', Icon: Bell, label: tNav('notifications') },
  ];

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative border-t border-border-1/60 pt-3 mt-auto">
      {/* Upward popover */}
      {open && (
        <div
          role="menu"
          aria-label={t('account.menuLabel')}
          className={cn(
            'absolute bottom-full mb-2 z-50 bg-surface-1 border border-border-2 rounded-xl shadow-2xl p-2 w-60',
            collapsed ? 'left-0' : 'left-0 right-0',
          )}
        >
          {/* Header */}
          <div className="px-2 py-2 border-b border-border-1 mb-1">
            <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
            {user.email && (
              <p className="text-xs text-text-faint truncate font-mono mt-0.5">{user.email}</p>
            )}
          </div>

          {/* Items */}
          <ul className="space-y-0.5">
            {linkItems.map(({ href, Icon, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-surface-2/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            ))}
            <li aria-hidden="true" className="border-t border-border-1 my-1" />
            <li className="px-2 py-1.5">
              <span className="block text-xs font-medium text-text-faint mb-1.5">
                {tNav('language')}
              </span>
              <LanguageSwitcher />
            </li>
            <li aria-hidden="true" className="border-t border-border-1 my-1" />
            <li>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{t('account.logout')}</span>
              </button>
            </li>
          </ul>
        </div>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={collapsed ? user.name : undefined}
        title={collapsed ? `${user.name}${user.email ? ` (${user.email})` : ''}` : undefined}
        className={cn(
          'flex items-center rounded-xl transition-colors text-left',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
          collapsed
            ? 'justify-center w-full p-2 hover:bg-surface-2/80'
            : 'w-full justify-between p-2 hover:bg-surface-2/80',
        )}
      >
        <span className="flex items-center min-w-0">
          {/* Avatar */}
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-8 h-8 rounded-full border border-border-2 object-cover shrink-0"
            />
          ) : (
            <span className="w-8 h-8 rounded-full bg-surface-3 border border-border-2 flex items-center justify-center font-medium text-xs text-text-primary shrink-0">
              {user.initials}
            </span>
          )}
          {!collapsed && (
            <span className="min-w-0 flex-1 ml-2.5">
              <span className="block text-sm font-medium text-text-primary truncate">
                {user.name}
              </span>
              {user.email && (
                <span className="block text-[11px] text-text-faint truncate font-mono">
                  {user.email}
                </span>
              )}
            </span>
          )}
        </span>
        {!collapsed && (
          <ChevronsUpDown className="w-4 h-4 text-text-faint shrink-0 ml-1" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function AppSidebar({ collapsed, onToggle, onNavigate }: AppSidebarProps) {
  const t = useTranslations('Dashboard');
  const pathname = usePathname();
  const groups = useGroups();

  // Exact-or-prefix match keeps one active item per route. Each enabled item
  // has a distinct route, so at most one lights up.
  const isActive = (item: SideItem) => {
    if (item.disabled) return false;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <div className="relative flex flex-col h-full">
      {/* Edge-docked collapse toggle — floats ON the right border of the sidebar.
          Desktop-only (lg+); the parent aside must not clip it (overflow removed
          in AppShell). */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
        className={cn(
          'hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-30',
          'w-5 h-5 rounded-full bg-surface-1 border border-border-2 text-text-muted',
          'hover:text-text-primary hover:border-border-3 shadow-sm',
          'items-center justify-center transition-all',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        )}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" aria-hidden="true" />
        ) : (
          <ChevronLeft className="w-3 h-3" aria-hidden="true" />
        )}
      </button>

      {/* Nav */}
      <nav aria-label={t('sidebarLabel')} className="flex-1 space-y-0 overflow-y-auto">
        {groups.map((group, groupIndex) => (
          <div key={group.id}>
            {!collapsed && (
              <p
                id={`sidebar-group-${group.id}`}
                className="text-[11px] font-medium text-text-faint/70 uppercase tracking-wider px-3 mb-1.5 mt-4 first:mt-0"
              >
                {group.label}
              </p>
            )}
            <ul
              aria-labelledby={collapsed ? undefined : `sidebar-group-${group.id}`}
              className="space-y-0.5"
            >
              {group.items.map((item, itemIndex) => {
                const { Icon } = item;
                if (item.disabled) {
                  return (
                    <li key={`${item.label}-${itemIndex}`}>
                      <span
                        aria-disabled="true"
                        aria-label={collapsed ? `${item.label} — ${t('soonBadge')}` : undefined}
                        title={collapsed ? `${item.label} — ${t('soonBadge')}` : undefined}
                        className={linkClass(false, true, collapsed)}
                      >
                        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                        {!collapsed && (
                          <>
                            <span className="truncate">{item.label}</span>
                            <span className="ml-auto text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-2 text-text-faint border border-border-1">
                              {t('soonBadge')}
                            </span>
                          </>
                        )}
                      </span>
                    </li>
                  );
                }
                const active = isActive(item);
                return (
                  <li key={`${item.label}-${itemIndex}`}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      title={collapsed ? item.label : undefined}
                      onClick={onNavigate}
                      className={linkClass(active, false, collapsed)}
                    >
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {/* Subtle group separator when collapsed */}
            {collapsed && groupIndex < groups.length - 1 && (
              <div className="w-4 mx-auto border-t border-border-1/60 my-2.5" aria-hidden="true" />
            )}
          </div>
        ))}
      </nav>

      {/* Bottom account widget */}
      <AccountWidget collapsed={collapsed} />
    </div>
  );
}
