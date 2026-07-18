/** Micro-training catalog — content strings live under `training.lessons.*` (i18n). */

import type { LegacyHelperTierKey } from '@/types/helperSubscription';

export type TrainingLessonAccess = 'free' | 'pro' | 'elite';

export interface TrainingLessonDef {
  id: string;
  access: TrainingLessonAccess;
  /** Estimated duration for UX labels only (no heavy media attached). */
  durationSec: number;
}

/** Single concise lesson per module — optimized for 30s–2min reads. */
export const HELPER_TRAINING_LESSONS: TrainingLessonDef[] = [
  { id: 'free_quick_win', access: 'free', durationSec: 45 },
  { id: 'free_platform_basics', access: 'free', durationSec: 60 },
  { id: 'pro_profile_photos', access: 'pro', durationSec: 90 },
  { id: 'pro_videos_trust', access: 'pro', durationSec: 75 },
  { id: 'pro_reviews', access: 'pro', durationSec: 85 },
  { id: 'pro_portfolio_setup', access: 'pro', durationSec: 80 },
  { id: 'elite_visibility', access: 'elite', durationSec: 95 },
  { id: 'elite_convert_clients', access: 'elite', durationSec: 90 },
  { id: 'elite_local_reputation', access: 'elite', durationSec: 100 },
  { id: 'elite_opportunity_strategy', access: 'elite', durationSec: 105 },
];

export const FREE_LESSON_IDS = HELPER_TRAINING_LESSONS.filter((l) => l.access === 'free').map((l) => l.id);
export const PRO_LESSON_IDS = HELPER_TRAINING_LESSONS.filter((l) => l.access === 'pro').map((l) => l.id);
export const ELITE_LESSON_IDS = HELPER_TRAINING_LESSONS.filter((l) => l.access === 'elite').map((l) => l.id);

/** Legacy tier gate — not tied to session or billing. */
export function lessonsAccessibleForTier(tier: LegacyHelperTierKey): TrainingLessonDef[] {
  return HELPER_TRAINING_LESSONS.filter((l) => {
    if (l.access === 'free') return true;
    if (l.access === 'pro') return tier === 'PRO_HELP';
    return tier === 'ELITE' || tier === 'PRO_HELP';
  });
}
