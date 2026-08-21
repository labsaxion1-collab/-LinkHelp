const INVALID_KEYS = new Set(['', 'YOUR_API_KEY', 'your_api_key', 'changeme', 'undefined']);

/** Official Google Maps JS auth/loader error codes we surface in diagnostics (never log the key). */
export const GOOGLE_MAPS_AUTH_ERROR_CODES = [
  'InvalidKeyMapError',
  'RefererNotAllowedMapError',
  'ApiNotActivatedMapError',
  'BillingNotEnabledMapError',
  'ExpiredKeyMapError',
  'MissingKeyMapError',
] as const;

export type GoogleMapsAuthErrorCode = (typeof GOOGLE_MAPS_AUTH_ERROR_CODES)[number] | 'UnknownMapError';

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

/** Safe prefix for reports/logs — never returns the full key. */
export function getGoogleMapsApiKeySanitizedPrefix(key = getGoogleMapsApiKey()): string {
  const trimmed = key.trim();
  if (!trimmed) return '(empty)';
  if (trimmed.length < 6) return `…(len=${trimmed.length})`;
  return `${trimmed.slice(0, 6)}…(len=${trimmed.length})`;
}

export function classifyGoogleMapsLoaderError(message: unknown): GoogleMapsAuthErrorCode {
  const text = String(message ?? '');
  for (const code of GOOGLE_MAPS_AUTH_ERROR_CODES) {
    if (text.includes(code)) return code;
  }
  if (/didn'?t load Google Maps correctly/i.test(text) || /nao carregou o Google Maps/i.test(text)) {
    return 'UnknownMapError';
  }
  return 'UnknownMapError';
}

/**
 * Attach a one-shot window.gm_authFailure listener and log the classified code
 * without echoing the API key. Returns a cleanup function.
 */
export function attachGoogleMapsAuthFailureListener(
  onError?: (code: GoogleMapsAuthErrorCode) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const previous = window.gm_authFailure;
  window.gm_authFailure = () => {
    const code: GoogleMapsAuthErrorCode = 'UnknownMapError';
    console.error('[Google Maps] auth failure (key not logged)', {
      envVar: 'VITE_GOOGLE_MAPS_PLATFORM_KEY',
      keyPrefix: getGoogleMapsApiKeySanitizedPrefix(),
      code,
      hint: 'Check Google Cloud key restrictions / enabled APIs / billing. Common: RefererNotAllowedMapError, InvalidKeyMapError, ApiNotActivatedMapError, BillingNotEnabledMapError.',
    });
    onError?.(code);
    if (typeof previous === 'function') previous();
  };

  return () => {
    if (window.gm_authFailure === undefined) return;
    window.gm_authFailure = previous;
  };
}

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}
