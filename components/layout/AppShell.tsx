'use client';

/**
 * Shared app shell — Navbar + collapsible global sidebar + main content.
 *
 * Single source of truth for sidebar collapsed state (persisted to
 * localStorage). Holds SearchProvider so the dashboard's live search works
 * across pages. Used by all in-app routes: /dashboard, /review, /settings,
 * /settings/privacy.
 *
 * Mobile (< lg): a single hamburger lives in the Navbar top bar and opens this
 * shell's sidebar as a fixed overlay drawer with a backdrop (never pushing
 * content down). Desktop (lg+): the static rail with a collapse-to-icon-rail
 * toggle, unchanged.
 */

import { useState, useCallback, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import Navbar, { SearchField } from '@/components/shared/Navbar';
import { SearchProvider } from '@/components/shared/SearchContext';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'baki-sidebar-collapsed';

interface AppShellProps {
  readonly title: string;
  readonly children: ReactNode;
}

/* -------------------------------------------------------------------------- */
/*  Persisted collapsed state (hydration-safe, lint-clean)                     */
/* -------------------------------------------------------------------------- */

/**
 * A tiny localStorage-backed external store for the sidebar collapse flag.
 * `useSyncExternalStore` reads the snapshot identically on the server (false)
 * and client (persisted value), so the first render is hydration-safe and
 * there is no setState-in-effect. Writes go through `setCollapsed`, which
 * updates localStorage and notifies subscribers.
 */

let collapsedSnapshot: boolean | null = null;
const collapsedListeners = new Set<() => void>();

function readCollapsed(): boolean {
  if (collapsedSnapshot !== null) return collapsedSnapshot;
  let value = false;
  if (typeof window !== 'undefined') {
    try {
      value = window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      // Ignore; stay expanded.
    }
  }
  collapsedSnapshot = value;
  return value;
}

function subscribeCollapsed(onStoreChange: () => void): () => void {
  collapsedListeners.add(onStoreChange);
  return () => collapsedListeners.delete(onStoreChange);
}

function setCollapsed(next: boolean): void {
  collapsedSnapshot = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Ignore write failures; in-memory state still flips for the session.
    }
  }
  for (const listener of collapsedListeners) listener();
}

export function AppShell({ title, children }: AppShellProps) {
  const tDash = useTranslations('Dashboard');
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, readCollapsed);

  function handleToggle() {
    setCollapsed(!collapsed);
  }

  const [mobileOpen, setMobileOpen] = useState(false);

  function handleMenuClick() {
    setMobileOpen((o) => !o);
  }

  function closeDrawer() {
    setMobileOpen(false);
  }

  // Close the drawer with Escape (backdrop click is the primary close).
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') closeDrawer();
  }, []);

  return (
    <SearchProvider>
      <div className="min-h-screen bg-surface-0 text-text-primary font-sans flex flex-col">
        <Navbar
          variant="app"
          title={title}
          mobileOpen={mobileOpen}
          onMenuClick={handleMenuClick}
        />

        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Desktop static rail (lg+). Kept separate from the mobile drawer so
              the drawer always renders expanded regardless of the persisted
              `collapsed` desktop state. */}
          <aside
            id="app-sidebar-desktop"
            aria-label={tDash('sidebarLabel')}
            className={cn(
              'hidden lg:flex shrink-0 transition-[width] duration-200 ease-in-out',
              'lg:border-r lg:border-border-1 lg:bg-surface-1',
              collapsed ? 'lg:w-16' : 'lg:w-64',
            )}
          >
            <div className="relative p-3 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] w-full">
              <AppSidebar collapsed={collapsed} onToggle={handleToggle} />
            </div>
          </aside>

          {/* Mobile overlay drawer + backdrop (< lg). Owned by AppShell and
              opened via the Navbar hamburger. */}
          <div className="lg:hidden" onKeyDown={handleKeyDown}>
            {mobileOpen && (
              <div
                className="fixed inset-0 z-30 bg-black/50"
                onClick={closeDrawer}
                aria-hidden="true"
              />
            )}
            <aside
              id="app-sidebar"
              role="dialog"
              aria-modal="true"
              aria-label={tDash('sidebarLabel')}
              aria-hidden={!mobileOpen}
              inert={!mobileOpen}
              className={cn(
                'fixed inset-y-0 left-0 z-40 w-72 bg-surface-1 border-r border-border-1',
                'shadow-xl transition-transform duration-200 ease-in-out',
                mobileOpen ? 'translate-x-0' : '-translate-x-full',
              )}
            >
              <div className="flex flex-col h-full">
                <div className="p-3 border-b border-border-1 md:hidden">
                  <SearchField id="mobile-search" />
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  {/* Forced expanded in the drawer so groups + labels are always
                      visible on mobile regardless of the persisted desktop
                      `collapsed` state. */}
                  <AppSidebar
                    collapsed={false}
                    onToggle={handleToggle}
                    onNavigate={closeDrawer}
                  />
                </div>
              </div>
            </aside>
          </div>

          {/* Main content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </SearchProvider>
  );
}
