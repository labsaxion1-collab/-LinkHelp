import { ROUTES } from '@/utils/constants';
import { sanitizeReturnTo } from '@/utils/fluxRedirect';

const PRODUCTION_ORIGIN = 'https://www.linkhelp.app';

/**
 * OAuth redirect must match the tab origin exactly so PKCE `code_verifier` in localStorage
 * (via `linkhelp-auth-code-verifier`) matches this redirect URL.
 *
 * Production canonical site: https://www.linkhelp.app/auth/callback
 */
export function getOAuthRedirectToUrl(nextPath?: string | null): string {
  const origin = typeof window === 'undefined' ? PRODUCTION_ORIGIN : window.location.origin;
  const base = `${origin}${ROUTES.authCallback}`;
  const safeNext = sanitizeReturnTo(nextPath);
  if (!safeNext) return base;
  const params = new URLSearchParams({ next: safeNext });
  return `${base}?${params.toString()}`;
}
