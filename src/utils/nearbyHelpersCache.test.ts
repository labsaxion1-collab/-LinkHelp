import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearNearbyHelpersCacheForTests,
  fetchNearbyHelpersCached,
} from '@/services/supabase/nearbyHelpersCache';
import * as remote from '@/services/supabase/nearbyHelpersRemote';

describe('nearbyHelpersCache', () => {
  afterEach(() => {
    clearNearbyHelpersCacheForTests();
    vi.restoreAllMocks();
  });

  it('reuses cached helpers within TTL', async () => {
    const spy = vi.spyOn(remote, 'fetchNearbyHelpers').mockResolvedValue([
      {
        id: 'h1',
        name: 'Helper',
        avatarUrl: null,
        rating: 5,
        bio: null,
        city: 'Montreal',
        region: 'QC',
        country: 'CA',
        skillIds: [],
        latitude: null,
        longitude: null,
        onlineStatus: null,
      },
    ]);

    await fetchNearbyHelpersCached('client-1');
    await fetchNearbyHelpersCached('client-1');

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent requests for the same viewer', async () => {
    let resolveFetch!: (value: Awaited<ReturnType<typeof remote.fetchNearbyHelpers>>) => void;
    const spy = vi.spyOn(remote, 'fetchNearbyHelpers').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const first = fetchNearbyHelpersCached('client-2');
    const second = fetchNearbyHelpersCached('client-2');

    resolveFetch([]);
    await Promise.all([first, second]);

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
