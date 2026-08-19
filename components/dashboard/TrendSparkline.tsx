import type { TrendPoint } from '@/features/dashboard/analytics';
import { senToMyr } from '@/lib/money';

/**
 * Hand-rolled mono sparkline (DESIGN.md: quiet, typeset, no chart lib).
 * Pure SVG, server-renderable, no client state. A single amber polyline over
 * a neutral baseline; the latest point is dotted. Values are integer sen.
 */

const W = 320;
const H = 72;
const PAD_X = 6;
const PAD_Y = 8;

interface TrendSparklineProps {
  readonly points: readonly TrendPoint[];
  readonly ariaLabel: string;
}

export function TrendSparkline({ points, ariaLabel }: TrendSparklineProps) {
  if (points.length === 0) return null;

  const values = points.map((p) => p.monthlySen);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const step = points.length > 1 ? innerW / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = PAD_X + i * step;
    const y = PAD_Y + innerH - ((p.monthlySen - min) / range) * innerH;
    return { x, y };
  });

  const path = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');
  const last = coords[coords.length - 1];

  return (
    <div>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
        className="block"
      >
        {/* baseline */}
        <line
          x1={PAD_X}
          y1={H - PAD_Y}
          x2={W - PAD_X}
          y2={H - PAD_Y}
          stroke="var(--color-border-2)"
          strokeWidth="1"
        />
        <path
          d={path}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Settled endpoint marker: neutral ring, not a glowing accent dot —
            the amber polyline itself is the single accent in this view. */}
        <circle
          cx={last.x}
          cy={last.y}
          r="3"
          fill="var(--color-surface-1)"
          stroke="var(--color-accent)"
          strokeWidth="1.5"
        />
      </svg>
      {/* axis labels: first → last, mono */}
      <div className="flex items-baseline justify-between mt-2">
        <span className="font-mono text-xs text-text-faint">
          {points[0].label}
        </span>
        <span className="font-mono text-xs text-text-faint">
          {points[points.length - 1].label}
        </span>
      </div>
    </div>
  );
}

/** Latest value + delta vs the previous point, in mono (display only). */
export function TrendSummary({ points }: { readonly points: readonly TrendPoint[] }) {
  if (points.length === 0) return null;
  const latest = points[points.length - 1].monthlySen;
  const prev = points.length > 1 ? points[points.length - 2].monthlySen : latest;
  const delta = latest - prev;
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="font-mono text-xl font-medium text-text-primary">
        MYR {senToMyr(latest)}
      </span>
      <span className="font-mono text-xs text-text-muted">
        {delta === 0 ? '±0.00' : `${delta > 0 ? '+' : ''}${senToMyr(delta)}`}
      </span>
    </div>
  );
}
