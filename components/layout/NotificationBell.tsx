'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bell,
  Check,
  Calendar,
  AlertTriangle,
  CreditCard,
  ExternalLink,
  X,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import type { NotificationItem, NotificationSummary } from '@/features/notifications/types';
import { generateRenewalNotifications } from '@/features/notifications/logic';
import { syntheticSubscriptions } from '@/tests/fixtures/subscriptions';

const READ_STORAGE_KEY = 'baki_read_notifications_v1';

export function NotificationBell() {
  const t = useTranslations('Nav');
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<NotificationSummary>({
    items: [],
    unreadCount: 0,
    urgentCount: 0,
  });
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  // Load read IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(READ_STORAGE_KEY);
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
    } catch {}
  }, []);

  // Fetch or generate live renewal notifications
  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data: NotificationSummary = await res.json();
          // Filter read state
          const updatedItems = data.items.map((item) => ({
            ...item,
            isRead: readIds.has(item.id),
          }));
          const unread = updatedItems.filter((i) => !i.isRead).length;
          const urgent = updatedItems.filter(
            (i) => !i.isRead && (i.severity === 'critical' || i.severity === 'warning')
          ).length;
          setSummary({ items: updatedItems, unreadCount: unread, urgentCount: urgent });
          return;
        }
      } catch {}

      // Client-side fallback using synthetic subscriptions and local profile
      let reminderDays = 3;
      try {
        const profileStored = localStorage.getItem('baki_user_profile_v1');
        if (profileStored) {
          reminderDays = JSON.parse(profileStored).reminderDaysBefore || 3;
        }
      } catch {}

      const localSummary = generateRenewalNotifications(syntheticSubscriptions, {
        reminderDaysBefore: reminderDays,
        readIds,
      });
      setSummary(localSummary);
    }

    loadNotifications();
  }, [readIds]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const markAllRead = () => {
    const allIds = new Set([...readIds, ...summary.items.map((i) => i.id)]);
    setReadIds(allIds);
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...allIds]));
    } catch {}
    setSummary((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({ ...item, isRead: true })),
      unreadCount: 0,
      urgentCount: 0,
    }));
  };

  const markItemRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...next]));
    } catch {}
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Notifications"
        className={cn(
          'relative inline-flex items-center justify-center w-10 h-10 rounded-xl',
          'bg-surface-2 border border-border-2 text-text-muted transition-colors',
          'hover:text-text-primary hover:border-border-3',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer',
          open && 'bg-surface-3 border-border-3 text-text-primary'
        )}
      >
        <Bell className="w-4 h-4" aria-hidden="true" />
        {summary.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-status-emerald-surface border border-status-emerald-border text-[10px] font-mono font-semibold text-status-emerald-text">
            {summary.unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border-2 bg-surface-1 shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-1 bg-surface-2/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-primary">Notifications</span>
              {summary.unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-surface-3 text-text-secondary border border-border-2">
                  {summary.unreadCount} new
                </span>
              )}
            </div>
            {summary.unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3" aria-hidden="true" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Items List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border-1">
            {summary.items.length === 0 ? (
              <div className="p-6 text-center space-y-1">
                <p className="text-xs font-medium text-text-secondary">All caught up</p>
                <p className="text-[11px] text-text-muted">
                  No upcoming subscription renewals in your alert window.
                </p>
              </div>
            ) : (
              summary.items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'p-3.5 transition-colors flex items-start gap-3',
                    item.isRead ? 'bg-surface-1 opacity-75' : 'bg-surface-2/30'
                  )}
                >
                  <div
                    className={cn(
                      'p-2 rounded-lg shrink-0 mt-0.5',
                      item.severity === 'critical'
                        ? 'bg-status-rose-surface text-status-rose-text border border-status-rose-border'
                        : item.severity === 'warning'
                        ? 'bg-status-amber-surface text-status-amber-text border border-status-amber-border'
                        : 'bg-surface-3 text-text-secondary border border-border-2'
                    )}
                  >
                    {item.type === 'renewal_today' ? (
                      <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : item.type === 'renewal_upcoming' ? (
                      <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-text-primary truncate">
                        {item.title}
                      </span>
                      {!item.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-status-emerald-text shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      {item.message}
                    </p>
                    <div className="pt-1 flex items-center justify-between">
                      <Link
                        href="/subscriptions"
                        onClick={() => {
                          markItemRead(item.id);
                          setOpen(false);
                        }}
                        className="text-[11px] font-medium text-accent hover:underline flex items-center gap-1"
                      >
                        <span>View subscription</span>
                        <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
                      </Link>
                      {!item.isRead && (
                        <button
                          type="button"
                          onClick={() => markItemRead(item.id)}
                          className="text-[10px] text-text-faint hover:text-text-secondary cursor-pointer"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
