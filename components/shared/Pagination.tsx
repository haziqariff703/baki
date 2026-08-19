'use client';

/**
 * Shared Pagination Component.
 *
 * Accessible, keyboard-navigable pagination for navigating large datasets
 * across transactions, subscriptions, and statement import previews.
 * DESIGN.md tokens: Ledger Rule styling, mono indices, WCAG AA contrast, zero emojis.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  readonly currentPage: number;
  readonly totalItems: number;
  readonly pageSize: number;
  readonly onPageChange: (page: number) => void;
  readonly className?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= pageSize) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate visible page numbers with ellipsis when totalPages > 5
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, 'ellipsis', totalPages];
    }

    if (currentPage >= totalPages - 2) {
      return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <nav
      role="navigation"
      aria-label="Pagination Navigation"
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border-1 text-xs text-text-muted',
        className,
      )}
    >
      {/* Items count range */}
      <div className="font-mono">
        Showing <span className="font-medium text-text-primary">{startItem}</span>–
        <span className="font-medium text-text-primary">{endItem}</span> of{' '}
        <span className="font-medium text-text-primary">{totalItems}</span>
      </div>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          aria-label="Go to previous page"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border-2 bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface-2"
        >
          <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden xs:inline">Previous</span>
        </button>

        {/* Page Pills */}
        <div className="flex items-center gap-1 px-1">
          {pages.map((p, idx) => {
            if (p === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 font-mono text-text-faint select-none"
                  aria-hidden="true"
                >
                  …
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Page ${p}`}
                className={cn(
                  'min-w-[28px] h-7 px-2 font-mono text-xs rounded-lg transition-colors flex items-center justify-center font-medium',
                  isCurrent
                    ? 'bg-accent text-surface-0 font-semibold shadow-xs'
                    : 'border border-border-1 bg-surface-1 text-text-secondary hover:bg-surface-2 hover:text-text-primary',
                )}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          aria-label="Go to next page"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border-2 bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface-2"
        >
          <span className="hidden xs:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
