import { ROUTES } from '@/utils/constants';
import { isAdminRoute } from '@/utils/fluxHost';
import {
  APP_ORIGIN,
  FLUX_ORIGIN,
  PUBLIC_ORIGIN,
  type LinkhelpHostProfile,
} from '@/utils/linkhelpHosts';

export const INSTITUTIONAL_PATHS: readonly string[] = [
  ROUTES.home,
  ROUTES.howItWorks,
  ROUTES.contact,
];

export function isInstitutionalPath(pathname: string): boolean {
  return INSTITUTIONAL_PATHS.some((p) => pathname === p);
}

export function buildExternalOriginUrl(
  origin: string,
  pathname: string,
  search = '',
  hash = '',
): string {
  const base = origin.replace(/\/+$/, '');
  return `${base}${pathname}${search}${hash}`;
}

export type HostLocationParts = {
  pathname: string;
  search?: string;
  hash?: string;
};

/**
 * External redirect target when crossing origins, or null to stay in-app.
 * Order: www→app, app→flux (admin), app→www (institutional pages except / handled separately).
 */
export function resolveExternalHostRedirect(
  profile: LinkhelpHostProfile,
  location: HostLocationParts,
): string | null {
  const { pathname, search = '', hash = '' } = location;

  if (profile === 'www' && !isInstitutionalPath(pathname)) {
    return buildExternalOriginUrl(APP_ORIGIN, pathname, search, hash);
  }

  if (profile === 'app') {
    if (pathname === ROUTES.howItWorks || pathname === ROUTES.contact) {
      return buildExternalOriginUrl(PUBLIC_ORIGIN, pathname, search, hash);
    }
    if (
      isAdminRoute(pathname) ||
      pathname === ROUTES.adminLogin ||
      pathname === ROUTES.fluxAccessDenied
    ) {
      return buildExternalOriginUrl(FLUX_ORIGIN, pathname, search, hash);
    }
  }

  return null;
}

/** Catch-all in-app target (no cross-origin). */
export function resolveCatchAllInAppTarget(profile: LinkhelpHostProfile): string {
  if (profile === 'flux') return ROUTES.adminDashboard;
  if (profile === 'app') return ROUTES.login;
  return ROUTES.home;
}
