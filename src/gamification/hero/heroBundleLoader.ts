import { heroPerfMark, heroPerfMeasureSinceRecordResolved } from '@/gamification/hero/heroPerformance';
import { loadHeroAssetUrls } from '@/gamification/hero/heroAssetUrlLoaders';
import { loadHeroComponent, type HeroComponent } from '@/gamification/hero/heroLazyRegistry';
import {
  preloadDeferredImageUrls,
  preloadImageUrls,
} from '@/gamification/hero/heroImagePreload';
import type { UserType } from '@/gamification/types/gamification';

export type HeroBundleLoadOptions = {
  signal?: AbortSignal;
};

/**
 * Carrega chunk do Hero atual; preload/decode de PNGs em background (não bloqueia montagem).
 */
export async function loadHeroBundle(
  heroKey: string,
  userType: UserType,
  options?: HeroBundleLoadOptions,
): Promise<HeroComponent> {
  const { signal } = options ?? {};
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  heroPerfMark('import-start', heroKey);

  const [Component, assets] = await Promise.all([
    loadHeroComponent(heroKey, userType),
    loadHeroAssetUrls(heroKey),
  ]);

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  heroPerfMark('import-ready', heroKey);
  heroPerfMeasureSinceRecordResolved(heroKey);

  void preloadImageUrls(assets.essential).then(() => {
    heroPerfMark('assets-essential-ready', heroKey);
  });
  preloadDeferredImageUrls(assets.deferred);

  return Component;
}

export type { HeroSharedProps, HeroComponent } from '@/gamification/hero/heroLazyRegistry';
