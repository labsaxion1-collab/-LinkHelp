import type { Job } from '@/types/job';
import { isRemoteJob } from '@/utils/calculateHelperLeadCreditCost';
import {
  distanceFromExactHelperBaseToJobKm,
  helperHasExactBaseCoordinates,
  type HelperBaseProfile,
} from '@/utils/helperBaseLocation';

export type HelperApplyLocationDecision =
  | { ok: true; distanceKm: number | null; usesPersistedHome: boolean }
  | { ok: false; reason: 'in_person_missing_coords' };

/**
 * Client-side apply gate: remote never needs coordinates.
 * In-person uses only persisted home coords — never live GPS.
 */
export function decideHelperApplyLocation(
  job: Job,
  profile: HelperBaseProfile | null | undefined,
): HelperApplyLocationDecision {
  if (isRemoteJob(job)) {
    return { ok: true, distanceKm: 0, usesPersistedHome: false };
  }
  if (!helperHasExactBaseCoordinates(profile)) {
    return { ok: false, reason: 'in_person_missing_coords' };
  }
  return {
    ok: true,
    distanceKm: distanceFromExactHelperBaseToJobKm(profile, job),
    usesPersistedHome: true,
  };
}

export function helperApplyLocationMessageKey(
  decision: HelperApplyLocationDecision,
): 'helper_dashboard.apply_remote_location_not_needed' | 'helper_dashboard.apply_in_person_coords_required' {
  if (decision.ok) return 'helper_dashboard.apply_remote_location_not_needed';
  return 'helper_dashboard.apply_in_person_coords_required';
}
