export type ParsedPlace = {
  address: string;
  city: string;
  region: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  formatted: string;
};

/** Normalize Canadian postal codes to `A1A 1A1` when the payload matches. */
export function normalizeCanadianPostalCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const compact = trimmed.replace(/\s+/g, '').toUpperCase();
  if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(compact)) {
    return `${compact.slice(0, 3)} ${compact.slice(3)}`;
  }
  return trimmed;
}

export function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  formatted: string,
  lat: number,
  lng: number,
): ParsedPlace {
  let locality = '';
  let postalTown = '';
  let sublocality = '';
  let adminLevel2 = '';
  let region = '';
  let postalCode = '';
  let streetNumber = '';
  let route = '';
  let subpremise = '';

  for (const c of components ?? []) {
    const types = c.types;
    if (types.includes('street_number')) streetNumber = c.long_name;
    else if (types.includes('route')) route = c.long_name;
    else if (types.includes('subpremise')) subpremise = c.long_name;
    else if (types.includes('locality')) locality = c.long_name;
    else if (types.includes('postal_town')) postalTown = c.long_name;
    else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
      if (!sublocality) sublocality = c.long_name;
    } else if (types.includes('administrative_area_level_2')) adminLevel2 = c.long_name;
    else if (types.includes('administrative_area_level_1')) region = c.short_name || c.long_name;
    else if (types.includes('postal_code')) postalCode = c.long_name;
  }

  // City fallback: locality → postal_town → sublocality → admin_level_2
  const city = locality || postalTown || sublocality || adminLevel2;

  let streetLine = [streetNumber, route].filter(Boolean).join(' ').trim();
  if (subpremise) {
    streetLine = streetLine ? `${streetLine} #${subpremise}` : subpremise;
  }
  const address = streetLine || formatted.split(',')[0]?.trim() || formatted;

  return {
    address,
    city,
    region,
    postalCode: normalizeCanadianPostalCode(postalCode),
    latitude: lat,
    longitude: lng,
    formatted,
  };
}

export function parsePlaceResult(place: google.maps.places.PlaceResult): ParsedPlace | null {
  const loc = place.geometry?.location;
  if (!loc) return null;
  const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat);
  const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng);
  if (lat == null || lng == null) return null;
  return parseAddressComponents(place.address_components, place.formatted_address ?? '', lat, lng);
}

export function parseGeocoderResult(result: google.maps.GeocoderResult): ParsedPlace | null {
  const loc = result.geometry?.location;
  if (!loc) return null;
  const lat = loc.lat();
  const lng = loc.lng();
  return parseAddressComponents(result.address_components, result.formatted_address ?? '', lat, lng);
}
