function decodeJwtPayload(key: string): Record<string, unknown> | null {
  const parts = key.split('.');
  if (parts.length !== 3) return null;

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(globalThis.atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Only public Supabase keys may be shipped to the browser. */
export function isBrowserSafeSupabaseKey(rawKey: unknown): boolean {
  if (typeof rawKey !== 'string') return false;
  const key = rawKey.trim();
  if (!key || key.startsWith('sb_secret_')) return false;
  if (key.startsWith('sb_publishable_')) return true;

  const payload = decodeJwtPayload(key);
  return payload?.role === 'anon';
}
