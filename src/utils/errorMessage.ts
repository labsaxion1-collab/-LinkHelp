/** Extract a human-readable message from unknown thrown values (Supabase, RPC, Error). */
export function extractErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error == null) return fallback;
  if (typeof error === 'string') return error.trim() || fallback;
  if (error instanceof Error) {
    const msg = error.message?.trim();
    return msg || fallback;
  }
  if (typeof error === 'object') {
    const o = error as { message?: string; error_description?: string; details?: string; hint?: string };
    const parts = [o.message, o.details, o.hint, o.error_description].filter(
      (p): p is string => typeof p === 'string' && p.trim().length > 0,
    );
    if (parts.length) return parts.join(' — ');
  }
  return fallback;
}
