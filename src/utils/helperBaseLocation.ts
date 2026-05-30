import type { Job } from '@/types/job';
import type { ProfileRow } from '@/types/database';
import { distanceKm } from '@/utils/distance';
import { jobCoordinates } from '@/utils/geocodeLocation';
import { lookupCoordinatesFromText, type Coordinates } from '@/utils/mapLocation';

export type HelperBaseProfile = Pick<
  ProfileRow,
  | 'helper_base_address'
  | 'helper_base_city'
  | 'helper_base_province'
  | 'helper_base_postal_code'
  | 'helper_base_lat'
  | 'helper_base_lng'
  | 'city'
  | 'region'
>;

function validNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function helperHasBaseAddress(profile: HelperBaseProfile | null | undefined): boolean {
  return Boolean(
    profile?.helper_base_address?.trim() ||
      profile?.helper_base_city?.trim() ||
      profile?.helper_base_postal_code?.trim() ||
      (validNumber(profile?.helper_base_lat) && validNumber(profile?.helper_base_lng)),
  );
}

export function helperHasExactBaseCoordinates(profile: HelperBaseProfile | null | undefined): boolean {
  return validNumber(profile?.helper_base_lat) && validNumber(profile?.helper_base_lng);
}

export function helperBaseCoordinates(profile: HelperBaseProfile | null | undefined): Coordinates | null {
  if (!profile) return null;
  if (validNumber(profile.helper_base_lat) && validNumber(profile.helper_base_lng)) {
    return { lat: profile.helper_base_lat, lng: profile.helper_base_lng };
  }

  const baseText = [
    profile.helper_base_address,
    profile.helper_base_city,
    profile.helper_base_province,
    profile.helper_base_postal_code,
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(', ');
  const fromBaseText = baseText ? lookupCoordinatesFromText(baseText) : null;
  if (fromBaseText) return fromBaseText;

  const profileText = [profile.city, profile.region].filter((part): part is string => Boolean(part?.trim())).join(', ');
  return profileText ? lookupCoordinatesFromText(profileText) : null;
}

/** Distance using only stored helper_base_lat/lng (no text geocoding). */
export function distanceFromExactHelperBaseToJobKm(
  profile: HelperBaseProfile | null | undefined,
  job: Job,
): number | null {
  if (!helperHasExactBaseCoordinates(profile)) return null;
  const origin = { lat: profile!.helper_base_lat!, lng: profile!.helper_base_lng! };
  const target = jobCoordinates(job);
  if (!target) return null;
  return distanceKm(origin.lat, origin.lng, target.lat, target.lng);
}

export function distanceFromHelperBaseToJobKm(
  profile: HelperBaseProfile | null | undefined,
  job: Job,
): number | null {
  const exact = distanceFromExactHelperBaseToJobKm(profile, job);
  if (exact != null) return exact;
  const origin = helperBaseCoordinates(profile);
  const target = jobCoordinates(job);
  if (!origin || !target) return null;
  return distanceKm(origin.lat, origin.lng, target.lat, target.lng);
}
