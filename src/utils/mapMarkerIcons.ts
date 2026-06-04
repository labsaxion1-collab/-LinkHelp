/** SVG circle icon for classic google.maps.Marker (no AdvancedMarker / mapId required). */
export function circleMarkerIcon(
  color: string,
  size = 28,
): google.maps.Icon | google.maps.Symbol {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="#ffffff" stroke-width="2.5"/></svg>`;
  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  if (typeof google !== 'undefined' && google.maps?.Size && google.maps?.Point) {
    return {
      url,
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(size / 2, size / 2),
    };
  }
  return { url };
}

export function isValidMapLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function sanitizeMapPosition(
  position: google.maps.LatLngLiteral | null | undefined,
): google.maps.LatLngLiteral | null {
  if (!position || !isValidMapLatLng(position.lat, position.lng)) return null;
  return { lat: position.lat, lng: position.lng };
}

/** True when the marker library exposes AdvancedMarkerElement constructor. */
export function isAdvancedMarkerElementAvailable(): boolean {
  try {
    return typeof google.maps?.marker?.AdvancedMarkerElement === 'function';
  } catch {
    return false;
  }
}
