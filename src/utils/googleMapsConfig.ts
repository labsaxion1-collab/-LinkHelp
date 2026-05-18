/** Google Maps JavaScript API key (Vite exposes only `VITE_*` vars to the browser). */
export function getGoogleMapsApiKey(): string {
  const key = import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY?.trim() ?? '';
  return key && key !== 'YOUR_API_KEY' ? key : '';
}

export function isGoogleMapsConfigured(): boolean {
  return getGoogleMapsApiKey().length > 0;
}
