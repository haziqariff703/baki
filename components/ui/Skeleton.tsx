import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

/**
 * Clean, lightweight skeleton primitive with subtle pulse animation.
 * Follows Baki's minimalist dark palette (surface-2 / surface-3).
 */
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-surface-2/70 border border-border-1/40',
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * Card skeleton with header, title, and content placeholder.
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border-1 bg-surface-1/90 p-5 space-y-4 shadow-xs',
        className,
      )}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-36" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

/**
 * Table / ledger rows skeleton placeholder.
 */
export function TableRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-border-1 bg-surface-1 overflow-hidden divide-y divide-border-1">
      <div className="p-4 bg-surface-2/40 flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1 max-w-xs">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
