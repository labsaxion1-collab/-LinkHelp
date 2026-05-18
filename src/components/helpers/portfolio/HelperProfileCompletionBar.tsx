import type { ReactNode } from 'react';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { CompletionRowKey, HelperCompletionBreakdown } from '@/utils/helperProfileCompletion';

type Props = {
  breakdown: HelperCompletionBreakdown;
  onRowClick?: (key: CompletionRowKey) => void;
  suggestions?: string[];
};

export function HelperProfileCompletionBar({ breakdown, onRowClick, suggestions = [] }: Props) {
  const { t } = useLanguage();

  const rows: { key: CompletionRowKey; labelKey: string; icon: ReactNode }[] = [
    {
      key: 'profilePhoto',
      labelKey: 'helper_profile_completion.item_profile_photo',
      icon: <Icons.User className="w-3.5 h-3.5" />,
    },
    {
      key: 'skillsSelected',
      labelKey: 'helper_profile_completion.item_skills',
      icon: <Icons.Wrench className="w-3.5 h-3.5" />,
    },
  ];

  const pct = breakdown.percent;

  if (pct >= 100) return null;

  return (
    <div className="rounded-[var(--lh-radius-lg)] border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/40 to-indigo-50/25 p-4 shadow-[var(--lh-shadow-card)] ring-1 ring-white/60">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{t('helper_profile_completion.title')}</h3>
          <p className="text-[14px] font-bold text-slate-900 mt-1 leading-snug">{t('helper_profile_completion.subtitle')}</p>
        </div>
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36" aria-hidden>
            <path
              className="text-slate-200/90"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-indigo-500 drop-shadow-sm"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${pct}, 100`}
              style={{ transition: 'stroke-dasharray 0.65s cubic-bezier(0.4, 0, 0.2, 1)' }}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[12px] font-black tabular-nums text-slate-900 tracking-tight">
            {pct}%
          </span>
        </div>
      </div>

      <ul className="space-y-1 mb-3">
        {rows.map((row) => {
          const done = Boolean(breakdown[row.key]);
          const interactive = Boolean(onRowClick);
          const Body = (
            <>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 transition-colors ${
                  done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {done ? <Icons.Check className="w-4 h-4" strokeWidth={3} /> : row.icon}
              </span>
              <span className={`flex-1 text-left text-[12px] font-semibold leading-snug ${done ? 'text-slate-800' : 'text-slate-600'}`}>
                {t(row.labelKey)}
              </span>
              {!done && interactive ? <Icons.ChevronRight className="w-4 h-4 text-slate-300 shrink-0" /> : null}
            </>
          );
          const cls = `w-full flex items-center gap-3 rounded-xl px-2 py-2 min-h-[44px] transition-colors ${
            interactive ? 'hover:bg-white/80 hover:shadow-sm cursor-pointer active:scale-[0.99]' : ''
          } ${!done && interactive ? 'ring-1 ring-transparent hover:ring-slate-200/80' : ''}`;

          if (interactive) {
            return (
              <li key={row.key}>
                <button type="button" className={cls} onClick={() => onRowClick?.(row.key)}>
                  {Body}
                </button>
              </li>
            );
          }
          return (
            <li key={row.key}>
              <div className="flex items-center gap-3 px-2 py-2 min-h-[44px] rounded-xl">{Body}</div>
            </li>
          );
        })}
      </ul>

      {suggestions.length > 0 ? (
        <div className="rounded-xl bg-indigo-50/80 border border-indigo-100/80 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wide text-indigo-400 mb-1">{t('helper_profile_completion.coach_title')}</p>
          <ul className="space-y-1">
            {suggestions.map((line, i) => (
              <li key={i} className="text-[11px] font-medium text-indigo-950/90 leading-relaxed flex gap-2">
                <span className="text-indigo-400 shrink-0">→</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
