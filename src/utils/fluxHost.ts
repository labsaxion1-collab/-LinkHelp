/** Production FLUX console hostname (same Vercel project as www). */
export const FLUX_HOSTNAME = 'flux.linkhelp.app';

/** Public marketplace origin — never used for Preview returnTo fallbacks. */
export const LINKHELP_PUBLIC_ORIGIN = 'https://www.linkhelp.app';

export function isFluxHost(hostname?: string): boolean {
  const h = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase();
  return h === FLUX_HOSTNAME;
}

export function getCurrentOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return LINKHELP_PUBLIC_ORIGIN;
}

/** Admin BackOffice / FLUX dashboard paths. */
export function isAdminRoute(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}
