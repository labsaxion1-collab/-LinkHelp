const DEFAULT_SITE_URL = 'https://link-help.vercel.app';

export function getServerSiteUrl(): string {
  const raw = process.env.VITE_SITE_URL || process.env.SITE_URL || DEFAULT_SITE_URL;
  return raw.replace(/\/$/, '');
}
