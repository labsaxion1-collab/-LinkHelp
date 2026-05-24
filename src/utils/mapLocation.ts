import { QUEBEC_PLACES } from '@/data/quebecRegions';

export type Coordinates = { lat: number; lng: number };

/** Default map center when GPS and profile city are unavailable (Trois-Rivières, QC). */
export const DEFAULT_MAP_CENTER: Coordinates = { lat: 46.3432, lng: -72.543 };

export const TROIS_RIVIERES_CENTER = DEFAULT_MAP_CENTER;

/** Legacy name — do not use as app default. */
export const MONTREAL_CENTER: Coordinates = { lat: 45.5017, lng: -73.5673 };

export function normalizeLocationKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function lookupCoordinatesFromText(locationText: string): Coordinates | null {
  const q = normalizeLocationKey(locationText);
  if (!q) return null;

  for (const place of QUEBEC_PLACES) {
    const city = normalizeLocationKey(place.city);
    const label = normalizeLocationKey(place.label);
    if (q === label || q === city || q.includes(city) || city.includes(q) || label.includes(q)) {
      return { lat: place.lat, lng: place.lng };
    }
  }
  return null;
}

export function coordinatesFromProfile(profile: {
  city?: string | null;
  region?: string | null;
} | null | undefined): Coordinates | null {
  if (!profile?.city?.trim()) return null;
  const regionLabel = [profile.city, profile.region?.trim()].filter(Boolean).join(', ');
  return lookupCoordinatesFromText(regionLabel);
}

export function profileRegionLabel(profile: {
  city?: string | null;
  region?: string | null;
} | null | undefined): string {
  return [profile?.city?.trim(), profile?.region?.trim()].filter(Boolean).join(', ');
}
