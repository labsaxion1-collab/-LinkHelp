import type { GamificationRankProgressModel } from '@/gamification/components/GamificationRankPresentation';
import { EMPTY_GAMIFICATION_STATS } from '@/gamification/services/gamificationStatsAdapter';
import type { UserType } from '@/gamification/types/gamification';

type TFn = (key: string, options?: Record<string, string | number>) => string;

export type CompactRankInsightChip = {
  id: 'score' | 'services' | 'rating' | 'response' | 'applications' | 'profile';
  label: string;
};

type BuildOptions = {
  userType: UserType;
};

function formatAvgRatingChip(
  avgRating: number,
  t: TFn,
): CompactRankInsightChip {
  if (!Number.isFinite(avgRating) || avgRating <= 0) {
    return {
      id: 'rating',
      label: t('gamification.compact_chip_rating_none'),
    };
  }
  const rounded = Math.round(avgRating * 10) / 10;
  return {
    id: 'rating',
    label: t('gamification.compact_chip_rating', { rating: rounded }),
  };
}

/**
 * Compact premium chips for helper / client home rank cards.
 * Uses score + next-level requirement metrics from the progress engine —
 * never invents values. Client always surfaces rating (with honest empty fallback).
 */
export function buildCompactRankInsightChips(
  model: NonNullable<GamificationRankProgressModel>,
  t: TFn,
  options: BuildOptions,
): CompactRankInsightChip[] {
  const chips: CompactRankInsightChip[] = [
    {
      id: 'score',
      label: t('gamification.compact_chip_score', { count: model.record.score }),
    },
  ];

  const stats = model.record.stats ?? EMPTY_GAMIFICATION_STATS;

  if (model.isMax || !model.progress.nextLevel) {
    if (options.userType === 'client') {
      chips.push(formatAvgRatingChip(stats.avgRating, t));
    }
    return chips.slice(0, 4);
  }

  const requirements = model.progress.nextLevel.requirements;

  if (requirements.minTotalCompleted !== undefined) {
    const remaining = Math.max(0, requirements.minTotalCompleted - stats.totalCompleted);
    chips.push({
      id: 'services',
      label:
        options.userType === 'client'
          ? t('gamification.compact_chip_orders', { count: remaining })
          : t('gamification.compact_chip_services', { count: remaining }),
    });
  }

  if (options.userType === 'client') {
    chips.push(formatAvgRatingChip(stats.avgRating, t));
  } else if (requirements.minAvgRating !== undefined) {
    chips.push({
      id: 'rating',
      label: t('gamification.compact_chip_rating', { rating: requirements.minAvgRating }),
    });
  }

  if (requirements.minResponseRate !== undefined) {
    chips.push({
      id: 'response',
      label: t('gamification.compact_chip_response', { pct: requirements.minResponseRate }),
    });
  }

  if (requirements.minApplications !== undefined && chips.length < 4) {
    const remaining = Math.max(0, requirements.minApplications - stats.applicationsCount);
    chips.push({
      id: 'applications',
      label: t('gamification.compact_chip_applications', { count: remaining }),
    });
  }

  if (requirements.minProfilePct !== undefined && chips.length < 4) {
    chips.push({
      id: 'profile',
      label: t('gamification.compact_chip_profile', { pct: requirements.minProfilePct }),
    });
  }

  return chips.slice(0, 4);
}
