import { TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { HELPER_SCORE_CATEGORIES, MOCK_HELPER_SCORE } from '@/config/helperScoreConfig';

type Props = { className?: string };

export function HelperScorePanel({ className = '' }: Props) {
  const { t } = useLanguage();
  const data = MOCK_HELPER_SCORE;

  return (
    <section className={`rounded-2xl lh-glass-card-solid p-4 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-blue-600">{t('helper_score.title')}</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-slate-950">{data.overall}</p>
          <p className="text-xs font-medium text-slate-500">{t('helper_score.evolution', { delta: data.evolutionDelta })}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
          <TrendingUp className="h-3.5 w-3.5" />
          {data.trendLabel}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {HELPER_SCORE_CATEGORIES.map((cat) => (
          <div key={cat.id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-slate-400">{t(cat.labelKey)}</p>
            <p className="text-lg font-black text-slate-900">{data.categories[cat.id] ?? '—'}</p>
          </div>
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {data.feedback.map((item) => (
          <li
            key={item.id}
            className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-medium ${
              item.tone === 'positive' ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'
            }`}
          >
            {item.tone === 'positive' ? (
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            {t(item.messageKey)}
          </li>
        ))}
      </ul>
    </section>
  );
}
