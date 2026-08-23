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
import {
  resolveCompactRankHeroVisual,
  COMPACT_RANK_PEDESTAL_BOX,
  COMPACT_RANK_MEDAL_PEDESTAL_OVERLAP_CLASS,
  COMPACT_RANK_CLIENT_HOME_STAGE_OFFSET_Y_PX,
} from '@/gamification/config/compactRankHeroVisual';
import { buildCompactRankInsightChips } from '@/gamification/components/compactRankInsights';
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
  density?: 'default' | 'clientHome';
};

const COMPACT_RANK_HEIGHT = {
  default: 'min-h-[170px] max-h-[210px]',
  clientHome: 'min-h-[240px] max-h-[300px]',
} as const;

export function GamificationCompactRankCardSurface({
  userType,
  model,
  onOpenDetails,
  className,
  density = 'default',
}: CompactCardProps) {
  const { t } = useLanguage();
  const { medalSrc, currentLevelLabel, nextLevelLabel, progress, isMax, record } = model;
  const heroVisual = resolveCompactRankHeroVisual(userType, record.heroKey);
  const medalTheme = resolveMedalTheme(record.heroKey ?? record.levelKey, userType);
  const heightClass = COMPACT_RANK_HEIGHT[density];
  const isClientHome = density === 'clientHome';
  const insightChips = buildCompactRankInsightChips(model, t, { userType });

  const progressBlock = (
    <span
      className={clsx('flex w-full flex-col', isClientHome ? 'gap-1' : 'mt-1 gap-0.5')}
      data-testid={isClientHome ? 'gamification-compact-rank-progress-wide' : undefined}
    >
      <span className="flex items-center justify-between gap-2">
        <span
          className={clsx(
            'min-w-0 font-semibold leading-snug text-white/72',
            isClientHome ? 'whitespace-normal text-xs' : 'truncate text-[11px]',
          )}
        >
          {isMax
            ? t('gamification.max_level_reached')
            : t('gamification.next_prefix', { level: nextLevelLabel })}
        </span>
        <span className="shrink-0 tabular-nums text-[11px] font-black leading-none text-white">
          {progress.progressPercent}%
        </span>
      </span>
      <span className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
        <span
          className="block h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${progress.progressPercent}%`,
            background: medalTheme.gradient,
            boxShadow: medalTheme.glow,
          }}
        />
      </span>
      <span
        className={clsx(
          'font-semibold text-white/55',
          isClientHome ? 'whitespace-normal text-[11px] leading-snug' : 'truncate text-[10px]',
        )}
      >
        {isMax ? t('gamification.max_level_card') : formatProgressSubtitle(progress, 'hero', t)}
      </span>
    </span>
  );

  const stage = (
    <span
      className={clsx(
        'lh-compact-rank-stage pointer-events-none relative flex w-[5.5rem] shrink-0 flex-col items-center justify-end self-stretch overflow-visible pb-0.5 pt-1.5 sm:w-[6rem]',
        isClientHome && 'lh-compact-rank-stage--client-home',
      )}
      style={
        isClientHome
          ? ({
              '--lh-compact-client-home-stage-offset-y': `${COMPACT_RANK_CLIENT_HOME_STAGE_OFFSET_Y_PX}px`,
            } as CSSProperties)
          : undefined
      }
      aria-hidden
    >
      {/*
        Compact rank stage layers (do not merge animation + optical scale):
        1. stage — medal+pedestal as one unit
        2. motion (lh-rank-compact-medal) — float keyframes only
        3. viewport — medal clip / pedestal layout box
        4. glyph — per-heroKey emblemScale|pedestalScale + origin (+ emblemOffsetY)
      */}
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
                  '--lh-compact-emblem-offset-y': `${heroVisual.emblemOffsetY}px`,
                } as CSSProperties
              }
              loading="lazy"
              decoding="async"
            />
          </span>
        </span>
        <span className={COMPACT_RANK_PEDESTAL_BOX.className}>
          <img
            src={heroVisual.pedestal}
            alt=""
            className="lh-rank-compact-pedestal-glyph h-full w-full max-w-none object-contain opacity-95"
            style={
              {
                '--lh-compact-pedestal-scale': String(heroVisual.pedestalScale),
                '--lh-compact-pedestal-origin': heroVisual.pedestalOrigin,
              } as CSSProperties
            }
            loading="lazy"
            decoding="async"
          />
        </span>
      </span>
    </span>
  );

  return (
    <div
      className={clsx(
        COMPACT_RANK_FULL_BLEED_CLASS,
        heightClass,
        'rounded-b-2xl border-y border-white/10 shadow-[0_14px_36px_rgba(0,0,0,0.28)] lg:rounded-2xl lg:border',
        className,
      )}
      data-testid="gamification-compact-rank-bleed"
      data-rank-density={density}
    >
      <button
        type="button"
        onClick={onOpenDetails}
        className={clsx(
          'group relative isolate flex h-full w-full items-stretch text-left transition hover:border-white/20 hover:shadow-[0_18px_42px_rgba(0,0,0,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
          heightClass,
        )}
        data-testid="gamification-compact-rank-card"
        data-hero-key={record.heroKey}
        aria-expanded={false}
        aria-label={t('gamification.compact_rank_open_details', {
          level: currentLevelLabel,
        })}
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
          className={clsx(
            'pointer-events-none absolute inset-0 h-full w-full object-cover mix-blend-screen',
            isClientHome ? 'opacity-22' : 'opacity-35',
          )}
          loading="lazy"
          decoding="async"
        />

        <span
          className={clsx(
            'lh-compact-rank-inner relative z-10 mx-auto flex h-full w-full px-4 py-3',
            isClientHome ? 'flex-col gap-2.5' : 'items-stretch gap-2 sm:gap-2.5',
          )}
        >
          <span
            className={clsx(
              'flex min-h-0 min-w-0',
              isClientHome ? 'flex-1 items-stretch gap-2' : 'h-full w-full items-stretch gap-2 sm:gap-2.5',
            )}
          >
            {stage}

            <span
              className={clsx(
                'flex min-w-0 flex-1 flex-col py-0.5',
                isClientHome ? 'justify-center gap-1.5 text-left' : 'justify-center gap-0',
              )}
            >
              <span className="flex flex-col gap-0.5 text-left">
                <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white/55 sm:text-[10px]">
                  {userType === 'helper'
                    ? t('gamification.helper_level_eyebrow')
                    : t('gamification.client_level_eyebrow')}
                </span>
                <span
                  className={clsx(
                    'font-black leading-tight text-white',
                    isClientHome
                      ? 'whitespace-normal text-base sm:text-lg'
                      : 'truncate text-[15px] sm:text-base',
                  )}
                >
                  {currentLevelLabel}
                </span>
                {isClientHome ? (
                  <span
                    className="whitespace-normal text-[13px] font-semibold leading-snug text-white/80 sm:text-sm"
                    data-testid="gamification-compact-rank-impact"
                  >
                    {t('gamification.compact_client_impact')}
                  </span>
                ) : null}
              </span>

              {!isClientHome ? progressBlock : null}

              {!isClientHome && insightChips.length > 0 ? (
                <span
                  className="mt-1.5 flex flex-wrap gap-1"
                  data-testid="gamification-compact-rank-insights"
                >
                  {insightChips.map((chip) => (
                    <span
                      key={chip.id}
                      className="inline-flex max-w-full items-center rounded-full border border-white/15 bg-black/35 px-2 py-0.5 text-[10px] font-bold leading-none text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[2px]"
                    >
                      {chip.label}
                    </span>
                  ))}
                </span>
              ) : null}
            </span>

            <ChevronRight
              className="h-5 w-5 shrink-0 self-center text-white/35 transition group-hover:text-white/70"
              aria-hidden
            />
          </span>

          {isClientHome ? (
            <span className="flex w-full min-w-0 flex-col gap-1.5">
              {progressBlock}
              {insightChips.length > 0 ? (
                <span
                  className="flex flex-wrap gap-1"
                  data-testid="gamification-compact-rank-insights"
                >
                  {insightChips.map((chip) => (
                    <span
                      key={chip.id}
                      className="inline-flex max-w-full items-center rounded-full border border-white/15 bg-black/35 px-2 py-0.5 text-[10px] font-bold leading-none text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[2px]"
                    >
                      {chip.label}
                    </span>
                  ))}
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
      </button>
    </div>
  );
}

export function GamificationRankLoadingCard({
  className,
  density = 'default',
}: {
  className?: string;
  density?: 'default' | 'clientHome';
}) {
  const { t } = useLanguage();
  const heightClass = COMPACT_RANK_HEIGHT[density];
  return (
    <div
      className={clsx(
        COMPACT_RANK_FULL_BLEED_CLASS,
        heightClass,
        'flex items-center justify-center rounded-b-2xl border-y border-white/10 bg-[#020804] text-white/70 shadow-[0_14px_36px_rgba(0,0,0,0.22)] lg:rounded-2xl lg:border',
        className,
      )}
      data-testid="gamification-compact-rank-loading"
      data-rank-density={density}
    >
      <div className="lh-compact-rank-inner mx-auto flex w-full items-center justify-center gap-2 px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-lime-300/80" />
        <span className="text-sm font-medium">{t('gamification.loading_progress')}</span>
      </div>
    </div>
  );
}

export function GamificationRankUnavailableCard({
  className,
  density = 'default',
}: {
  className?: string;
  density?: 'default' | 'clientHome';
}) {
  const { t } = useLanguage();
  const heightClass = COMPACT_RANK_HEIGHT[density];
  return (
    <div
      className={clsx(
        COMPACT_RANK_FULL_BLEED_CLASS,
        heightClass,
        'flex items-center justify-center rounded-b-2xl border-y border-white/10 bg-[#020804] text-sm font-medium text-white/60 shadow-[0_14px_36px_rgba(0,0,0,0.22)] lg:rounded-2xl lg:border',
        className,
      )}
      data-testid="gamification-compact-rank-unavailable"
      data-rank-density={density}
    >
      <div className="lh-compact-rank-inner mx-auto w-full px-4 py-3 text-center">
        {t('gamification.progress_load_error')}
      </div>
    </div>
  );
}
