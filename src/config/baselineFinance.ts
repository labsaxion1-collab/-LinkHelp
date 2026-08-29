/**
 * Gates UI/RPC payloads that require the staging baseline (packs 40–60).
 *
 * Default OFF so Production (`app.linkhelp.app`) keeps working against the historical DB
 * (no `service_mode` column / publish contract) until Production DB is upgraded.
 *
 * Enabled when:
 * - Preview/build sets `VITE_LINKHELP_BASELINE_FINANCE=true`, or
 * - Runtime host is `teste.linkhelp.app` (staging DB already has pack 40).
 */
import { STAGING_TEST_HOSTNAME } from '@/utils/linkhelpHosts';

export function isBaselineFinanceEnabled(): boolean {
  const raw = (import.meta.env.VITE_LINKHELP_BASELINE_FINANCE as string | undefined)?.trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on') return true;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === STAGING_TEST_HOSTNAME) return true;
  }
  return false;
}

/** Canonical SQL values for requests.service_mode (pack 40). */
export type ServiceMode = 'remote' | 'in_person';

export function isServiceMode(value: unknown): value is ServiceMode {
  return value === 'remote' || value === 'in_person';
}

/** Map legacy UI labels to SQL service_mode. */
export function coerceServiceMode(value: unknown): ServiceMode | null {
  if (isServiceMode(value)) return value;
  if (value === 'online') return 'remote';
  if (value === 'presencial' || value === 'in-person') return 'in_person';
  return null;
}
