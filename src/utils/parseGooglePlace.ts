export type ParsedPlace = {
  address: string;
  city: string;
  region: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  formatted: string;
};

export function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  formatted: string,
  lat: number,
  lng: number,
): ParsedPlace {
  let city = '';
  let region = '';
  let postalCode = '';
  let streetNumber = '';
  let route = '';

  for (const c of components ?? []) {
    const types = c.types;
    if (types.includes('locality')) city = c.long_name;
    else if (!city && types.includes('sublocality')) city = c.long_name;
    else if (types.includes('administrative_area_level_1')) region = c.short_name || c.long_name;
    else if (types.includes('postal_code')) postalCode = c.long_name;
    else if (types.includes('street_number')) streetNumber = c.long_name;
    else if (types.includes('route')) route = c.long_name;
  }

  const streetLine = [streetNumber, route].filter(Boolean).join(' ').trim();
  const address = streetLine || formatted.split(',')[0]?.trim() || formatted;

  return {
    address,
    city,
    region,
    postalCode,
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
