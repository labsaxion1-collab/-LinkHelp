import type { ServiceMode } from '@/config/baselineFinance';

/**
 * Whether publish/review must require a map-resolved address.
 * Remote (baseline) never requires address/coords; moving always does (two endpoints).
 */
export function publishRequiresMapAddress(input: {
  category: string;
  serviceMode: ServiceMode | null | '';
  baselineFinanceEnabled: boolean;
}): boolean {
  if (input.category === 'moving') return true;
  if (input.baselineFinanceEnabled && input.serviceMode === 'remote') return false;
  return true;
}

/** In-person baseline publishes require latitude/longitude. */
export function publishRequiresCoordinates(input: {
  category: string;
  serviceMode: ServiceMode | null | '';
  baselineFinanceEnabled: boolean;
}): boolean {
  if (!input.baselineFinanceEnabled) return false;
  if (input.serviceMode === 'remote') return false;
  if (input.serviceMode === 'in_person') return true;
  // Historical / unknown mode: keep previous strictness for non-remote.
  return input.category !== 'moving' ? false : true;
}

/** Payload coords: remote → null; otherwise pass through. */
export function publishCoordinatesForMode(
  serviceMode: ServiceMode | null | '',
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): { latitude: number | null; longitude: number | null } {
  if (serviceMode === 'remote') return { latitude: null, longitude: null };
  return {
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  };
}
