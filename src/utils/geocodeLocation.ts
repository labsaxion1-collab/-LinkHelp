import type { QuebecPlace } from '@/data/quebecRegions';
import {
  DEFAULT_MAP_CENTER,
  coordinatesFromProfile,
  lookupCoordinatesFromText,
  profileRegionLabel,
} from '@/utils/mapLocation';

export type { Coordinates } from '@/utils/mapLocation';

export {
  DEFAULT_MAP_CENTER,
  TROIS_RIVIERES_CENTER,
  MONTREAL_CENTER,
  lookupCoordinatesFromText,
  coordinatesFromProfile,
  profileRegionLabel,
} from '@/utils/mapLocation';

export function coordinatesFromPlace(place: QuebecPlace): Coordinates {
  return { lat: place.lat, lng: place.lng };
}

export function jobCoordinates(job: {
  latitude?: number | null;
  longitude?: number | null;
  location?: string;
}): Coordinates | null {
  if (job.latitude != null && job.longitude != null) {
    return { lat: job.latitude, lng: job.longitude };
  }
  if (job.location?.trim()) {
    return lookupCoordinatesFromText(job.location);
  }
  return null;
}

export function requestBrowserCoordinates(): Promise<Coordinates | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

/** Re-export for callers that need a safe default. */
export const FALLBACK_MAP_CENTER = DEFAULT_MAP_CENTER;
