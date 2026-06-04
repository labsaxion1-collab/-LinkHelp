import { ROUTES } from '@/utils/constants';

const PRODUCTION_ORIGIN = 'https://www.linkhelp.app';

/**
 * OAuth redirect must match the tab origin exactly so PKCE `code_verifier` in localStorage
 * (via `linkhelp-auth-code-verifier`) matches this redirect URL.
 *
 * Production canonical site: https://www.linkhelp.app/auth/callback
 */
export function getOAuthRedirectToUrl(): string {
  if (typeof window === 'undefined') {
    return `${PRODUCTION_ORIGIN}${ROUTES.authCallback}`;
  }
  return `${window.location.origin}${ROUTES.authCallback}`;
}
