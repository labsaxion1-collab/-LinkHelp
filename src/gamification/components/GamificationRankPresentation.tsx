import { clsx } from 'clsx';
import type { CSSProperties } from 'react';
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
import { resolveCompactRankHeroVisual, COMPACT_RANK_PEDESTAL_BOX, COMPACT_RANK_MEDAL_PEDESTAL_OVERLAP_CLASS } from '@/gamification/config/compactRankHeroVisual';
import { resolveMedalTheme } from '@/theme/medalThemes';
import { COMPACT_RANK_FULL_BLEED_CLASS } from '@/components/design-system/lhCenteredModalScale';

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
  const { medalSrc, currentLevelLabel, nextLevelLabel, progress, isMax, record } = model;
  const heroVisual = resolveCompactRankHeroVisual(userType, record.heroKey);
  const medalTheme = resolveMedalTheme(record.heroKey ?? record.levelKey, userType);

  return (
    <div
      className={clsx(
        COMPACT_RANK_FULL_BLEED_CLASS,
        'min-h-[170px] max-h-[210px] rounded-b-2xl border-y border-white/10 shadow-[0_14px_36px_rgba(0,0,0,0.28)] lg:rounded-2xl lg:border',
        className,
      )}
      data-testid="gamification-compact-rank-bleed"
    >
    <button
      type="button"
      onClick={onOpenDetails}
      className="group relative isolate flex h-full min-h-[170px] max-h-[210px] w-full items-stretch text-left transition hover:border-white/20 hover:shadow-[0_18px_42px_rgba(0,0,0,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      data-testid="gamification-compact-rank-card"
      data-hero-key={record.heroKey}
      aria-expanded={false}
    >
      <img
        src={heroVisual.background}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: heroVisual.scrim }}
        aria-hidden
      />
      <img
        src={heroVisual.particles}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-screen"
        loading="lazy"
        decoding="async"
      />

      <span className="lh-compact-rank-inner relative z-10 mx-auto flex h-full w-full items-stretch gap-2.5 px-4 py-3 sm:gap-3">
        {/*
          Compact rank stage layers (do not merge animation + optical scale):
          1. stage — medal+pedestal as one unit
          2. motion (lh-rank-compact-medal) — float keyframes only
          3. viewport — 88×88 overflow clip for PNG padding
          4. glyph — per-heroKey emblemScale / emblemOrigin
        */}
        <span
          className="lh-compact-rank-stage pointer-events-none relative flex w-[5.5rem] shrink-0 flex-col items-center justify-end self-stretch overflow-visible pb-0.5 pt-2 sm:w-[6rem]"
          aria-hidden
        >
          <span className="relative flex flex-col items-center">
            <span
              className={clsx(
                'lh-rank-compact-medal relative z-10 flex justify-center motion-reduce:animate-none',
                COMPACT_RANK_MEDAL_PEDESTAL_OVERLAP_CLASS,
              )}
            >
              <span className="lh-rank-compact-medal-viewport relative flex h-[5.5rem] w-[5.5rem] items-center justify-center overflow-hidden sm:h-[5.75rem] sm:w-[5.75rem]">
                <img
                  src={medalSrc}
                  alt=""
                  className="lh-rank-compact-medal-glyph h-full w-full max-w-none object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.45)]"
                  style={
                    {
                      '--lh-compact-emblem-scale': String(heroVisual.emblemScale),
                      '--lh-compact-emblem-origin': heroVisual.emblemOrigin,
                    } as CSSProperties
                  }
                  loading="lazy"
                  decoding="async"
                />
              </span>
            </span>
            <img
              src={heroVisual.pedestal}
              alt=""
              className={COMPACT_RANK_PEDESTAL_BOX.className}
              loading="lazy"
              decoding="async"
            />
          </span>
        </span>

        <span className="flex min-w-0 flex-1 flex-col justify-center gap-0 py-0.5">
          <span className="flex flex-col gap-0">
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white/55 sm:text-[10px]">
              {userType === 'helper'
                ? t('gamification.helper_level_eyebrow')
                : t('gamification.client_level_eyebrow')}
            </span>
            <span className="truncate text-[15px] font-black leading-tight text-white sm:text-base">
              {currentLevelLabel}
            </span>
            {!isMax ? (
              <span className="truncate text-[11px] font-semibold leading-snug text-white/72">
                {t('gamification.next_prefix', { level: nextLevelLabel })}
              </span>
            ) : (
              <span className="truncate text-[11px] font-semibold leading-snug text-emerald-200/90">
                {t('gamification.max_level_reached')}
              </span>
            )}
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/15">
              <span
                className="block h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${progress.progressPercent}%`,
                  background: medalTheme.gradient,
                  boxShadow: medalTheme.glow,
                }}
              />
            </span>
            <span className="shrink-0 tabular-nums text-[11px] font-black leading-none text-white">
              {progress.progressPercent}%
            </span>
          </span>
          <span className="mt-0.5 truncate text-[10px] font-semibold text-white/55">
            {isMax ? t('gamification.max_level_card') : formatProgressSubtitle(progress, 'hero', t)}
          </span>
        </span>

        <ChevronRight
          className="h-5 w-5 shrink-0 self-center text-white/35 transition group-hover:text-white/70"
          aria-hidden
        />
      </span>
    </button>
    </div>
  );
}

export function GamificationRankLoadingCard({ className }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <div
      className={clsx(
        COMPACT_RANK_FULL_BLEED_CLASS,
        'flex min-h-[170px] max-h-[210px] items-center justify-center rounded-b-2xl border-y border-white/10 bg-[#020804] text-white/70 shadow-[0_14px_36px_rgba(0,0,0,0.22)] lg:rounded-2xl lg:border',
        className,
      )}
      data-testid="gamification-compact-rank-loading"
    >
      <div className="lh-compact-rank-inner mx-auto flex w-full items-center justify-center gap-2 px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-lime-300/80" />
        <span className="text-sm font-medium">{t('gamification.loading_progress')}</span>
      </div>
    </div>
  );
}

export function GamificationRankUnavailableCard({ className }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <div
      className={clsx(
        COMPACT_RANK_FULL_BLEED_CLASS,
        'flex min-h-[170px] max-h-[210px] items-center justify-center rounded-b-2xl border-y border-white/10 bg-[#020804] text-sm font-medium text-white/60 shadow-[0_14px_36px_rgba(0,0,0,0.22)] lg:rounded-2xl lg:border',
        className,
      )}
      data-testid="gamification-compact-rank-unavailable"
    >
      <div className="lh-compact-rank-inner mx-auto w-full px-4 py-3 text-center">
        {t('gamification.progress_load_error')}
      </div>
    </div>
  );
}
