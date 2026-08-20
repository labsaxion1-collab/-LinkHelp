import { clsx } from 'clsx';
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  HelpCircle,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { formatProgressSubtitle, getProgressToNextLevel } from '@/gamification/engines/progressEngine';
import { MEDAL_MAP } from '@/gamification/config/gamificationMedals';
import { EMPTY_GAMIFICATION_STATS } from '@/gamification/services/gamificationStatsAdapter';
import type { UserGamificationRecord } from '@/gamification/services/gamificationService';
import type { UserType } from '@/gamification/types/gamification';
import { translateGamificationLevelName } from '@/utils/gamificationLevelI18n';

const PROGRESS_MEDAL_ACCENT = {
  textClass: 'lh-medal-primary',
  iconClass: 'lh-medal-icon border lh-medal-border',
  cardTrackClass: 'lh-medal-light-bg',
  cardBarClass: 'lh-medal-progress-bar',
  tutorialButtonClass:
    'border lh-medal-border lh-medal-light-bg lh-medal-text hover:opacity-90',
} as const;

export type GamificationRankProgressModel = ReturnType<typeof buildGamificationRankProgressModel>;

export function buildGamificationRankProgressModel(
  userType: UserType,
  record: UserGamificationRecord | null | undefined,
  t: (key: string, options?: Record<string, string | number>) => string,
) {
  if (!record) return null;
  const progress = getProgressToNextLevel(
    userType,
    record.score,
    record.stats ?? EMPTY_GAMIFICATION_STATS,
    record.levelKey,
    t,
  );
  const missingRequirements = [
    ...(progress.pointsToNext > 0
      ? [t('gamification.reach_more_points', { count: progress.pointsToNext })]
      : []),
    ...progress.missingRequirements,
  ];
  return {
    record,
    progress,
    missingRequirements,
    medalSrc: MEDAL_MAP[record.heroKey] ?? MEDAL_MAP[`${userType}_novo`],
    currentLevelLabel: translateGamificationLevelName(userType, progress.currentLevel.key, t),
    nextLevelLabel: progress.nextLevel
      ? translateGamificationLevelName(userType, progress.nextLevel.key, t)
      : '',
    isMax: progress.nextLevel === null,
  };
}

type RankProgressBodyProps = {
  userType: UserType;
  model: GamificationRankProgressModel;
  onOpenTutorial: () => void;
  compact?: boolean;
};

export function GamificationRankProgressBody({
  userType,
  model,
  onOpenTutorial,
  compact = false,
}: RankProgressBodyProps) {
  const { t } = useLanguage();
  const accentTheme = PROGRESS_MEDAL_ACCENT;
  const { progress, missingRequirements, isMax, nextLevelLabel, currentLevelLabel } = model;

  if (isMax) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5">
        <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-sm font-bold text-emerald-800">{t('gamification.max_level_card')}</p>
      </div>
    );
  }

  return (
    <>
      <div className={compact ? 'mt-0' : 'mt-1'}>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1 text-xs font-bold text-slate-500">
            <TrendingUp className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {t('gamification.next_prefix', { level: nextLevelLabel })}
            </span>
          </span>
          <span className="shrink-0 tabular-nums text-xs font-black text-slate-700">
            {progress.progressPercent}%
          </span>
        </div>
        <div className={clsx('h-1.5 w-full overflow-hidden rounded-full', accentTheme.cardTrackClass)}>
          <div
            className={clsx(
              'h-full rounded-full transition-[width] duration-500 ease-out',
              accentTheme.cardBarClass,
            )}
            style={{ width: `${progress.progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progress.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('gamification.progress_to', { level: nextLevelLabel })}
          />
        </div>
        <p className="mt-1 text-[11px] font-semibold text-slate-500">
          {formatProgressSubtitle(progress, compact ? 'hero' : 'card', t)}
        </p>
      </div>

      {!compact && missingRequirements.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t('gamification.missing_heading')}
          </p>
          <ul className="space-y-1.5">
            {missingRequirements.map((req) => (
              <li
                key={req}
                className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onOpenTutorial}
        className={clsx(
          'inline-flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-black transition',
          accentTheme.tutorialButtonClass,
          compact ? 'mt-2' : 'mt-4',
        )}
      >
        <HelpCircle className="h-4 w-4 shrink-0" />
        {t('gamification.tutorial_cta')}
      </button>
    </>
  );
}

type CompactCardProps = {
  userType: UserType;
  model: GamificationRankProgressModel;
  onOpenDetails: () => void;
  className?: string;
};

export function GamificationCompactRankCardSurface({
  userType,
  model,
  onOpenDetails,
  className,
}: CompactCardProps) {
  const { t } = useLanguage();
  const { medalSrc, currentLevelLabel, nextLevelLabel, progress, isMax } = model;

  return (
    <button
      type="button"
      onClick={onOpenDetails}
      className={clsx(
        'group relative flex w-full min-h-[110px] max-h-[140px] items-stretch gap-3 overflow-hidden rounded-2xl border border-slate-200/90 bg-white px-3 py-3 text-left shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:border-blue-200 hover:shadow-[0_12px_28px_rgba(37,99,255,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
        className,
      )}
      data-testid="gamification-compact-rank-card"
      aria-expanded={false}
    >
      <span
        className="pointer-events-none relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center self-center"
        aria-hidden
      >
        <img
          src={medalSrc}
          alt=""
          className="lh-rank-compact-medal h-[3.25rem] w-[3.25rem] object-contain drop-shadow-sm motion-reduce:animate-none"
          loading="lazy"
          decoding="async"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {userType === 'helper'
            ? t('gamification.helper_level_eyebrow')
            : t('gamification.client_level_eyebrow')}
        </span>
        <span className="truncate text-sm font-black text-slate-950 sm:text-base">{currentLevelLabel}</span>
        {!isMax ? (
          <span className="truncate text-[11px] font-semibold text-slate-500">
            {t('gamification.next_prefix', { level: nextLevelLabel })}
          </span>
        ) : null}
        <span className="mt-1.5 flex items-center gap-2">
          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full lh-medal-light-bg">
            <span
              className="block h-full rounded-full lh-medal-progress-bar transition-[width] duration-500 ease-out"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </span>
          <span className="shrink-0 tabular-nums text-[11px] font-black text-slate-700">
            {progress.progressPercent}%
          </span>
        </span>
        <span className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
          {isMax
            ? t('gamification.max_level_reached')
            : formatProgressSubtitle(progress, 'hero', t)}
        </span>
      </span>
      <ChevronRight
        className="h-5 w-5 shrink-0 self-center text-slate-300 transition group-hover:text-blue-500"
        aria-hidden
      />
    </button>
  );
}

export function GamificationRankLoadingCard({ className }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <div
      className={clsx(
        'flex min-h-[110px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3',
        className,
      )}
      data-testid="gamification-compact-rank-loading"
    >
      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      <span className="text-sm font-medium text-slate-400">{t('gamification.loading_progress')}</span>
    </div>
  );
}

export function GamificationRankUnavailableCard({ className }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <div
      className={clsx(
        'flex min-h-[110px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500',
        className,
      )}
      data-testid="gamification-compact-rank-unavailable"
    >
      {t('gamification.progress_load_error')}
    </div>
  );
}
