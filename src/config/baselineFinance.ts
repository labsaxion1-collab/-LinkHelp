/**
 * Gates UI/RPC payloads that require the staging baseline (packs 40–60).
 *
 * Default OFF so teste.linkhelp.app / Preview keep working against the historical DB
 * (no `service_mode` column / publish contract).
 *
 * Activate at Preview cutover by setting Preview-only:
 *   VITE_LINKHELP_BASELINE_FINANCE=true
 * Never enable on Production until Production DB has the same baseline.
 */
export function isBaselineFinanceEnabled(): boolean {
  const raw = (import.meta.env.VITE_LINKHELP_BASELINE_FINANCE as string | undefined)?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
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
