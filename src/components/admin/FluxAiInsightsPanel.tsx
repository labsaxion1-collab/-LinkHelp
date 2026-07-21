import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { FLUX_PT, INSIGHT_TYPE_LABEL_PT } from '@/admin/fluxPtCopy';

type Insight = {
  id: string;
  type: 'opportunity' | 'risk' | 'trend';
  title: string;
  body: string;
  score?: number;
};

type Props = {
  insights: Insight[];
  demo?: boolean;
};

const typeStyles = {
  opportunity: { icon: Lightbulb, className: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-300' },
  risk: { icon: AlertTriangle, className: 'border-amber-500/25 bg-amber-500/5 text-amber-300' },
  trend: { icon: TrendingUp, className: 'border-blue-500/25 bg-blue-500/5 text-blue-300' },
};

export function FluxAiInsightsPanel({ insights, demo = false }: Props) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0E1422]/90 p-5 shadow-xl shadow-black/30">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-lg shadow-violet-900/40">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-black text-white">{FLUX_PT.aiInsightsTitle}</h2>
            {demo ? (
              <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-200">
                {FLUX_PT.marketPulseDemoLabel}
              </span>
            ) : null}
          </div>
          <p className="text-xs font-medium text-slate-500">
            {demo ? FLUX_PT.aiInsightsDemoSub : FLUX_PT.aiInsightsSub}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => {
          const style = typeStyles[insight.type];
          const Icon = style.icon;
          return (
            <article
              key={insight.id}
              className={`rounded-xl border p-4 transition-colors hover:bg-white/[0.02] ${style.className.split(' ').slice(1).join(' ')} border-white/10 bg-white/[0.02]`}
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon className={`h-4 w-4 ${style.className.split(' ').pop()}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {INSIGHT_TYPE_LABEL_PT[insight.type]}
                </span>
                {insight.score != null ? (
                  <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black text-white">
                    {insight.score}%
                  </span>
                ) : null}
              </div>
              <h3 className="text-sm font-black text-white">{insight.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{insight.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
