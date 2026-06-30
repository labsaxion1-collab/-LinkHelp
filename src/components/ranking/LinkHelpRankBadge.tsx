import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import {
  getClientRank,
  getHelperRank,
  hasRankableStats,
  type ClientRankDef,
  type HelperRankDef,
  type ReputationInput,
} from '@/utils/linkHelpRanking';

type Size = 'sm' | 'md' | 'lg';

type Props = {
  rank: HelperRankDef | ClientRankDef;
  role: 'client' | 'helper';
  size?: Size;
  showLabel?: boolean;
  className?: string;
  t: (key: string) => string;
};

const SIZE_MAP: Record<Size, { wrap: string; icon: string; text: string }> = {
  sm: { wrap: 'h-7 w-7', icon: 'h-3.5 w-3.5', text: 'text-[10px]' },
  md: { wrap: 'h-9 w-9', icon: 'h-4 w-4', text: 'text-xs' },
  lg: { wrap: 'h-12 w-12', icon: 'h-5 w-5', text: 'text-sm' },
};

function RankIcon({ icon, className, color }: { icon: string; className: string; color: string }) {
  const props = { className, style: { color }, strokeWidth: 2.25 as const };
  switch (icon) {
    case 'sprout':
      return <Icons.Sprout {...props} />;
    case 'crystal':
      return <Icons.Gem {...props} />;
    case 'star':
      return <Icons.Star {...props} fill={color} />;
    case 'crown':
    case 'crown_premium':
      return <Icons.Crown {...props} fill={icon === 'crown_premium' ? color : undefined} />;
    case 'rocket':
      return <Icons.Rocket {...props} />;
    case 'flame':
      return <Icons.Flame {...props} fill={color} />;
    case 'handshake':
      return <Icons.Handshake {...props} />;
    case 'medal':
      return <Icons.Medal {...props} />;
    case 'diamond':
      return <Icons.Diamond {...props} />;
    default:
      return <Icons.Award {...props} />;
  }
}

export function LinkHelpRankBadge({ rank, role, size = 'md', showLabel = true, className, t }: Props) {
  const sz = SIZE_MAP[size];
  const labelKey = role === 'helper'
    ? `ranking.helper.${(rank as HelperRankDef).tier}`
    : `ranking.client.${(rank as ClientRankDef).tier}`;

  return (
    <div className={clsx('inline-flex items-center gap-2', className)}>
      <div
        className={clsx(
          'flex shrink-0 items-center justify-center rounded-xl ring-2 ring-offset-1',
          sz.wrap,
        )}
        style={{
          backgroundColor: `${rank.accent}18`,
          boxShadow: `0 0 12px ${rank.accent}40`,
          borderColor: rank.accent,
        }}
        title={t(labelKey)}
      >
        <RankIcon icon={rank.icon} className={sz.icon} color={rank.accent} />
      </div>
      {showLabel ? (
        <span className={clsx('font-black uppercase tracking-wide text-slate-800', sz.text)}>
          {t(labelKey)}
        </span>
      ) : null}
    </div>
  );
}

type StatsProps = Omit<Props, 'rank'> & {
  completedCount: number;
  averageRating: number;
  /** When true, hide badge until completedCount > 0 (profile / service details). */
  requireCompleted?: boolean;
};

export function LinkHelpRankBadgeFromStats({
  role,
  completedCount,
  averageRating,
  requireCompleted = false,
  ...rest
}: StatsProps) {
  const input: ReputationInput = { completedCount, averageRating };
  if (requireCompleted && !hasRankableStats(input)) return null;

  const rank = role === 'helper' ? getHelperRank(input) : getClientRank(input);
  return <LinkHelpRankBadge rank={rank} role={role} {...rest} />;
}
