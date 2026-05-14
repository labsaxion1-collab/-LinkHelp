import { clsx } from 'clsx';
import * as Icons from 'lucide-react';

export type HelperStatsStripModel = {
  sent: number;
  accepted: number;
  completed: number;
  responseRatePct: number | null;
  avgRating: number;
  estimatedEarnings: string;
  reputation: number;
  matchScore: number;
};

type TFn = (key: string, options?: Record<string, string | number>) => string;

type Props = {
  dataLoading: boolean;
  stats: HelperStatsStripModel;
  t: TFn;
};

function StatCard({
  icon: Icon,
  labelKey,
  value,
  sub,
  accent,
  t,
}: {
  icon: typeof Icons.Send;
  labelKey: string;
  value: string;
  sub?: string;
  accent: 'sky' | 'emerald' | 'violet' | 'amber' | 'rose' | 'slate' | 'indigo' | 'cyan';
  t: TFn;
}) {
  const ring =
    accent === 'sky'
      ? 'from-sky-500/15 to-blue-600/5 ring-sky-200/80'
      : accent === 'emerald'
        ? 'from-emerald-500/15 to-teal-600/5 ring-emerald-200/80'
        : accent === 'violet'
          ? 'from-violet-500/15 to-purple-600/5 ring-violet-200/80'
          : accent === 'amber'
            ? 'from-amber-500/15 to-orange-600/5 ring-amber-200/80'
            : accent === 'rose'
              ? 'from-rose-500/15 to-pink-600/5 ring-rose-200/80'
              : accent === 'indigo'
                ? 'from-indigo-500/15 to-blue-700/5 ring-indigo-200/80'
                : accent === 'cyan'
                  ? 'from-cyan-500/15 to-sky-600/5 ring-cyan-200/80'
                  : 'from-slate-500/10 to-slate-600/5 ring-slate-200/80';

  return (
    <div
      className={clsx(
        'group relative shrink-0 w-[132px] sm:w-[148px] rounded-2xl border border-white/80 bg-gradient-to-br p-3 shadow-sm ring-1 transition-all duration-300',
        'hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-900/10 motion-reduce:transform-none',
        ring,
      )}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
      <div className="relative flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-slate-600" aria-hidden />
        <span className="truncate">{t(labelKey)}</span>
      </div>
      <p className="relative mt-1.5 text-lg font-black tabular-nums text-slate-900 tracking-tight">{value}</p>
      {sub ? <p className="relative mt-0.5 text-[10px] font-medium text-slate-500 leading-snug line-clamp-2">{sub}</p> : null}
    </div>
  );
}

function SkeletonStrip() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-[88px] w-[132px] shrink-0 animate-pulse rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/80 motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

export function HelperStatsStrip({ dataLoading, stats, t }: Props) {
  if (dataLoading) {
    return (
      <div className="mb-4 rounded-2xl border border-slate-200/90 bg-white/90 p-3 shadow-sm ring-1 ring-slate-100/70">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="h-3 w-28 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
          <div className="h-3 w-16 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
        </div>
        <SkeletonStrip />
      </div>
    );
  }

  const rr = stats.responseRatePct !== null ? `${stats.responseRatePct}%` : '—';

  return (
    <div className="mb-4 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/60 p-3 shadow-sm ring-1 ring-slate-100/80">
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t('helper_dashboard.stats_strip_title')}</h3>
        <span className="text-[10px] font-semibold text-slate-400">{t('helper_dashboard.stats_strip_live')}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 hide-scrollbar scroll-smooth">
        <StatCard icon={Icons.Send} labelKey="helper_dashboard.stat_sent" value={String(stats.sent)} accent="sky" t={t} />
        <StatCard icon={Icons.CheckCircle2} labelKey="helper_dashboard.stat_accepted" value={String(stats.accepted)} accent="emerald" t={t} />
        <StatCard icon={Icons.BadgeCheck} labelKey="helper_dashboard.stat_completed" value={String(stats.completed)} accent="violet" t={t} />
        <StatCard icon={Icons.MessageCircle} labelKey="helper_dashboard.stat_response" value={rr} accent="cyan" t={t} />
        <StatCard
          icon={Icons.Star}
          labelKey="helper_dashboard.stat_rating"
          value={stats.avgRating.toFixed(1)}
          accent="amber"
          t={t}
        />
        <StatCard
          icon={Icons.Wallet}
          labelKey="helper_dashboard.stat_estimated"
          value={stats.estimatedEarnings}
          accent="indigo"
          t={t}
        />
        <StatCard
          icon={Icons.Shield}
          labelKey="helper_dashboard.stat_reputation"
          value={`${stats.reputation}`}
          sub={t('helper_dashboard.stat_reputation_sub')}
          accent="slate"
          t={t}
        />
        <StatCard
          icon={Icons.Sparkles}
          labelKey="helper_dashboard.stat_match"
          value={`${stats.matchScore}`}
          sub={t('helper_dashboard.stat_match_sub')}
          accent="rose"
          t={t}
        />
      </div>
    </div>
  );
}
