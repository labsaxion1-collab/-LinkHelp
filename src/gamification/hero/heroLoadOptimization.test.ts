/**
 * Lazy hero load, preload, skeleton único e assets por nível.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HERO_LAZY_LOADERS,
  loadHeroComponent,
  resetHeroLazyInflightForTests,
} from '@/gamification/hero/heroLazyRegistry';
import { preloadImageUrl, resetHeroImagePreloadCacheForTests } from '@/gamification/hero/heroImagePreload';
import {
  getKnownHeroAssetLoaderKeys,
  loadHeroAssetUrls,
  resetHeroAssetInflightForTests,
} from '@/gamification/hero/heroAssetUrlLoaders';
import { loadHeroBundle } from '@/gamification/hero/heroBundleLoader';
import * as heroLazyRegistry from '@/gamification/hero/heroLazyRegistry';
import * as heroAssetUrlLoaders from '@/gamification/hero/heroAssetUrlLoaders';

describe('heroLazyRegistry', () => {
  afterEach(() => {
    resetHeroLazyInflightForTests();
  });

  it('expõe loader dinâmico para cada hero key conhecida', () => {
    const keys = Object.keys(HERO_LAZY_LOADERS);
    expect(keys).toContain('helper_novo');
    expect(keys).toContain('client_elite');
    expect(keys.length).toBe(11);
  });

  it('loadHeroComponent reutiliza inflight para a mesma key', () => {
    const p1 = loadHeroComponent('helper_novo', 'helper');
    const p2 = loadHeroComponent('helper_novo', 'helper');
    expect(p1).toBe(p2);
  });

  it('cada loader usa import() dinâmico (não bundle único)', async () => {
    const src = await readFile(resolve('src/gamification/hero/heroLazyRegistry.tsx'), 'utf8');
    const dynamicImports = src.match(/import\('@\/components\/hero\//g) ?? [];
    expect(dynamicImports.length).toBeGreaterThanOrEqual(10);
  });
});

describe('heroAssetUrlLoaders', () => {
  afterEach(() => {
    resetHeroAssetInflightForTests();
  });

  it('tem loader de assets para cada hero key', () => {
    expect(getKnownHeroAssetLoaderKeys().sort()).toEqual(Object.keys(HERO_LAZY_LOADERS).sort());
  });

  it('não importa todos os PNGs estaticamente num único módulo', async () => {
    const src = await readFile(resolve('src/gamification/hero/heroAssetUrlLoaders.ts'), 'utf8');
    expect(src).not.toMatch(/^import .* from '@\/assets\/hero\//m);
    expect(src).toContain("import('@/assets/hero/");
  });

  it('partículas ficam em deferred, não em essential', async () => {
    const assets = await loadHeroAssetUrls('client_confiavel');
    expect(assets.deferred.length).toBeGreaterThan(0);
    for (const url of assets.deferred) {
      expect(assets.essential).not.toContain(url);
    }
  });
});

describe('heroImagePreload', () => {
  afterEach(() => {
    resetHeroImagePreloadCacheForTests();
  });

  it('preloadImageUrl resolve em ambiente node (sem window)', async () => {
    await expect(preloadImageUrl('/assets/test.png')).resolves.toBeUndefined();
  });
});

describe('loadHeroBundle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetHeroAssetInflightForTests();
  });

  it('chunk + assets do heroKey atual; preload não bloqueia', async () => {
    const FakeHero = () => null;
    vi.spyOn(heroLazyRegistry, 'loadHeroComponent').mockResolvedValue(FakeHero);
    vi.spyOn(heroAssetUrlLoaders, 'loadHeroAssetUrls').mockResolvedValue({
      essential: ['/bg.png'],
      deferred: ['/p.png'],
    });

    const component = await loadHeroBundle('client_ouro', 'client');
    expect(component).toBe(FakeHero);
    expect(heroAssetUrlLoaders.loadHeroAssetUrls).toHaveBeenCalledWith('client_ouro');
    expect(heroLazyRegistry.loadHeroComponent).toHaveBeenCalledWith('client_ouro', 'client');
  });

  it('abort signal interrompe antes de retornar', async () => {
    const controller = new AbortController();
    vi.spyOn(heroLazyRegistry, 'loadHeroComponent').mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(() => null), 100);
        }),
    );
    controller.abort();
    await expect(loadHeroBundle('helper_novo', 'helper', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});

describe('DynamicHeroRenderer', () => {
  it('não contém imports estáticos de heroes', async () => {
    const src = await readFile(
      resolve('src/gamification/components/DynamicHeroRenderer.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/from '@\/components\/hero\//);
    expect(src).toContain('GamificationHeroGate');
  });
});

describe('GamificationHeroGate — skeleton único', () => {
  it('usa um só GamificationHeroSkeleton até chunk pronto', async () => {
    const src = await readFile(resolve('src/gamification/hero/GamificationHeroGate.tsx'), 'utf8');
    expect(src).toContain('GamificationHeroSkeleton');
    expect(src).toContain('lh-gamification-hero-progressive');
    expect(src).not.toContain('animate-in fade-in');
    expect(src).toMatch(/heroReady|visibleKey/);
  });

  it('cancela carga ao trocar heroKey ou conta', async () => {
    const src = await readFile(resolve('src/gamification/hero/GamificationHeroGate.tsx'), 'utf8');
    expect(src).toContain('controller.abort()');
    expect(src).toContain('visibleKey === heroKey');
  });
});

describe('PWA — hero PNGs', () => {
  it('precache Workbox não inclui PNG genérico de assets (hero on-demand)', async () => {
    const src = await readFile(resolve('vite.config.ts'), 'utf8');
    expect(src).toMatch(/globPatterns.*webp/);
    expect(src).not.toMatch(/globPatterns.*\*\.png/);
  });
});

describe('heroPerformance (DEV)', () => {
  it('heroPerfMark é no-op fora de DEV', async () => {
    const { heroPerfMark } = await import('@/gamification/hero/heroPerformance');
    expect(() => heroPerfMark('test')).not.toThrow();
  });
});
