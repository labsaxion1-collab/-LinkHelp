import type { Job } from '@/types/job';
import { distanceKm } from '@/utils/distance';
import { jobCoordinates, type Coordinates } from '@/utils/geocodeLocation';

export type MatchTier = 'urgent' | 'normal' | 'planned' | 'large';

/** Max search radius (km) per job urgency / schedule profile. */
export function matchRadiusKm(tier: MatchTier): number {
  switch (tier) {
    case 'urgent':
      return 10;
    case 'normal':
      return 25;
    case 'planned':
      return 50;
    case 'large':
      return 75;
    default:
      return 25;
  }
}

export function classifyJobMatchTier(job: Job): MatchTier {
  if (job.category === 'moving') return 'large';

  const schedule = job.date?.trim() ?? '';
  if (schedule === '__flexible') return 'planned';

  if (job.urgency === 'high' && (schedule === '__now' || schedule === '__today')) {
    return 'urgent';
  }

  if (schedule === '__soon') return 'normal';

  return 'normal';
}

export function distanceToJobKm(origin: Coordinates, job: Job): number | null {
  const coords = jobCoordinates(job);
  if (!coords) return null;
  return distanceKm(origin.lat, origin.lng, coords.lat, coords.lng);
}

export function isJobWithinMatchRadius(job: Job, origin: Coordinates | null): boolean {
  if (!origin) return true;
  const dist = distanceToJobKm(origin, job);
  if (dist == null) return true;
  return dist <= matchRadiusKm(classifyJobMatchTier(job));
}

function categoryMatchScore(job: Job, helperSkillIds: string[]): number {
  if (!helperSkillIds.length) return 0;
  const jobCat = job.category;
  const jobSub = job.subcategory ?? '';
  for (const skillId of helperSkillIds) {
    const [primary, sub] = skillId.split(':');
    if (primary === jobCat && (!jobSub || sub === jobSub)) return 3;
    if (primary === jobCat) return 2;
  }
  return 0;
}

function schedulePriority(date: string): number {
  if (date === '__now') return 4;
  if (date === '__today') return 3;
  if (date === '__soon') return 2;
  if (date === '__flexible') return 1;
  return 2;
}

export type OpportunitySortContext = {
  origin: Coordinates | null;
  helperSkillIds: string[];
  /** Reserved for future client plan / badge ranking. */
  helperPlanTier?: string;
};

export function sortOpportunitiesForHelper(jobs: Job[], ctx: OpportunitySortContext): Job[] {
  const { origin, helperSkillIds } = ctx;

  return [...jobs].sort((a, b) => {
    const distA = origin ? distanceToJobKm(origin, a) : null;
    const distB = origin ? distanceToJobKm(origin, b) : null;

    if (distA != null && distB != null && distA !== distB) {
      return distA - distB;
    }
    if (distA != null && distB == null) return -1;
    if (distA == null && distB != null) return 1;

    const catDiff = categoryMatchScore(b, helperSkillIds) - categoryMatchScore(a, helperSkillIds);
    if (catDiff !== 0) return catDiff;

    const schedDiff = schedulePriority(b.date) - schedulePriority(a.date);
    if (schedDiff !== 0) return schedDiff;

    return b.createdAt - a.createdAt;
  });
}

export function filterJobsForHelperRadar(jobs: Job[], origin: Coordinates | null): Job[] {
  return jobs.filter((j) => isJobWithinMatchRadius(j, origin));
}
