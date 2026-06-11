import { getGoogleMapsApiKey } from '@/utils/googleMapsConfig';
import type { Coordinates } from '@/utils/mapLocation';
import { parseAddressComponents, parseGeocoderResult, type ParsedPlace } from '@/utils/parseGooglePlace';

type RestGeocodeResponse = {
  status: string;
  results?: Array<{
    formatted_address?: string;
    address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
    geometry?: { location?: { lat: number; lng: number } };
  }>;
};

function reverseGeocodeWithJsApi(coords: Coordinates): Promise<ParsedPlace | null> {
  if (typeof google === 'undefined' || !google.maps?.Geocoder) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: coords }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        resolve(parseGeocoderResult(results[0]));
        return;
      }
      resolve(null);
    });
  });
}

async function reverseGeocodeWithRestApi(coords: Coordinates): Promise<ParsedPlace | null> {
  const key = getGoogleMapsApiKey();
  if (!key) return null;

  try {
    const params = new URLSearchParams({
      latlng: `${coords.lat},${coords.lng}`,
      key,
      region: 'ca',
    });
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as RestGeocodeResponse;
    const hit = data.results?.[0];
    const loc = hit?.geometry?.location;
    if (data.status !== 'OK' || !hit || loc == null) return null;

    return parseAddressComponents(
      hit.address_components as google.maps.GeocoderAddressComponent[] | undefined,
      hit.formatted_address ?? '',
      loc.lat,
      loc.lng,
    );
  } catch {
    return null;
  }
}

/** Reverse geocode GPS coordinates — JS Geocoder first, then Google REST API fallback. */
export async function reverseGeocodeCoordinates(coords: Coordinates): Promise<ParsedPlace | null> {
  const fromJs = await reverseGeocodeWithJsApi(coords);
  if (fromJs) return fromJs;
  return reverseGeocodeWithRestApi(coords);
}
