import type { ReactNode } from 'react';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { CompletionRowKey, HelperCompletionBreakdown } from '@/utils/helperProfileCompletion';

type Props = {
  breakdown: HelperCompletionBreakdown;
  /** Called when user taps an incomplete row (optional — rows still show pointer when omitted). */
  onRowClick?: (key: CompletionRowKey) => void;
  /** Dynamic coaching tips (already translated strings). */
  suggestions?: string[];
  preview?: {
    latestPhotoThumb?: string | null;
    latestVideoThumb?: string | null;
    photoCount: number;
    videoCount: number;
  };
  showPortfolioHint?: boolean;
  onOpenPortfolio?: () => void;
};

export function HelperProfileCompletionBar({
  breakdown,
  onRowClick,
  suggestions = [],
  preview,
  showPortfolioHint,
  onOpenPortfolio,
}: Props) {
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
    {
      key: 'portfolioPhoto',
      labelKey: 'helper_profile_completion.item_portfolio_photo',
      icon: <Icons.Image className="w-3.5 h-3.5" />,
    },
    {
      key: 'portfolioVideo',
      labelKey: 'helper_profile_completion.item_portfolio_video',
      icon: <Icons.Video className="w-3.5 h-3.5" />,
    },
    {
      key: 'hasReviews',
      labelKey: 'helper_profile_completion.item_reviews',
      icon: <Icons.Star className="w-3.5 h-3.5" />,
    },
    {
      key: 'verified',
      labelKey: 'helper_profile_completion.item_verification',
      icon: <Icons.ShieldCheck className="w-3.5 h-3.5" />,
    },
  ];

  const pct = breakdown.percent;

  return (
    <div className="rounded-[var(--lh-radius-lg)] border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/40 to-indigo-50/25 p-5 shadow-[var(--lh-shadow-card)] ring-1 ring-white/60">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{t('helper_profile_completion.title')}</h3>
          <p className="text-[15px] font-bold text-slate-900 mt-1 leading-snug">{t('helper_profile_completion.subtitle')}</p>
        </div>
        <div className="relative w-[72px] h-[72px] shrink-0">
          <svg className="w-[72px] h-[72px] -rotate-90" viewBox="0 0 36 36" aria-hidden>
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
          <span className="absolute inset-0 flex items-center justify-center text-[13px] font-black tabular-nums text-slate-900 tracking-tight">
            {pct}%
          </span>
        </div>
      </div>

      {preview && (preview.photoCount > 0 || preview.videoCount > 0 || preview.latestPhotoThumb || preview.latestVideoThumb) ? (
        <div className="flex gap-3 mb-4 p-3 rounded-xl bg-white/70 border border-slate-100/90 shadow-inner">
          <div className="flex gap-2 shrink-0">
            {preview.latestPhotoThumb ? (
              <div className="relative w-14 h-14 rounded-lg overflow-hidden ring-2 ring-white shadow-sm bg-slate-100">
                <img src={preview.latestPhotoThumb} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent text-[9px] font-bold text-white text-center py-0.5">
                  {preview.photoCount}
                </span>
              </div>
            ) : null}
            {preview.latestVideoThumb ? (
              <div className="relative w-14 h-14 rounded-lg overflow-hidden ring-2 ring-white shadow-sm bg-slate-900">
                <img src={preview.latestVideoThumb} alt="" className="w-full h-full object-cover opacity-90" />
                <Icons.Play className="absolute inset-0 m-auto w-6 h-6 text-white drop-shadow-md" />
                <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-[9px] font-bold text-white text-center py-0.5">
                  {preview.videoCount}
                </span>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col justify-center min-w-0 text-[11px] leading-snug">
            <span className="font-bold text-slate-800">{t('helper_profile_completion.preview_label')}</span>
            <span className="text-slate-500 font-medium">
              {t('portfolio_onboarding.count_photos', { count: preview.photoCount })} · {t('portfolio_onboarding.count_videos', { count: preview.videoCount })}
            </span>
          </div>
        </div>
      ) : null}

      <ul className="space-y-1 mb-4">
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
              {!done && interactive ? (
                <Icons.ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              ) : null}
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
        <div className="rounded-xl bg-indigo-50/80 border border-indigo-100/80 px-3 py-2.5 mb-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-indigo-400 mb-1">{t('helper_profile_completion.coach_title')}</p>
          <ul className="space-y-1">
            {suggestions.map((line, i) => (
              <li
                key={i}
                className="text-[11px] font-medium text-indigo-950/90 leading-relaxed flex gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
                style={{ animationDelay: `${Math.min(i, 5) * 45}ms` }}
              >
                <span className="text-indigo-400 shrink-0">→</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showPortfolioHint && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 flex gap-2 items-start mb-3">
          <Icons.Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-medium text-amber-950 leading-relaxed">{t('helper_profile_completion.hint_portfolio')}</p>
        </div>
      )}

      {onOpenPortfolio && (
        <button
          type="button"
          onClick={onOpenPortfolio}
          className="w-full py-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition-colors min-h-[48px] shadow-md shadow-slate-900/10"
        >
          {t('helper_profile_completion.cta_portfolio')}
        </button>
      )}

      <p className="text-[10px] text-slate-400 font-medium mt-3 leading-relaxed">{t('helper_profile_completion.footer_hint')}</p>
    </div>
  );
}
