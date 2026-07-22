import { heroPerfMark, heroPerfMeasure } from '@/gamification/hero/heroPerformance';

const preloadCache = new Map<string, Promise<void>>();

/**
 * Pré-carrega e decodifica imagens (best-effort). Falhas não propagam.
 */
export function preloadImageUrl(url: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const cached = preloadCache.get(url);
  if (cached) return cached;

  const task = new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (typeof img.decode === 'function') {
        void img
          .decode()
          .then(() => resolve())
          .catch(() => resolve());
      } else {
        resolve();
      }
    };
    img.onerror = () => resolve();
    img.src = url;
  });

  preloadCache.set(url, task);
  return task;
}

export async function preloadImageUrls(urls: readonly string[]): Promise<void> {
  if (!urls.length) return;
  heroPerfMark('assets-start');
  await Promise.all(urls.map((url) => preloadImageUrl(url)));
  heroPerfMark('assets-essential-ready');
  heroPerfMeasure('assets-essential', 'lh-hero-perf:assets-start', 'lh-hero-perf:assets-essential-ready');
}

export function preloadDeferredImageUrls(urls: readonly string[]): void {
  if (!urls.length || typeof window === 'undefined') return;
  for (const url of urls) {
    void preloadImageUrl(url);
  }
}

/** Test-only */
export function resetHeroImagePreloadCacheForTests(): void {
  preloadCache.clear();
}
