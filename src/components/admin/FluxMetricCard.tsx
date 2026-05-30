import type { LucideIcon } from 'lucide-react';

type Props = {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon: LucideIcon;
  accent?: 'violet' | 'blue' | 'emerald' | 'amber';
};

const accentMap = {
  violet: 'from-violet-500/20 to-violet-600/5 text-violet-300 border-violet-500/20',
  blue: 'from-blue-500/20 to-blue-600/5 text-blue-300 border-blue-500/20',
  emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-300 border-emerald-500/20',
  amber: 'from-amber-500/20 to-amber-600/5 text-amber-300 border-amber-500/20',
};

export function FluxMetricCard({ label, value, delta, deltaPositive, icon: Icon, accent = 'violet' }: Props) {
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-5 shadow-lg shadow-black/20 ${accentMap[accent]}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <div className="rounded-lg bg-white/5 p-2">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-3xl font-black tabular-nums text-white">{value}</p>
      {delta ? (
        <p className={`mt-2 text-xs font-bold ${deltaPositive ? 'text-emerald-400' : 'text-slate-500'}`}>
          {delta}
        </p>
      ) : null}
    </div>
  );
}
