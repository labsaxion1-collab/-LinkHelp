import type { ComponentType } from 'react';

const CHUNK_RELOAD_KEY = 'lh:chunk-reload';
const RETRY_DELAY_MS = 400;

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    message,
  );
}

function reloadForStaleChunk(): Promise<never> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Chunk load failed'));
  }
  if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
    window.location.reload();
  }
  return new Promise<never>(() => {
    /* page is reloading */
  });
}

/** Retry lazy route chunks, then one controlled full reload after deploy (PWA stale bundle). */
export function importWithRetry<T extends { default: ComponentType<unknown> }>(
  loader: () => Promise<T>,
): Promise<T> {
  const attempt = (retriesLeft: number): Promise<T> =>
    loader().catch((error: unknown) => {
      if (!isChunkLoadError(error)) {
        throw error;
      }
      if (retriesLeft > 0) {
        return new Promise<T>((resolve, reject) => {
          window.setTimeout(() => {
            attempt(retriesLeft - 1).then(resolve).catch(reject);
          }, RETRY_DELAY_MS);
        });
      }
      return reloadForStaleChunk();
    });

  return attempt(1);
}

export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    /* ignore */
  }
}
