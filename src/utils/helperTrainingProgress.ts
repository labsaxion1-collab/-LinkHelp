import type { HelperPortfolioPersist } from '@/utils/helperPortfolioState';
import { loadHelperProfileSettings, type HelperProfileSettings } from '@/utils/helperProfileSettings';
import {
  ELITE_LESSON_IDS,
  FREE_LESSON_IDS,
  HELPER_TRAINING_LESSONS,
  PRO_LESSON_IDS,
  lessonsAccessibleForTier,
} from '@/data/helperTrainingCatalog';
import type { HelperSubscriptionTier } from '@/types/helperSubscription';
import { computeHelperProfileCompletion } from '@/utils/helperProfileCompletion';

const STORAGE_KEY = 'linkhelp_helper_training_v1';

export interface HelperTrainingPersist {
  completedLessonIds: string[];
  /** Lightweight achievement ids — extend for analytics / AI later */
  achievementIds: string[];
}

function empty(): HelperTrainingPersist {
  return { completedLessonIds: [], achievementIds: [] };
}

export function loadTrainingProgress(): HelperTrainingPersist {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Partial<HelperTrainingPersist>;
    return {
      completedLessonIds: Array.isArray(p.completedLessonIds) ? p.completedLessonIds : [],
      achievementIds: Array.isArray(p.achievementIds) ? p.achievementIds : [],
    };
  } catch {
    return empty();
  }
}

export function saveTrainingProgress(state: HelperTrainingPersist): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function markLessonComplete(
  prev: HelperTrainingPersist,
  lessonId: string,
  opts?: {
    portfolio?: HelperPortfolioPersist;
    profile?: HelperProfileSettings;
    profileBreakdownPercent?: number;
    avatarUrl?: string | null;
  },
): HelperTrainingPersist {
  const completedLessonIds = prev.completedLessonIds.includes(lessonId)
    ? prev.completedLessonIds
    : [...prev.completedLessonIds, lessonId];

  let achievementIds = [...prev.achievementIds];

  if (completedLessonIds.length >= 1 && !achievementIds.includes('first_training')) {
    achievementIds.push('first_training');
  }

  const portfolio = opts?.portfolio;
  const photoCount =
    portfolio?.items?.filter((i) => i.kind === 'photo').length ??
    /* legacy */ (portfolio as { photos?: unknown[] })?.photos?.length ??
    0;
  if (portfolio && photoCount >= 3 && !achievementIds.includes('portfolio_expert')) {
    achievementIds.push('portfolio_expert');
  }
  const videoCount =
    portfolio?.items?.filter((i) => i.kind === 'video').length ??
    (portfolio as { videos?: unknown[] })?.videos?.length ??
    0;
  if (portfolio && videoCount >= 1 && !achievementIds.includes('video_verified')) {
    achievementIds.push('video_verified');
  }

  const pct =
    opts?.profileBreakdownPercent ??
    computeHelperProfileCompletion(opts?.profile ?? loadHelperProfileSettings(), opts?.avatarUrl).percent;
  if (pct >= 80 && !achievementIds.includes('trusted_profile')) {
    achievementIds.push('trusted_profile');
  }

  return { completedLessonIds, achievementIds };
}

export function trainingCompletionRatio(tier: HelperSubscriptionTier, completedIds: string[]): number {
  const accessible = lessonsAccessibleForTier(tier);
  if (accessible.length === 0) return 0;
  const set = new Set(completedIds);
  const done = accessible.filter((l) => set.has(l.id)).length;
  return Math.round((done / accessible.length) * 100);
}

export function combinedProfileStrengthPercent(
  profilePercent: number,
  tier: HelperSubscriptionTier,
  completedLessonIds: string[],
): number {
  const trainingPct = trainingCompletionRatio(tier, completedLessonIds);
  return Math.min(100, Math.round(profilePercent * 0.55 + trainingPct * 0.45));
}

/** Certification tiers — LinkHelp Trained family */
export type TrainingCertLevel = 'none' | 'basic' | 'pro' | 'elite';

export function computeTrainingCertLevel(
  tier: HelperSubscriptionTier,
  completedLessonIds: string[],
): TrainingCertLevel {
  const done = new Set(completedLessonIds);

  const freeDone = FREE_LESSON_IDS.every((id) => done.has(id));
  const proDone = PRO_LESSON_IDS.every((id) => done.has(id));
  const eliteDone = ELITE_LESSON_IDS.every((id) => done.has(id));

  if ((tier === 'ELITE' || tier === 'PRO_HELP') && eliteDone) return 'elite';
  if (tier === 'PRO_HELP' && proDone) return 'pro';
  if (freeDone) return 'basic';
  return 'none';
}

export function totalLessonCount(): number {
  return HELPER_TRAINING_LESSONS.length;
}
