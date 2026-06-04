import type { NearbyHelper, NearbyHelperMapPoint } from '@/types/nearbyHelper';
import { distanceKm } from '@/utils/distance';
import {
  coordinatesFromProfile,
  lookupCoordinatesFromText,
  profileRegionLabel,
  type Coordinates,
} from '@/utils/geocodeLocation';

/** Default search radius when the client origin is known (GPS or profile geocode). */
export const CLIENT_NEARBY_HELPER_RADIUS_KM = 50;

export type NearbyHelperSortContext = {
  origin: Coordinates | null;
  clientCity?: string | null;
  clientRegion?: string | null;
  clientCountry?: string | null;
  relatedCategoryIds?: string[];
  /** True when origin comes from browser GPS (tighter radius semantics). */
  hasGpsOrigin?: boolean;
};

export type NearbyHelperFilterContext = NearbyHelperSortContext & {
  /** When false, only city/region/country overlap counts as "nearby". */
  hasKnownOrigin?: boolean;
};

function normalizeCity(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function cityRegionScore(helper: NearbyHelper, ctx: NearbyHelperSortContext): number {
  const hCity = normalizeCity(helper.city);
  const cCity = normalizeCity(ctx.clientCity);
  if (!hCity || !cCity) return 0;
  if (hCity === cCity) return 4;
  if (hCity.includes(cCity) || cCity.includes(hCity)) return 3;
  const hReg = normalizeCity(helper.region);
  const cReg = normalizeCity(ctx.clientRegion);
  if (hReg && cReg && hReg === cReg) return 2;
  const hCountry = normalizeCity(helper.country);
  const cCountry = normalizeCity(ctx.clientCountry);
  if (hCountry && cCountry && hCountry === cCountry) return 1;
  return 0;
}

function skillMatchScore(helper: NearbyHelper, relatedCategoryIds: string[]): number {
  if (!relatedCategoryIds.length || !helper.skillIds.length) return 0;
  let best = 0;
  for (const skillId of helper.skillIds) {
    const [primary, sub] = skillId.split(':');
    for (const cat of relatedCategoryIds) {
      if (cat === primary) best = Math.max(best, 2);
      if (sub && `${primary}:${sub}` === skillId) best = Math.max(best, 3);
    }
  }
  return best;
}

export function helperCoordinates(helper: NearbyHelper): Coordinates | null {
  if (helper.latitude != null && helper.longitude != null) {
    return { lat: helper.latitude, lng: helper.longitude };
  }
  const fromProfile = coordinatesFromProfile(helper);
  if (fromProfile) return fromProfile;
  const region = profileRegionLabel(helper);
  if (region) return lookupCoordinatesFromText(region);
  return null;
}

/** Slight offset so multiple helpers in the same city remain visible on the map. */
export function helperMapPosition(helper: NearbyHelper): Coordinates | null {
  const base = helperCoordinates(helper);
  if (!base) return null;
  let hash = 0;
  for (let i = 0; i < helper.id.length; i++) hash = (hash + helper.id.charCodeAt(i)) | 0;
  const angle = ((hash % 360) * Math.PI) / 180;
  const radius = 0.004 + (Math.abs(hash % 7) + 1) * 0.0008;
  return {
    lat: base.lat + radius * Math.cos(angle),
    lng: base.lng + radius * Math.sin(angle),
  };
}

export function distanceToHelperKm(origin: Coordinates | null, helper: NearbyHelper): number | null {
  if (!origin) return null;
  const coords = helperCoordinates(helper);
  if (!coords) return null;
  return Number(distanceKm(origin.lat, origin.lng, coords.lat, coords.lng).toFixed(1));
}

export function helperHasLocationData(helper: NearbyHelper): boolean {
  if (helper.latitude != null && helper.longitude != null) return true;
  if (helper.city?.trim()) return true;
  if (helper.region?.trim()) return true;
  if (helper.country?.trim()) return true;
  return false;
}

/** Helpers without any locatable profile data are excluded from client radar. */
export function filterNearbyHelpers(helpers: NearbyHelper[], ctx: NearbyHelperFilterContext): NearbyHelper[] {
  const withLocation = helpers.filter(helperHasLocationData);
  if (!ctx.hasKnownOrigin) {
    if (!ctx.clientCity?.trim() && !ctx.clientRegion?.trim() && !ctx.clientCountry?.trim()) {
      return [];
    }
    return withLocation.filter((helper) => cityRegionScore(helper, ctx) >= 1);
  }

  return withLocation.filter((helper) => {
    const dist = distanceToHelperKm(ctx.origin, helper);
    if (dist != null) {
      return dist <= CLIENT_NEARBY_HELPER_RADIUS_KM;
    }
    if (ctx.clientCity?.trim() || ctx.clientRegion?.trim()) {
      return cityRegionScore(helper, ctx) >= 2;
    }
    return cityRegionScore(helper, ctx) >= 1;
  });
}

export function sortNearbyHelpers(helpers: NearbyHelper[], ctx: NearbyHelperSortContext): NearbyHelper[] {
  const related = ctx.relatedCategoryIds ?? [];

  return [...helpers].sort((a, b) => {
    const distA = distanceToHelperKm(ctx.origin, a);
    const distB = distanceToHelperKm(ctx.origin, b);

    if (distA != null && distB != null && distA !== distB) return distA - distB;
    if (distA != null && distB == null) return -1;
    if (distA == null && distB != null) return 1;

    const skillDiff = skillMatchScore(b, related) - skillMatchScore(a, related);
    if (skillDiff !== 0) return skillDiff;

    const cityDiff = cityRegionScore(b, ctx) - cityRegionScore(a, ctx);
    if (cityDiff !== 0) return cityDiff;

    const ratingA = a.rating ?? 0;
    const ratingB = b.rating ?? 0;
    if (ratingB !== ratingA) return ratingB - ratingA;

    return a.name.localeCompare(b.name);
  });
}

export function enrichNearbyHelpersForMap(
  helpers: NearbyHelper[],
  origin: Coordinates | null,
): NearbyHelperMapPoint[] {
  return helpers.map((helper) => ({
    ...helper,
    mapPosition: helperMapPosition(helper),
    distanceKm: distanceToHelperKm(origin, helper),
    regionLabel: profileRegionLabel(helper) || helper.city || '',
  }));
}
