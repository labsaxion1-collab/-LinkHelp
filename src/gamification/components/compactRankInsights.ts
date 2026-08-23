import type { GamificationRankProgressModel } from '@/gamification/components/GamificationRankPresentation';
import { EMPTY_GAMIFICATION_STATS } from '@/gamification/services/gamificationStatsAdapter';

type TFn = (key: string, options?: Record<string, string | number>) => string;

export type CompactRankInsightChip = {
  id: 'score' | 'services' | 'rating' | 'response' | 'applications' | 'profile';
  label: string;
};

/**
 * Compact premium chips for the helper home rank card.
 * Uses the same score + next-level requirement metrics shown in the detail panel —
 * never invents values; skips metrics that do not apply to the next level.
 */
export function buildCompactRankInsightChips(
  model: NonNullable<GamificationRankProgressModel>,
  t: TFn,
): CompactRankInsightChip[] {
  const chips: CompactRankInsightChip[] = [
    {
      id: 'score',
      label: t('gamification.compact_chip_score', { count: model.record.score }),
    },
  ];

  if (model.isMax || !model.progress.nextLevel) {
    return chips;
  }

  const requirements = model.progress.nextLevel.requirements;
  const stats = model.record.stats ?? EMPTY_GAMIFICATION_STATS;

  if (requirements.minTotalCompleted !== undefined) {
    const remaining = Math.max(0, requirements.minTotalCompleted - stats.totalCompleted);
    chips.push({
      id: 'services',
      label: t('gamification.compact_chip_services', { count: remaining }),
    });
  }

  if (requirements.minAvgRating !== undefined) {
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
