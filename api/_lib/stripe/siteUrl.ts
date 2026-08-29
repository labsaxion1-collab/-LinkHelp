/**
 * Server-side site origin for Stripe redirect URLs.
 * Never invents a production default — isolation + callers must configure SITE_URL.
 */

import {
  resolveCheckoutReturnOrigin,
  isAllowedCheckoutOrigin as isAllowedCheckoutOriginForTarget,
  type LinkhelpDeployTarget,
} from '../../../shared/environmentIsolation.js';

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function isValidAbsoluteHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeSiteUrl(raw: string | undefined): string | null {
  if (!raw) return null;

  let value = stripWrappingQuotes(raw);
  if (!value) return null;

  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  value = value.replace(/\/+$/, '');
  return isValidAbsoluteHttpUrl(value) ? value : null;
}

/** Env SITE_URL / VITE_SITE_URL only — no production fallback. */
export function getServerSiteUrl(): string | null {
  const candidates = [process.env.VITE_SITE_URL, process.env.SITE_URL];
  for (const raw of candidates) {
    const normalized = normalizeSiteUrl(raw);
    if (normalized) return normalized;
  }
  return null;
}

/** @deprecated Use isAllowedCheckoutOriginForDeployTarget — kept for existing host tests. */
export function isAllowedCheckoutOrigin(origin: string): boolean {
  return (
    isAllowedCheckoutOriginForTarget(origin, 'staging') ||
    isAllowedCheckoutOriginForTarget(origin, 'production') ||
    isAllowedCheckoutOriginForTarget(origin, 'local')
  );
}

export function isAllowedCheckoutOriginForDeployTarget(
  origin: string,
  deployTarget: LinkhelpDeployTarget,
): boolean {
  return isAllowedCheckoutOriginForTarget(origin, deployTarget);
}

/**
 * Prefer a same-environment browser origin. Cross-env origins are rejected.
 * Falls back to env SITE_URL only when that URL matches the deploy target.
 */
export function resolveCheckoutSiteUrl(
  clientOrigin?: string,
  deployTarget: LinkhelpDeployTarget = 'unknown',
): string | null {
  const resolved = resolveCheckoutReturnOrigin({
    clientOrigin,
    siteUrl: getServerSiteUrl(),
    deployTarget,
  });
  if (resolved.issue) return null;
  return resolved.origin;
}
