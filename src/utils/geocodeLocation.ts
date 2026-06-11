import type { QuebecPlace } from '@/data/quebecRegions';
import type { Coordinates } from '@/utils/mapLocation';
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

export type GeolocationFailureReason = 'denied' | 'unavailable' | 'timeout';

export type BrowserCoordinatesResult =
  | { ok: true; coords: Coordinates }
  | { ok: false; reason: GeolocationFailureReason };

export function requestBrowserCoordinatesDetailed(): Promise<BrowserCoordinatesResult> {
  if (!('geolocation' in navigator)) {
    return Promise.resolve({ ok: false, reason: 'unavailable' });
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ ok: true, coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) resolve({ ok: false, reason: 'denied' });
        else if (err.code === err.TIMEOUT) resolve({ ok: false, reason: 'timeout' });
        else resolve({ ok: false, reason: 'unavailable' });
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

export function requestBrowserCoordinates(): Promise<Coordinates | null> {
  return requestBrowserCoordinatesDetailed().then((result) => (result.ok ? result.coords : null));
}

/** Re-export for callers that need a safe default. */
export const FALLBACK_MAP_CENTER = DEFAULT_MAP_CENTER;
