import { ROUTES } from '@/utils/constants';
import { isInstitutionalPath } from '@/utils/hostRouting';
import { APP_ORIGIN, getCurrentHostProfile } from '@/utils/linkhelpHosts';

/** Absolute URL on the marketplace app origin (path must start with `/`). */
export function buildAppAbsoluteUrl(pathAndQuery: string): string {
  const path = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
  return `${APP_ORIGIN.replace(/\/+$/, '')}${path}`;
}

/** Canonical app entry points for marketing / www CTAs. */
export const APP_MARKETING_URLS = {
  open: buildAppAbsoluteUrl('/'),
  login: buildAppAbsoluteUrl(ROUTES.login),
  register: buildAppAbsoluteUrl(ROUTES.signup),
  registerClient: buildAppAbsoluteUrl(`${ROUTES.signup}?role=client`),
  registerHelper: buildAppAbsoluteUrl(`${ROUTES.signup}?role=helper`),
  /** PWA install happens on app host — same entry as open. */
  install: buildAppAbsoluteUrl('/'),
} as const;

/** www.linkhelp.app institutional pages (landing, como-funciona, contato). */
export function isWwwInstitutionalSurface(pathname: string): boolean {
  return getCurrentHostProfile() === 'www' && isInstitutionalPath(pathname);
}

export function isExternalAbsoluteHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/**
 * On www host, marketplace routes link straight to app.linkhelp.app.
 * On app/combined/preview, keep same-origin paths for React Router.
 */
export function hrefForMarketplaceRoute(inAppPath: string): string {
  if (getCurrentHostProfile() === 'www') {
    return buildAppAbsoluteUrl(inAppPath);
  }
  return inAppPath;
}
