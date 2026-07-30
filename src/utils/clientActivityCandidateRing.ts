import type { Application } from '@/types/application';
import { getHelperRank } from '@/utils/linkHelpRanking';
import { MAX_JOB_INTERESTED } from '@/utils/applicationInterest';

export const CLIENT_ACTIVITY_RING_TRACK = '#E8ECF4';
export const CLIENT_ACTIVITY_VIP_GOLD = '#F59E0B';

/** First name only for compact candidate rows. */
export function firstNameFromHelperName(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

/** Official helper-rank accent for a candidate application. */
export function rankAccentForApplication(app: Pick<Application, 'helperJobs' | 'helperRating'>): string {
  return getHelperRank({
    completedCount: app.helperJobs ?? 0,
    averageRating: app.helperRating ?? 0,
  }).accent;
}

/**
 * Segment colors for the 3-slot arc (order of entry).
 * Filled slots use official rank accents; empty slots are null (neutral track).
 */
export function candidateRingSegmentColors(
  candidates: Pick<Application, 'helperJobs' | 'helperRating'>[],
  maxSlots: number = MAX_JOB_INTERESTED,
): Array<string | null> {
  const slots = Math.max(1, maxSlots);
  const ordered = candidates.slice(0, slots);
  return Array.from({ length: slots }, (_, i) =>
    ordered[i] ? rankAccentForApplication(ordered[i]) : null,
  );
}

/** Exclusive (VIP) locks the request — UI shows a full arc in that helper's rank color. */
export function resolveExclusiveCandidate(
  candidates: Application[],
  isExclusiveLocked: boolean,
): Application | null {
  if (!isExclusiveLocked) return null;
  const exclusive = candidates.find((a) => a.isExclusive === true);
  return exclusive ?? candidates[0] ?? null;
}
