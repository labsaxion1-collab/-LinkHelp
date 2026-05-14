/**
 * Map Supabase GoTrue / PostgREST errors to stable i18n keys.
 * Unknown errors still surface a safe `detail` string (never env var names).
 */

const ENV_HINT = /vite_supabase|supabase_url|supabase_anon|anon_key|apikey/i;

export function sanitizeAuthDetail(raw: string, maxLen = 220): string {
  let s = raw.replace(/[`]/g, "'").trim();
  if (ENV_HINT.test(s)) return '';
  if (s.length > maxLen) s = `${s.slice(0, maxLen)}…`;
  return s;
}

type Mapped = { messageKey: string; vars?: Record<string, string | number> };

export function mapSupabaseAuthError(err: { message: string; status?: number } | null | undefined): Mapped {
  if (!err?.message) return { messageKey: 'auth.errors.generic' };

  const m = err.message.toLowerCase();
  const st = err.status;

  if (m.includes('user already registered') || m.includes('already been registered') || m.includes('email address is already')) {
    return { messageKey: 'auth.errors.email_taken' };
  }
  if (m.includes('invalid login credentials') || m.includes('invalid email or password') || m.includes('email not confirmed')) {
    if (m.includes('email not confirmed')) return { messageKey: 'auth.errors.email_not_confirmed' };
    return { messageKey: 'auth.errors.invalid_credentials' };
  }
  if (m.includes('password') && (m.includes('weak') || m.includes('least') || m.includes('short'))) {
    return { messageKey: 'auth.errors.weak_password' };
  }
  if (m.includes('rate limit') || m.includes('too many requests') || st === 429) {
    return { messageKey: 'auth.errors.rate_limit' };
  }
  if (m.includes('provider') && m.includes('not enabled')) {
    return { messageKey: 'auth.errors.oauth_provider_disabled' };
  }
  if (m.includes('oauth') || m.includes('google') || m.includes('redirect')) {
    const detail = sanitizeAuthDetail(err.message);
    if (detail) return { messageKey: 'auth.errors.oauth_google', vars: { detail } };
    return { messageKey: 'auth.errors.oauth_google_short' };
  }
  if (m.includes('database error saving new user') || m.includes('saving new user')) {
    return { messageKey: 'auth.errors.profile_create' };
  }
  if (m.includes('session') && m.includes('expired')) {
    return { messageKey: 'auth.errors.session_expired' };
  }

  const detail = sanitizeAuthDetail(err.message);
  if (detail) return { messageKey: 'auth.errors.detail', vars: { detail } };
  return { messageKey: 'auth.errors.generic' };
}

export function mapProfileWriteError(err: { message: string; code?: string; details?: string } | null | undefined): Mapped {
  if (!err?.message) return { messageKey: 'auth.errors.profile_create' };

  const m = err.message.toLowerCase();
  if (m.includes('row-level security') || m.includes('rls') || err.code === '42501') {
    return { messageKey: 'auth.errors.profile_rls' };
  }
  if (m.includes('violates') || m.includes('constraint')) {
    return { messageKey: 'auth.errors.profile_constraint', vars: { detail: sanitizeAuthDetail(err.message) } };
  }
  const detail = sanitizeAuthDetail(err.message);
  if (detail) return { messageKey: 'auth.errors.profile_create_detail', vars: { detail } };
  return { messageKey: 'auth.errors.profile_create' };
}
