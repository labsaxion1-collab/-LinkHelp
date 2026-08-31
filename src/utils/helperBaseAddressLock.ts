import type { ProfileRow } from '@/types/database';

export const HELPER_BASE_LOCK_DAYS = 30;
const LOCK_MS = HELPER_BASE_LOCK_DAYS * 24 * 60 * 60 * 1000;

/** ~11 m — GPS jitter must not count as a residence move. */
export const HELPER_BASE_COORD_EPSILON = 0.0001;

export type HelperBaseLockProfile = Pick<
  ProfileRow,
  | 'helper_base_address'
  | 'helper_base_city'
  | 'helper_base_province'
  | 'helper_base_postal_code'
  | 'helper_base_lat'
  | 'helper_base_lng'
  | 'helper_base_updated_at'
  | 'helper_base_change_unlocked_by_admin'
>;

export type HelperBaseChangeStatus =
  | {
      allowed: true;
      reason:
        | 'first_setup'
        | 'pending_gps_confirmation'
        | 'admin_unlock'
        | 'cooldown_elapsed'
        | 'unchanged';
    }
  | { allowed: false; reason: 'locked'; daysUntilUnlock: number };

export function helperBaseHasConfirmedCoordinates(
  profile: HelperBaseLockProfile | null | undefined,
): boolean {
  const lat = profile?.helper_base_lat;
  const lng = profile?.helper_base_lng;
  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    typeof lng === 'number' &&
    Number.isFinite(lng)
  );
}

export function helperBaseHasTextDraft(profile: HelperBaseLockProfile | null | undefined): boolean {
  return Boolean(
    profile?.helper_base_address?.trim() ||
      profile?.helper_base_city?.trim() ||
      profile?.helper_base_province?.trim() ||
      profile?.helper_base_postal_code?.trim(),
  );
}

export function helperBaseIsConfigured(profile: HelperBaseLockProfile | null | undefined): boolean {
  return helperBaseHasTextDraft(profile) || helperBaseHasConfirmedCoordinates(profile);
}

export function helperBaseCoordsNear(
  a: number | null | undefined,
  b: number | null | undefined,
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) < HELPER_BASE_COORD_EPSILON;
}

export function daysUntilHelperBaseUnlock(updatedAtIso: string | null | undefined): number {
  if (!updatedAtIso) return 0;
  const updatedAt = new Date(updatedAtIso).getTime();
  if (!Number.isFinite(updatedAt)) return 0;
  const remaining = LOCK_MS - (Date.now() - updatedAt);
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

export function getHelperBaseChangeStatus(
  profile: HelperBaseLockProfile | null | undefined,
): HelperBaseChangeStatus {
  if (!profile) return { allowed: true, reason: 'first_setup' };

  if (!helperBaseHasConfirmedCoordinates(profile)) {
    return { allowed: true, reason: 'pending_gps_confirmation' };
  }

  if (profile.helper_base_change_unlocked_by_admin) {
    return { allowed: true, reason: 'admin_unlock' };
  }

  const daysLeft = daysUntilHelperBaseUnlock(profile.helper_base_updated_at);
  if (daysLeft > 0) {
    return { allowed: false, reason: 'locked', daysUntilUnlock: daysLeft };
  }

  return { allowed: true, reason: 'cooldown_elapsed' };
}

export function helperBaseFieldsChanged(
  profile: HelperBaseLockProfile | null | undefined,
  next: {
    address: string;
    city: string;
    province: string;
    postalCode: string;
    lat: number | null;
    lng: number | null;
  },
): boolean {
  const norm = (v: string) => v.trim();
  return (
    norm(next.address) !== (profile?.helper_base_address?.trim() ?? '') ||
    norm(next.city) !== (profile?.helper_base_city?.trim() ?? '') ||
    norm(next.province) !== (profile?.helper_base_province?.trim() ?? '') ||
    norm(next.postalCode) !== (profile?.helper_base_postal_code?.trim() ?? '') ||
    !helperBaseCoordsNear(next.lat, profile?.helper_base_lat ?? null) ||
    !helperBaseCoordsNear(next.lng, profile?.helper_base_lng ?? null)
  );
}

export function shouldBlockHelperBaseSaveDueToCooldown(
  profile: HelperBaseLockProfile | null | undefined,
  status: HelperBaseChangeStatus,
  hasPendingChanges: boolean,
): boolean {
  return (
    hasPendingChanges &&
    helperBaseHasConfirmedCoordinates(profile) &&
    !status.allowed &&
    status.reason === 'locked'
  );
}

export function shouldShowHelperBaseCooldownMessage(
  profile: HelperBaseLockProfile | null | undefined,
  status: HelperBaseChangeStatus,
): boolean {
  return (
    helperBaseHasConfirmedCoordinates(profile) &&
    !status.allowed &&
    status.reason === 'locked'
  );
}

export function shouldShowHelperBaseTextNeedsGpsMessage(
  profile: HelperBaseLockProfile | null | undefined,
): boolean {
  return helperBaseHasTextDraft(profile) && !helperBaseHasConfirmedCoordinates(profile);
}

export function helperBaseCooldownDaysRemaining(status: HelperBaseChangeStatus): number {
  if (status.allowed || status.reason !== 'locked') return 0;
  return status.daysUntilUnlock;
}
