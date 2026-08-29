import { ROUTES } from '@/utils/constants';
import { sanitizeAdminReturnTo, sanitizeReturnTo } from '@/utils/fluxRedirect';
import {
  APP_HOSTNAME,
  APP_ORIGIN,
  FLUX_HOSTNAME,
  FLUX_ORIGIN,
  STAGING_TEST_HOSTNAME,
  STAGING_TEST_ORIGIN,
  isLocalHost,
  isPreviewHost,
} from '@/utils/linkhelpHosts';

/**
 * Resolves the origin used for Supabase OAuth `redirectTo`.
 *
 * Allowed return hosts (same-tab PKCE):
 * - https://app.linkhelp.app
 * - https://teste.linkhelp.app
 * - https://flux.linkhelp.app (admin)
 * - localhost / 127.0.0.1 (dev)
 * - *.vercel.app (Preview)
 *
 * www / apex / unknown → app.linkhelp.app (never bounce marketplace OAuth to Landing).
 */
export function resolveOAuthReturnOrigin(rawOrigin?: string | null): string {
  const fallback = APP_ORIGIN;
  const candidate =
    (rawOrigin && rawOrigin.trim()) ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    fallback;

  try {
    const parsed = new URL(candidate);
    const hostname = parsed.hostname.toLowerCase();
    const protocol = parsed.protocol.toLowerCase();

    if (protocol !== 'https:' && !(protocol === 'http:' && isLocalHost(hostname))) {
      return fallback;
    }

    if (hostname === STAGING_TEST_HOSTNAME) return STAGING_TEST_ORIGIN;
    if (hostname === APP_HOSTNAME) return APP_ORIGIN;
    if (hostname === FLUX_HOSTNAME) return FLUX_ORIGIN;
    if (isLocalHost(hostname)) return parsed.origin;
    if (isPreviewHost(hostname)) return parsed.origin;

    // www.linkhelp.app, linkhelp.app, or arbitrary hosts are not valid marketplace OAuth returns.
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * OAuth redirect must match an allowlisted origin so PKCE `code_verifier` in localStorage
 * stays on the same host that started Google sign-in.
 *
 * Staging: https://teste.linkhelp.app/auth/callback
 * Production app: https://app.linkhelp.app/auth/callback
 */
export function getOAuthRedirectToUrl(nextPath?: string | null): string {
  const origin = resolveOAuthReturnOrigin(
    typeof window !== 'undefined' ? window.location.origin : null,
  );
  const base = `${origin}${ROUTES.authCallback}`;
  const safeNext = sanitizeAdminReturnTo(nextPath) ?? sanitizeReturnTo(nextPath);
  if (!safeNext) return base;
  const params = new URLSearchParams({ next: safeNext });
  return `${base}?${params.toString()}`;
}

/**
 * Email confirmation / recovery links (`emailRedirectTo`).
 * Must use the current host (staging → teste.linkhelp.app), never a localhost Site URL fallback.
 */
export function getEmailAuthRedirectToUrl(): string {
  return getOAuthRedirectToUrl();
}
