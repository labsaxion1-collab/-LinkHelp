import { QUEBEC_PLACES, type QuebecPlace } from '@/data/quebecRegions';

export type Coordinates = { lat: number; lng: number };

export const MONTREAL_CENTER: Coordinates = { lat: 45.5017, lng: -73.5673 };

export function coordinatesFromPlace(place: QuebecPlace): Coordinates {
  return { lat: place.lat, lng: place.lng };
}

export function lookupCoordinatesFromText(locationText: string): Coordinates | null {
  const q = locationText.trim().toLowerCase();
  if (!q) return null;

  for (const place of QUEBEC_PLACES) {
    const coords = coordinatesFromPlace(place);
    const city = place.city.toLowerCase();
    const label = place.label.toLowerCase();
    if (q === label || q === city || q.includes(city) || label.includes(q)) {
      return coords;
    }
  }
  return null;
}

export function coordinatesFromProfile(profile: {
  city?: string | null;
  province?: string | null;
} | null | undefined): Coordinates | null {
  if (!profile?.city?.trim()) return null;
  const region = [profile.city, profile.province].filter(Boolean).join(', ');
  return lookupCoordinatesFromText(region);
}

export function profileRegionLabel(profile: {
  city?: string | null;
  province?: string | null;
} | null | undefined): string {
  return [profile?.city, profile?.province].filter(Boolean).join(', ');
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
