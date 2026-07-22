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
 * Carrega chunk do Hero atual + decodifica assets essenciais em paralelo.
 * URLs de PNG só entram via import() dinâmico por heroKey.
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

  const assetsPromise = loadHeroAssetUrls(heroKey);
  const componentPromise = loadHeroComponent(heroKey, userType);

  const [Component, assets] = await Promise.all([componentPromise, assetsPromise]);

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  await preloadImageUrls(assets.essential);

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  heroPerfMark('import-ready', heroKey);
  heroPerfMeasureSinceRecordResolved(heroKey);
  preloadDeferredImageUrls(assets.deferred);
  return Component;
}

export type { HeroSharedProps, HeroComponent } from '@/gamification/hero/heroLazyRegistry';
