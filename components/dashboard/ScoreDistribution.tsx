import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  Eye,
  PauseCircle,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { ScoreBandCount } from '@/features/dashboard/analytics';
import type { Recommendation } from '@/features/scoring';

/**
 * Score distribution — mono bar breakdown of subscriptions per recommendation
 * band. Pairs every semantic status colour with an icon + text label (§16:
 * never colour alone). Server-renderable, no client state.
 */

const BAND_STYLE: Record<
  Recommendation['type'],
  { Icon: LucideIcon; bar: string; text: string }
> = {
  keep: {
    Icon: CheckCircle2,
    bar: 'bg-status-emerald-border',
    text: 'text-status-emerald-text',
  },
  review: {
    Icon: Eye,
    bar: 'bg-status-blue-border',
    text: 'text-status-blue-text',
  },
  downgrade_or_pause: {
    Icon: PauseCircle,
    bar: 'bg-status-amber-border',
    text: 'text-status-amber-text',
  },
  consider_cancelling: {
    Icon: XCircle,
    bar: 'bg-status-rose-border',
    text: 'text-status-rose-text',
  },
};

interface ScoreDistributionProps {
  readonly bands: readonly ScoreBandCount[];
}

export function ScoreDistribution({ bands }: ScoreDistributionProps) {
  const t = useTranslations('Dashboard');
  const max = Math.max(1, ...bands.map((b) => b.count));

  return (
    <ul className="space-y-3">
      {bands.map((band) => {
        const style = BAND_STYLE[band.recommendation];
        const { Icon } = style;
        const widthPct = Math.round((band.count / max) * 100);
        return (
          <li key={band.recommendation}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className={`flex items-center gap-1.5 text-xs font-medium ${style.text}`}>
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {t(`recommendation.${band.recommendation}`)}
              </span>
              <span className="font-mono text-xs text-text-primary">
                {band.count}
              </span>
            </div>
            <div
              className="h-2 rounded-full bg-surface-3 overflow-hidden"
              role="img"
              aria-label={`${t(`recommendation.${band.recommendation}`)}: ${band.count}`}
            >
              <div
                className={`h-full rounded-full ${style.bar}`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
