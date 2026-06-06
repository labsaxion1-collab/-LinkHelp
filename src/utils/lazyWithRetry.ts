import type { ComponentType } from 'react';

const CHUNK_RELOAD_KEY = 'lh:chunk-reload';

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed/i.test(message);
}

/** Retry lazy route chunks once via full reload after deploy (PWA stale bundle). */
export function importWithRetry<T extends { default: ComponentType<unknown> }>(
  loader: () => Promise<T>,
): Promise<T> {
  return loader().catch((error: unknown) => {
    if (isChunkLoadError(error) && typeof window !== 'undefined') {
      if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
        window.location.reload();
      }
    }
    throw error;
  });
}

export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    /* ignore */
  }
}
