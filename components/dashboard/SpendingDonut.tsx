'use client';

/**
 * Hand-rolled donut chart & minimalist paginated legend.
 *
 * Implements:
 * - Deterministic SVG donut chart
 * - Quiet, typeset, minimalist legend pagination (4 items per page) with micro-stepper
 * - DESIGN.md tokens: No chart bloat, AA contrast compliance
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SpendingSlice } from '@/features/dashboard/analytics';
import { senToMyr } from '@/lib/money';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';

const SIZE = 168;
const STROKE = 22;
const R = (SIZE - STROKE) / 2;
const C = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Deterministic slice fills: amber ramp → neutral surfaces. */
const SLICE_FILLS = [
  'var(--color-accent)',
  'var(--color-accent-hover)',
  'var(--color-text-secondary)',
  'var(--color-border-3)',
  'var(--color-text-faint)',
  'var(--color-border-2)',
] as const;

interface SpendingDonutProps {
  readonly slices: readonly SpendingSlice[];
  readonly centerLabel: string;
  readonly centerValueSen: number;
}

export function SpendingDonut({
  slices,
  centerLabel,
  centerValueSen,
}: SpendingDonutProps) {
  // Precompute cumulative offsets immutably (no mutation during render).
  const offsets: number[] = [];
  slices.reduce((acc, s) => {
    offsets.push(acc);
    return acc + s.fraction * CIRCUMFERENCE;
  }, 0);

  const arcs = slices.map((slice, i) => {
    const len = slice.fraction * CIRCUMFERENCE;
    return {
      id: slice.id,
      dasharray: `${len} ${CIRCUMFERENCE - len}`,
      dashoffset: -offsets[i],
      fill: SLICE_FILLS[i % SLICE_FILLS.length],
    };
  });

  const hasData = slices.length > 0 && centerValueSen > 0;

  return (
    <div className="flex items-center justify-center">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`${centerLabel} MYR ${senToMyr(centerValueSen)}`}
        className="shrink-0"
      >
        {/* Track */}
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="none"
          stroke="var(--color-surface-3)"
          strokeWidth={STROKE}
        />
        {hasData &&
          arcs.map((arc) => (
            <circle
              key={arc.id}
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke={arc.fill}
              strokeWidth={STROKE}
              strokeDasharray={arc.dasharray}
              strokeDashoffset={arc.dashoffset}
              transform={`rotate(-90 ${C} ${C})`}
            />
          ))}
        <text
          x={C}
          y={C - 4}
          textAnchor="middle"
          className="fill-text-muted"
          fontSize="10"
        >
          {centerLabel}
        </text>
        <text
          x={C}
          y={C + 16}
          textAnchor="middle"
          className="fill-text-primary font-mono"
          fontSize="15"
          fontWeight={500}
        >
          {senToMyr(centerValueSen)}
        </text>
      </svg>
    </div>
  );
}

/** Minimalist paginated legend pairing every slice with name + mono amount. */
export function SpendingDonutLegend({
  slices,
}: {
  readonly slices: readonly SpendingSlice[];
}) {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 4;
  const totalPages = Math.ceil(slices.length / PAGE_SIZE) || 1;

  const start = (page - 1) * PAGE_SIZE;
  const paginatedSlices = slices.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-border-1">
        {paginatedSlices.map((slice, idx) => {
          const globalIdx = start + idx;
          return (
            <li
              key={slice.id}
              className="flex items-center justify-between gap-3 py-1.5"
            >
              <span className="flex items-center gap-2 min-w-0">
                <BrandLogo merchantName={slice.merchantName} size={18} />
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: SLICE_FILLS[globalIdx % SLICE_FILLS.length] }}
                />
                <span className="text-xs text-text-secondary truncate">
                  {slice.merchantName}
                </span>
              </span>
              <span className="font-mono text-xs text-text-primary shrink-0">
                MYR {senToMyr(slice.monthlySen)}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Minimalist Micro-Pagination Stepper */}
      {slices.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2 border-t border-border-1/60 text-[11px] font-mono text-text-faint">
          <span>
            {start + 1}–{Math.min(start + PAGE_SIZE, slices.length)} of {slices.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
              className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-text-faint px-0.5">
              {page}/{totalPages}
            </span>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
              className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
