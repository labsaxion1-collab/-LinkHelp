const STORAGE_KEY = 'lh-client-device-fp-v1';

function hashString(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** Stable, non-PII device id for onboarding audit signals (optional RPC arg). */
export function getClientDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'ssr';

  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) return cached;
  } catch {
    /* ignore */
  }

  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen.width),
    String(screen.height),
    String(window.devicePixelRatio ?? 1),
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
  ];
  const fp = `lh-${hashString(parts.join('|'))}`;

  try {
    localStorage.setItem(STORAGE_KEY, fp);
  } catch {
    /* ignore */
  }

  return fp;
}
