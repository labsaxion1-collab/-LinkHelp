import { ROUTES } from '@/utils/constants';
import {
  FLUX_HOSTNAME,
  isFluxHost as isFluxHostFromProfile,
  LINKHELP_PUBLIC_ORIGIN,
} from '@/utils/linkhelpHosts';

export { FLUX_HOSTNAME, LINKHELP_PUBLIC_ORIGIN };

export function isFluxHost(hostname?: string): boolean {
  return isFluxHostFromProfile(hostname);
}

export function getCurrentOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return LINKHELP_PUBLIC_ORIGIN;
}

/** Admin BackOffice / FLUX dashboard paths. */
export function isAdminRoute(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

/** Paths that must render as-is on flux.linkhelp.app (no FLUX entry redirect). */
export function isFluxHostAllowedPath(pathname: string): boolean {
  return (
    pathname === ROUTES.adminLogin ||
    pathname === ROUTES.fluxAccessDenied ||
    pathname === ROUTES.authCallback ||
    isAdminRoute(pathname)
  );
}

/** Public marketplace entry routes blocked on the FLUX host. */
export function isFluxHostMarketplaceEntry(pathname: string): boolean {
  return (
    pathname === ROUTES.home ||
    pathname === ROUTES.login ||
    pathname === ROUTES.signup ||
    pathname === ROUTES.howItWorks ||
    pathname === ROUTES.contact
  );
}
