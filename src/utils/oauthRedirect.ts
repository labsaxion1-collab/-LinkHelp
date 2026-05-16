import { ROUTES } from '@/utils/constants';

/**
 * Dev OAuth/PKCE must use the same origin as the tab where `code_verifier` is stored.
 * `npm run dev` binds Vite to port 3000 (see package.json).
 */
export const LINKHELP_DEV_OAUTH_ORIGIN = 'http://localhost:3000' as const;

/** Production OAuth redirect origin (Vercel). Must match Supabase Auth → Redirect URLs. */
export const LINKHELP_PRODUCTION_OAUTH_ORIGIN = 'https://link-help.vercel.app' as const;

/** Full redirect URL passed to `signInWithOAuth({ options: { redirectTo } })`. */
export function getOAuthRedirectToUrl(): string {
  if (import.meta.env.DEV) {
    return `${LINKHELP_DEV_OAUTH_ORIGIN}${ROUTES.authCallback}`;
  }
  const site = typeof import.meta.env.VITE_SITE_URL === 'string' ? import.meta.env.VITE_SITE_URL.trim().replace(/\/$/, '') : '';
  if (site) {
    return `${site}${ROUTES.authCallback}`;
  }
  if (import.meta.env.PROD && !site) {
    return `${LINKHELP_PRODUCTION_OAUTH_ORIGIN}${ROUTES.authCallback}`;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin.replace(/\/$/, '')}${ROUTES.authCallback}`;
  }
  return `${LINKHELP_PRODUCTION_OAUTH_ORIGIN}${ROUTES.authCallback}`;
}
