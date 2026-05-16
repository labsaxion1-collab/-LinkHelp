import { ROUTES } from '@/utils/constants';

/**
 * OAuth redirect must match the current tab origin so PKCE `code_verifier` in localStorage
 * lines up with the callback URL (e.g. https://link-help.vercel.app/auth/callback).
 */
export function getOAuthRedirectToUrl(): string {
  if (typeof window === 'undefined') {
    return ROUTES.authCallback;
  }
  return `${window.location.origin.replace(/\/$/, '')}${ROUTES.authCallback}`;
}
