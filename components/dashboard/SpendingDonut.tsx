import type { SpendingSlice } from '@/features/dashboard/analytics';
import { senToMyr } from '@/lib/money';
import { BrandLogo } from '@/components/subscriptions/BrandLogo';

/**
 * Hand-rolled donut chart (DESIGN.md: no chart lib, no icon-stuffed bento).
 * Server-renderable pure SVG — no client state. Each slice is keyed by a
 * deterministic hue-free treatment: we use a stepped opacity of the single
 * amber accent plus neutral borders so the chart never relies on colour alone
 * (the legend pairs every slice with its merchant name + mono amount, §16).
 */

const SIZE = 168;
const STROKE = 22;
const R = (SIZE - STROKE) / 2;
const C = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Deterministic slice fills: amber ramp → neutral surfaces. No purple/violet. */
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

  // Consistent zero/empty handling: show the bare track ring, no slices.
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
        {/* track */}
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

/** Legend pairing every slice with name + mono amount (never colour alone). */
export function SpendingDonutLegend({
  slices,
}: {
  readonly slices: readonly SpendingSlice[];
}) {
  return (
    <ul className="divide-y divide-border-1">
      {slices.map((slice, i) => (
        <li
          key={slice.id}
          className="flex items-center justify-between gap-3 py-2"
        >
          <span className="flex items-center gap-2 min-w-0">
            <BrandLogo merchantName={slice.merchantName} size={18} />
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: SLICE_FILLS[i % SLICE_FILLS.length] }}
            />
            <span className="text-xs text-text-secondary truncate">
              {slice.merchantName}
            </span>
          </span>
          <span className="font-mono text-xs text-text-primary shrink-0">
            MYR {senToMyr(slice.monthlySen)}
          </span>
        </li>
      ))}
    </ul>
  );
}
