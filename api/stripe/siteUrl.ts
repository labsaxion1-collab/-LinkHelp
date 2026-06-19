const DEFAULT_SITE_URL = 'https://www.linkhelp.app';

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

/** Server-side site origin for Stripe redirect URLs. */
export function getServerSiteUrl(): string {
  const candidates = [process.env.VITE_SITE_URL, process.env.SITE_URL];

  for (const raw of candidates) {
    const normalized = normalizeSiteUrl(raw);
    if (normalized) return normalized;
  }

  return DEFAULT_SITE_URL;
}

function hostnameAllowed(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  if (hostname === 'linkhelp.app' || hostname === 'www.linkhelp.app') return true;
  if (hostname.endsWith('.vercel.app')) return true;
  return false;
}

/** Validates a client-provided origin for Stripe return URLs (must match logged-in domain). */
export function isAllowedCheckoutOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return hostnameAllowed(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Prefer the browser origin where checkout started so Supabase session (localStorage)
 * survives the Stripe redirect. Falls back to env SITE_URL when origin is missing/invalid.
 */
export function resolveCheckoutSiteUrl(clientOrigin?: string): string {
  const normalizedClient = normalizeSiteUrl(clientOrigin);
  if (normalizedClient && isAllowedCheckoutOrigin(normalizedClient)) {
    return normalizedClient;
  }
  return getServerSiteUrl();
}
