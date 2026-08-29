import { Layers } from 'lucide-react';
import { FLUX_PT } from '@/admin/fluxPtCopy';
import { formatAdminPercent } from '@/admin/fluxFormat';
import { getCategoryLucideIcon } from '@/utils/categoryIcons';

export type CategoryIntelRow = {
  id: string;
  label: string;
  icon: string;
  openRequests: number;
  applications: number;
  hireRate: number;
  avgBudget: string;
  trend: 'up' | 'flat' | 'down';
};

type Props = {
  rows: CategoryIntelRow[];
};

export function FluxCategoryIntelligence({ rows }: Props) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0E1422]/90 p-5 shadow-xl shadow-black/30">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
          <Layers className="h-5 w-5 text-violet-300" />
        </div>
        <div>
          <h2 className="text-base font-black text-white">{FLUX_PT.categoryIntelTitle}</h2>
          <p className="text-xs font-medium text-slate-500">{FLUX_PT.categoryIntelSub}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/8 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th className="pb-3 pr-4">{FLUX_PT.colCategory}</th>
              <th className="pb-3 pr-4">{FLUX_PT.colOpen}</th>
              <th className="pb-3 pr-4">{FLUX_PT.colApplications}</th>
              <th className="pb-3 pr-4">{FLUX_PT.colHireRate}</th>
              <th className="pb-3 pr-4">{FLUX_PT.colAvgBudget}</th>
              <th className="pb-3">{FLUX_PT.colTrend}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => {
              const IconComponent = getCategoryLucideIcon(row.icon);
              const trendLabel =
                row.trend === 'up'
                  ? FLUX_PT.trendUp
                  : row.trend === 'down'
                    ? FLUX_PT.trendDown
                    : FLUX_PT.trendFlat;
              const trendClass =
                row.trend === 'up' ? 'text-emerald-400' : row.trend === 'down' ? 'text-red-400' : 'text-slate-400';
              return (
                <tr key={row.id} className="group hover:bg-white/[0.02]">
                  <td className="py-3.5 pr-4">
                    <span className="flex items-center gap-2.5 font-bold text-white">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-violet-300">
                        <IconComponent className="h-4 w-4" />
                      </span>
                      {row.label}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 font-semibold tabular-nums text-slate-300">{row.openRequests}</td>
                  <td className="py-3.5 pr-4 font-semibold tabular-nums text-slate-300">{row.applications}</td>
                  <td className="py-3.5 pr-4 font-semibold tabular-nums text-slate-300">
                    {formatAdminPercent(row.hireRate)}
                  </td>
                  <td className="py-3.5 pr-4 font-semibold text-slate-300">{row.avgBudget}</td>
                  <td className={`py-3.5 text-xs font-bold ${trendClass}`}>{trendLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
