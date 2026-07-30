import {
  APP_HOSTNAME,
  FLUX_HOSTNAME,
  STAGING_TEST_HOSTNAME,
  WWW_HOSTNAME,
  APEX_HOSTNAME,
  isLocalHost,
  isPreviewHost,
} from '@/utils/linkhelpHosts';

/**
 * Pause / resume / cancel RPCs are not in staging packs 20–60.
 * Disable those controls on staging/dev/preview hosts only.
 * Production marketplace hosts keep the controls (historical DB may still have the RPCs).
 */
export function isRequestLifecycleControlsEnabled(hostname?: string): boolean {
  const host =
    (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase();

  if (!host) return true;

  if (isLocalHost(host) || isPreviewHost(host) || host === STAGING_TEST_HOSTNAME) {
    return false;
  }

  // Production app / public / flux keep lifecycle UI.
  if (
    host === APP_HOSTNAME ||
    host === FLUX_HOSTNAME ||
    host === WWW_HOSTNAME ||
    host === APEX_HOSTNAME
  ) {
    return true;
  }

  return true;
}
