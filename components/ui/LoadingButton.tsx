'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly isLoading?: boolean;
  readonly loadingText?: string;
  readonly icon?: ReactNode;
  readonly variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  readonly size?: 'sm' | 'md' | 'lg';
}

const VARIANT_CLASSES: Record<
  NonNullable<LoadingButtonProps['variant']>,
  string
> = {
  primary:
    'bg-accent text-surface-0 hover:bg-accent-hover active:scale-[0.98] shadow-xs font-semibold',
  secondary:
    'bg-surface-2 text-text-primary border border-border-2 hover:bg-surface-3 hover:border-border-3 active:scale-[0.98]',
  danger:
    'bg-status-rose-surface text-status-rose-text border border-status-rose-border hover:bg-status-rose-surface/80 active:scale-[0.98]',
  ghost:
    'bg-transparent text-text-muted hover:text-text-primary hover:bg-surface-2',
  outline:
    'bg-transparent text-text-secondary border border-border-2 hover:bg-surface-2 hover:text-text-primary',
};

const SIZE_CLASSES: Record<NonNullable<LoadingButtonProps['size']>, string> = {
  sm: 'px-2.5 py-1 text-xs rounded-lg gap-1.5',
  md: 'px-3.5 py-2 text-sm rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-base rounded-xl gap-2.5',
};

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      children,
      className,
      isLoading = false,
      loadingText,
      icon,
      variant = 'primary',
      size = 'md',
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
          'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {icon && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
          </>
        )}
      </button>
    );
  },
);

LoadingButton.displayName = 'LoadingButton';
