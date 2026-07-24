/** Central hostname / origin constants for LinkHelp multi-host routing. */

export const WWW_HOSTNAME = 'www.linkhelp.app';
/** Apex domain — may serve combined profile until canonical redirect; legacy PWA still uses this host. */
export const APEX_HOSTNAME = 'linkhelp.app';
export const APP_HOSTNAME = 'app.linkhelp.app';
export const FLUX_HOSTNAME = 'flux.linkhelp.app';

export const PUBLIC_ORIGIN = 'https://www.linkhelp.app';
export const APP_ORIGIN = 'https://app.linkhelp.app';
export const FLUX_ORIGIN = 'https://flux.linkhelp.app';

/** @deprecated Use PUBLIC_ORIGIN — kept for fluxHost importers */
export const LINKHELP_PUBLIC_ORIGIN = PUBLIC_ORIGIN;

export type LinkhelpHostProfile = 'www' | 'app' | 'flux' | 'combined';

export type ResolveHostProfileOptions = {
  /** When true, ignore VITE_LINKHELP_HOST_PROFILE (production behavior). */
  production?: boolean;
  /** Dev/preview simulation override (tests). */
  simulatedProfile?: LinkhelpHostProfile | null;
};

export function isPreviewHost(hostname: string): boolean {
  return hostname.toLowerCase().endsWith('.vercel.app');
}

export function isLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1';
}

function readSimulatedProfileFromEnv(): LinkhelpHostProfile | null {
  const raw = import.meta.env.VITE_LINKHELP_HOST_PROFILE?.trim().toLowerCase();
  if (raw === 'www' || raw === 'app' || raw === 'flux') return raw;
  return null;
}

/**
 * Maps hostname → host profile. Production real hostnames always win over simulation.
 * Vercel Preview hosts may use VITE_LINKHELP_HOST_PROFILE (e.g. `app`) without affecting
 * www/app/flux production domains.
 */
export function resolveHostProfileFromHostname(
  hostname: string,
  options: ResolveHostProfileOptions = {},
): LinkhelpHostProfile {
  const h = hostname.toLowerCase();
  const production = options.production ?? import.meta.env.PROD;

  if (production) {
    if (h === FLUX_HOSTNAME) return 'flux';
    if (h === APP_HOSTNAME) return 'app';
    if (h === WWW_HOSTNAME) return 'www';
    // Preview only — never override real production hostnames above.
    if (isPreviewHost(h)) {
      const simulated =
        options.simulatedProfile !== undefined
          ? options.simulatedProfile
          : readSimulatedProfileFromEnv();
      if (simulated) return simulated;
    }
    return 'combined';
  }

  if (h === FLUX_HOSTNAME) return 'flux';
  if (h === APP_HOSTNAME) return 'app';
  if (h === WWW_HOSTNAME) return 'www';

  const simulated =
    options.simulatedProfile !== undefined ? options.simulatedProfile : readSimulatedProfileFromEnv();
  if (simulated) return simulated;

  return 'combined';
}

export function getCurrentHostProfile(): LinkhelpHostProfile {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  return resolveHostProfileFromHostname(hostname);
}

export function isFluxHost(hostname?: string): boolean {
  if (hostname !== undefined) {
    return hostname.toLowerCase() === FLUX_HOSTNAME;
  }
  return getCurrentHostProfile() === 'flux';
}

export function isWwwHost(hostname?: string): boolean {
  if (hostname !== undefined) {
    return hostname.toLowerCase() === WWW_HOSTNAME;
  }
  return getCurrentHostProfile() === 'www';
}

/** Hostnames where an old marketplace PWA could have been installed (not app/flux). */
export function isLegacyWwwPublicHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === WWW_HOSTNAME || h === APEX_HOSTNAME;
}

export function isAppHost(hostname?: string): boolean {
  if (hostname !== undefined) {
    return hostname.toLowerCase() === APP_HOSTNAME;
  }
  return getCurrentHostProfile() === 'app';
}

export function getPublicOrigin(): string {
  return PUBLIC_ORIGIN;
}

export function getAppOrigin(): string {
  return APP_ORIGIN;
}

export function getFluxOrigin(): string {
  return FLUX_ORIGIN;
}

/** Service Worker — app host only (or dev/preview with simulated app profile). */
export function shouldRegisterServiceWorker(): boolean {
  return getCurrentHostProfile() === 'app';
}

/** PWA install prompt — same rule as SW registration. */
export function shouldShowPwaInstallPrompt(): boolean {
  return shouldRegisterServiceWorker();
}
