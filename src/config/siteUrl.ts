const DEFAULT_SITE_URL = 'https://link-help.vercel.app';

/** Browser / Vite — public site origin for Stripe redirect URLs. */
export function getSiteUrl(): string {
  const raw =
    (typeof import.meta !== 'undefined' ? (import.meta.env.VITE_SITE_URL as string | undefined) : undefined) ??
    DEFAULT_SITE_URL;
  return raw.replace(/\/$/, '');
}

/** Node / Vercel API — server-side site origin. */
export function getServerSiteUrl(): string {
  const raw = process.env.VITE_SITE_URL || process.env.SITE_URL || DEFAULT_SITE_URL;
  return raw.replace(/\/$/, '');
}
