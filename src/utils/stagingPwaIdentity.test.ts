/**
 * Staging PWA identity — source contracts (teste.linkhelp.app only).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STAGING_TEST_HOSTNAME, isStagingTestHost } from '@/utils/linkhelpHosts';

describe('staging PWA identity', () => {
  it('exposes staging hostname constant', () => {
    expect(STAGING_TEST_HOSTNAME).toBe('teste.linkhelp.app');
    expect(isStagingTestHost('teste.linkhelp.app')).toBe(true);
    expect(isStagingTestHost('app.linkhelp.app')).toBe(false);
    expect(isStagingTestHost('www.linkhelp.app')).toBe(false);
  });

  it('classifies staging as app without changing production hostnames', async () => {
    const { resolveHostProfileFromHostname, APP_HOSTNAME, WWW_HOSTNAME } = await import(
      '@/utils/linkhelpHosts'
    );
    expect(resolveHostProfileFromHostname('teste.linkhelp.app', { production: true })).toBe('app');
    expect(resolveHostProfileFromHostname(APP_HOSTNAME, { production: true })).toBe('app');
    expect(resolveHostProfileFromHostname(WWW_HOSTNAME, { production: true })).toBe('www');
  });

  it('ships a dedicated staging web manifest with unique identity', async () => {
    const raw = await readFile(resolve('public/manifest-staging.webmanifest'), 'utf8');
    const manifest = JSON.parse(raw) as {
      id: string;
      name: string;
      short_name: string;
      start_url: string;
      theme_color: string;
      icons: Array<{ src: string }>;
    };
    expect(manifest.id).toBe('https://teste.linkhelp.app/');
    expect(manifest.name).toBe('LinkHelp Teste');
    expect(manifest.short_name).toBe('LH Teste');
    expect(manifest.start_url).toBe('/');
    expect(manifest.theme_color.toLowerCase()).toBe('#ea580c');
    expect(manifest.icons.some((i) => i.src.includes('linkhelp-staging-192'))).toBe(true);
    expect(manifest.icons.some((i) => i.src.includes('linkhelp-staging-512'))).toBe(true);
  });

  it('keeps production VitePWA manifest name/short_name/id unchanged', async () => {
    const vite = await readFile(resolve('vite.config.ts'), 'utf8');
    expect(vite).toContain("id: '/'");
    expect(vite).toContain("name: 'LinkHelp'");
    expect(vite).toContain("short_name: 'LinkHelp'");
    expect(vite).toContain("theme_color: '#1565ff'");
    expect(vite).toContain('icons/linkhelp-app-192.png');
    expect(vite).toContain('icons/linkhelp-app-512.png');
  });

  it('selects staging manifest only on teste.linkhelp.app via index.html', async () => {
    const html = await readFile(resolve('index.html'), 'utf8');
    expect(html).toContain("STAGING_HOST = 'teste.linkhelp.app'");
    expect(html).toContain('/manifest-staging.webmanifest');
    expect(html).toContain('/icons/linkhelp-staging-180.png');
    expect(html).toContain('/icons/linkhelp-staging-192.png');
    expect(html).toContain('apple-mobile-web-app-title" content="LinkHelp"');
    expect(html).toContain('href="/icons/linkhelp-app-180.png"');
    expect(html).toContain('href="/icons/linkhelp-app-192.png"');
  });

  it('includes exclusive staging icon assets', async () => {
    for (const file of [
      'public/icons/linkhelp-staging-180.png',
      'public/icons/linkhelp-staging-192.png',
      'public/icons/linkhelp-staging-512.png',
      'public/icons/linkhelp-app-180.png',
      'public/icons/linkhelp-app-192.png',
      'public/icons/linkhelp-app-512.png',
    ]) {
      const buf = await readFile(resolve(file));
      expect(buf.byteLength).toBeGreaterThan(1000);
    }
  });
});
