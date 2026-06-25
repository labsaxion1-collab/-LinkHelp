import type { AuthFlowError } from '@/types/authFlowError';

type TranslateFn = (key: string, variables?: Record<string, string | number>) => string;

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

function sanitizeInterpolationVars(
  vars?: Record<string, string | number>,
): Record<string, string | number> | undefined {
  if (!vars) return undefined;
  const safe: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(vars)) {
    if (typeof value === 'string' || typeof value === 'number') {
      safe[key] = value;
    } else if (value != null) {
      safe[key] = extractErrorMessage(value);
    }
  }
  return Object.keys(safe).length ? safe : undefined;
}

/** Map AuthContext profile/auth errors to a safe toast string. */
export function formatAuthFlowErrorMessage(
  t: TranslateFn,
  err: NonNullable<AuthFlowError>,
  fallbackKey = 'auth.profile_update_error',
): string {
  const key = err.messageKey?.trim();
  if (!key) return t(fallbackKey);
  const msg = t(key, sanitizeInterpolationVars(err.vars));
  if (!msg || msg === key || msg.includes('[object Object]')) return t(fallbackKey);
  return msg;
}
