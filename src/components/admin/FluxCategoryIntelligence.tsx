import { Layers } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
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
  const { t } = useLanguage();

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0E1422]/90 p-5 shadow-xl shadow-black/30">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
          <Layers className="h-5 w-5 text-violet-300" />
        </div>
        <div>
          <h2 className="text-base font-black text-white">{t('flux_admin.category_intel_title')}</h2>
          <p className="text-xs font-medium text-slate-500">{t('flux_admin.category_intel_sub')}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/8 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th className="pb-3 pr-4">{t('flux_admin.col_category')}</th>
              <th className="pb-3 pr-4">{t('flux_admin.col_open')}</th>
              <th className="pb-3 pr-4">{t('flux_admin.col_applications')}</th>
              <th className="pb-3 pr-4">{t('flux_admin.col_hire_rate')}</th>
              <th className="pb-3 pr-4">{t('flux_admin.col_avg_budget')}</th>
              <th className="pb-3">{t('flux_admin.col_trend')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => {
              const IconComponent = getCategoryLucideIcon(row.icon);
              const trendLabel =
                row.trend === 'up'
                  ? t('flux_admin.trend_up')
                  : row.trend === 'down'
                    ? t('flux_admin.trend_down')
                    : t('flux_admin.trend_flat');
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
                  <td className="py-3.5 pr-4 font-semibold tabular-nums text-slate-300">{row.hireRate}%</td>
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
