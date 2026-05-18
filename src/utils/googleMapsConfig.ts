const INVALID_KEYS = new Set(['', 'YOUR_API_KEY', 'your_api_key', 'changeme', 'undefined']);

/** Google Maps JavaScript API key (Vite exposes only `VITE_*` vars to the browser). */
export function getGoogleMapsApiKey(): string {
  const raw = import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY?.trim() ?? '';
  const key = raw.toLowerCase();
  if (INVALID_KEYS.has(key)) return '';
  return raw;
}

export function isGoogleMapsConfigured(): boolean {
  return getGoogleMapsApiKey().length > 0;
}
