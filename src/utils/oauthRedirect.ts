import { ROUTES } from '@/utils/constants';

/**
 * Must match the browser tab origin exactly so PKCE `code_verifier` in localStorage
 * (under `linkhelp-auth-code-verifier` via `storageKey` in `supabase.ts`) matches this redirect.
 */
export function getOAuthRedirectToUrl(): string {
  if (typeof window === 'undefined') {
    return ROUTES.authCallback;
  }
  return `${window.location.origin}/auth/callback`;
}
