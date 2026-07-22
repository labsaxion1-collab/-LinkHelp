/**
 * WebP Preview — somente client_confiavel.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

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
    expect(src).toContain("bg-roxo.png");
    expect(src).not.toContain('webp');
  });
});

describe('clientConfiavelHeroMedia flags', () => {
  it('exporta camadas png e webp distintas', async () => {
    const media = await import('@/gamification/hero/clientConfiavelHeroMedia');
    expect(media.CLIENT_CONFIAVEL_HERO_MEDIA.background.webp).toContain('.webp');
    expect(media.CLIENT_CONFIAVEL_HERO_MEDIA.background.png).toMatch(/\.png$/);
  });
});
