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
 * Authoritative client cancel RPC (0065). Enabled on all app hosts once migration is applied.
 */
export function isRequestCancelEnabled(hostname?: string): boolean {
  void hostname;
  return true;
}

/**
 * @deprecated Pause/resume removed from product (no paused status in DB). Use isRequestCancelEnabled.
 */
export function isRequestLifecycleControlsEnabled(hostname?: string): boolean {
  void hostname;
  return false;
}
