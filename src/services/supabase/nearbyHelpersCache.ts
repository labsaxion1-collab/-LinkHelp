import type { NearbyHelper } from '@/types/nearbyHelper';
import { fetchNearbyHelpers } from '@/services/supabase/nearbyHelpersRemote';

const TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  fetchedAt: number;
  data: NearbyHelper[];
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<NearbyHelper[]>>();

function cacheKey(excludeUserId?: string): string {
  return excludeUserId ?? '__anonymous__';
}

/** Cached nearby helpers — shared across hooks/pages for the same viewer. */
export async function fetchNearbyHelpersCached(excludeUserId?: string): Promise<NearbyHelper[]> {
  const key = cacheKey(excludeUserId);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.fetchedAt < TTL_MS) {
    return hit.data;
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = fetchNearbyHelpers(excludeUserId)
    .then((data) => {
      cache.set(key, { fetchedAt: Date.now(), data });
      inflight.delete(key);
      return data;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, request);
  return request;
}

/** Test helper — clears module cache between unit tests. */
export function clearNearbyHelpersCacheForTests(): void {
  cache.clear();
  inflight.clear();
}
