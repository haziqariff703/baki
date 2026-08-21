'use client';

/**
 * CardActionMenu — Minimalist three-dot (kebab/meatball) action menu for card headers.
 *
 * Implements:
 * - Click-outside and Escape key dismissal
 * - Smooth fade & scale spring animations
 * - Accessible ARIA attributes (`aria-haspopup`, `aria-expanded`, `role="menu"`)
 * - Checkmark indicator for selected item
 * - Baki design system tokens (ledger frosted glass, AA contrast)
 */

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { MoreHorizontal, Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActionMenuItem<T extends string | number = string> {
  readonly value: T;
  readonly label: string;
  readonly description?: string;
  readonly Icon?: LucideIcon;
}

interface CardActionMenuProps<T extends string | number = string> {
  readonly title?: string;
  readonly items: readonly ActionMenuItem<T>[];
  readonly selectedValue: T;
  readonly onSelect: (value: T) => void;
  readonly align?: 'left' | 'right';
  readonly className?: string;
}

export function CardActionMenu<T extends string | number = string>({
  title,
  items,
  selectedValue,
  onSelect,
  align = 'right',
  className,
}: CardActionMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open card options"
        className={cn(
          'p-1.5 rounded-lg text-text-faint hover:text-text-primary hover:bg-surface-2 border border-transparent hover:border-border-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
          open && 'text-text-primary bg-surface-2 border-border-2',
        )}
      >
        <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={cn(
            'absolute top-full mt-1.5 w-52 rounded-xl bg-surface-1/95 backdrop-blur-md border border-border-2 shadow-2xl p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 focus:outline-none',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {title && (
            <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-text-faint border-b border-border-1 mb-1">
              {title}
            </div>
          )}

          <div className="space-y-0.5">
            {items.map((item) => {
              const isSelected = item.value === selectedValue;
              const { Icon } = item;

              return (
                <button
                  key={String(item.value)}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left cursor-pointer',
                    isSelected
                      ? 'bg-surface-2 text-text-primary font-medium'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/60',
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {Icon && <Icon className="w-3.5 h-3.5 text-text-faint shrink-0" />}
                    <span className="truncate">{item.label}</span>
                  </span>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
