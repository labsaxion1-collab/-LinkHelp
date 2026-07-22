/**
 * WebP — somente client_confiavel (Preview + Production).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CLIENT_CONFIAVEL_HERO_MEDIA,
  clientConfiavelPreloadUrls,
  clientConfiavelPrimarySrc,
} from '@/gamification/hero/clientConfiavelHeroMedia';

describe('clientConfiavel Hero WebP', () => {
  it('lazy registry carrega ClientConfiavelHeroWebPValidation', async () => {
    const src = await readFile(resolve('src/gamification/hero/heroLazyRegistry.tsx'), 'utf8');
    expect(src).toContain('ClientConfiavelHeroWebPValidation');
    expect(src).not.toContain("ClientConfiavelhero').then");
  });

  it('heroAssetUrlLoaders delega preload ao clientConfiavelHeroMedia', async () => {
    const src = await readFile(resolve('src/gamification/hero/heroAssetUrlLoaders.ts'), 'utf8');
    const clientBlock = src.slice(src.indexOf('client_confiavel:'), src.indexOf('helper_profissional:'));
    expect(clientBlock).toContain('clientConfiavelPreloadUrls');
    expect(clientBlock).not.toContain("import('@/assets/hero/backgrounds/client/bg-roxo.png?url')");
  });

  it('HeroPictureLayer usa picture com fallback PNG', async () => {
    const src = await readFile(resolve('src/components/hero/HeroPictureLayer.tsx'), 'utf8');
    expect(src).toContain('<picture');
    expect(src).toContain('type="image/webp"');
    expect(src).toContain('layer.png');
  });

  it('outros heroKeys não importam clientConfiavelHeroMedia no loader', async () => {
    const src = await readFile(resolve('src/gamification/hero/heroAssetUrlLoaders.ts'), 'utf8');
    const clientBlock = src.slice(src.indexOf('client_confiavel:'), src.indexOf('helper_profissional:'));
    expect(clientBlock).toContain('clientConfiavelPreloadUrls');
    expect(src.indexOf('clientConfiavelPreloadUrls')).toBe(
      src.lastIndexOf('clientConfiavelPreloadUrls'),
    );
  });

  it('ClientConfiavelhero.tsx original permanece PNG (congelado)', async () => {
    const src = await readFile(resolve('src/components/hero/ClientConfiavelhero.tsx'), 'utf8');
    expect(src).toContain('bg-roxo.png');
    expect(src).not.toContain('webp');
  });

  it('preload e render usam a mesma URL WebP por camada', () => {
    const essential = clientConfiavelPreloadUrls();
    expect(essential[0]).toBe(CLIENT_CONFIAVEL_HERO_MEDIA.background.webp);
    expect(essential[1]).toBe(CLIENT_CONFIAVEL_HERO_MEDIA.medal.webp);
    expect(essential[2]).toBe(CLIENT_CONFIAVEL_HERO_MEDIA.pedestal.webp);
    expect(clientConfiavelPrimarySrc(CLIENT_CONFIAVEL_HERO_MEDIA.medal)).toBe(essential[1]);
    expect(clientConfiavelPrimarySrc(CLIENT_CONFIAVEL_HERO_MEDIA.pedestal)).toBe(essential[2]);
  });

  it('ranking/thresholds não alterados neste módulo', async () => {
    const src = await readFile(resolve('src/gamification/hero/clientConfiavelHeroMedia.ts'), 'utf8');
    expect(src).not.toMatch(/threshold|score|levelEngine|progressEngine/i);
  });
});

describe('clientConfiavelHeroMedia flags', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exporta camadas png e webp distintas', () => {
    expect(CLIENT_CONFIAVEL_HERO_MEDIA.background.webp).toContain('.webp');
    expect(CLIENT_CONFIAVEL_HERO_MEDIA.background.png).toMatch(/\.png$/);
  });

  it('WebP ativo em preview e production por padrão', async () => {
    vi.stubEnv('VITE_CLIENT_CONFIAVEL_HERO_WEBP', '');
    vi.stubEnv('VITE_VERCEL_ENV', 'preview');
    vi.resetModules();
    const preview = await import('@/gamification/hero/clientConfiavelHeroMedia');
    expect(preview.isClientConfiavelHeroWebpEnabled()).toBe(true);
    expect(preview.clientConfiavelPreloadUrls()[0]).toMatch(/\.webp$/);

    vi.stubEnv('VITE_VERCEL_ENV', 'production');
    vi.resetModules();
    const prod = await import('@/gamification/hero/clientConfiavelHeroMedia');
    expect(prod.isClientConfiavelHeroWebpEnabled()).toBe(true);
    expect(prod.clientConfiavelPreloadUrls()[0]).toMatch(/\.webp$/);
  });

  it('kill-switch VITE_CLIENT_CONFIAVEL_HERO_WEBP=false usa PNG', async () => {
    vi.stubEnv('VITE_CLIENT_CONFIAVEL_HERO_WEBP', 'false');
    vi.resetModules();
    const mod = await import('@/gamification/hero/clientConfiavelHeroMedia');
    expect(mod.isClientConfiavelHeroWebpEnabled()).toBe(false);
    expect(mod.clientConfiavelPreloadUrls()[0]).toMatch(/\.png$/);
  });
});
