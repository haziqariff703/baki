'use client';

/**
 * Impeccable Toaster Component (Baki UI/UX Pro Max).
 *
 * Floating stack with spring physics animations, AA contrast compliance,
 * micro progress bar, action buttons, and Baki ledger tokens.
 */

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useToastStore, type ToastItem, type ToastType } from '@/lib/toast';
import { cn } from '@/lib/utils';

const TOAST_ICONS: Record<ToastType, LucideIcon> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_STYLES: Record<
  ToastType,
  { iconBox: string; border: string; accentBar: string }
> = {
  success: {
    iconBox:
      'bg-status-emerald-surface text-status-emerald-text border-status-emerald-border/60',
    border: 'border-status-emerald-border/40',
    accentBar: 'bg-status-emerald-text',
  },
  error: {
    iconBox: 'bg-status-rose-surface text-status-rose-text border-status-rose-border/60',
    border: 'border-status-rose-border/40',
    accentBar: 'bg-status-rose-text',
  },
  warning: {
    iconBox:
      'bg-status-amber-surface text-status-amber-text border-status-amber-border/60',
    border: 'border-status-amber-border/40',
    accentBar: 'bg-status-amber-text',
  },
  info: {
    iconBox: 'bg-status-blue-surface text-status-blue-text border-status-blue-border/60',
    border: 'border-status-blue-border/40',
    accentBar: 'bg-status-blue-text',
  },
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const Icon = TOAST_ICONS[toast.type];
  const style = TOAST_STYLES[toast.type];
  const isAlert = toast.type === 'error' || toast.type === 'warning';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
      className={cn(
        'relative overflow-hidden w-full max-w-sm rounded-xl p-3.5 sm:p-4 shadow-2xl',
        'bg-surface-1/95 backdrop-blur-md border',
        style.border,
        'pointer-events-auto flex items-start gap-3 select-none transition-shadow',
      )}
    >
      {/* Icon Badge */}
      <div
        className={cn(
          'p-1.5 rounded-lg border shrink-0 flex items-center justify-center',
          style.iconBox,
        )}
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5 space-y-1">
        <h4 className="text-xs font-semibold tracking-[-0.01em] text-text-primary truncate">
          {toast.title}
        </h4>
        {toast.description && (
          <p className="text-[11px] text-text-muted leading-relaxed break-words font-sans">
            {toast.description}
          </p>
        )}

        {/* Optional Action Button */}
        {toast.action && (
          <div className="pt-1.5">
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss();
              }}
              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-2 hover:bg-surface-3 border border-border-2 text-text-primary transition-colors cursor-pointer"
            >
              {toast.action.label}
            </button>
          </div>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="p-1 rounded-md text-text-faint hover:text-text-primary hover:bg-surface-2 transition-colors shrink-0 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      {/* Auto-Dismiss Progress Line (Subtle bottom bar) */}
      {toast.duration > 0 && toast.duration !== Infinity && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
          className={cn('absolute bottom-0 left-0 h-[2px] opacity-70', style.accentBar)}
        />
      )}
    </motion.div>
  );
}

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 w-full max-w-sm pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((item) => (
          <ToastCard
            key={item.id}
            toast={item}
            onDismiss={() => dismiss(item.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
