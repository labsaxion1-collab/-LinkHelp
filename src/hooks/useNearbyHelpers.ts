import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUserLocation, type UserLocationSource } from '@/hooks/useUserLocation';
import { fetchNearbyHelpers } from '@/services/supabase/nearbyHelpersRemote';
import type { NearbyHelperMapPoint } from '@/types/nearbyHelper';
import {
  enrichNearbyHelpersForMap,
  filterNearbyHelpers,
  sortNearbyHelpers,
} from '@/utils/nearbyHelpersMatching';
import { profileRegionFromRow } from '@/utils/profileLocation';

type Options = {
  relatedCategoryIds?: string[];
};

export function useNearbyHelpers(options: Options = {}) {
  const { profile, session } = useAuth();
  const { coords, ready: locationReady, source: locationSource } = useUserLocation();
  const [helpers, setHelpers] = useState<NearbyHelperMapPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const relatedKey = options.relatedCategoryIds?.join('|') ?? '';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void (async () => {
      const rows = await fetchNearbyHelpers(session?.user?.id);
      if (cancelled) return;

      const hasKnownOrigin = locationSource === 'gps' || locationSource === 'profile';
      const sortCtx = {
        origin: coords,
        clientCity: profile?.city,
        clientRegion: profileRegionFromRow(profile),
        clientCountry: profile?.country,
        relatedCategoryIds: options.relatedCategoryIds,
        hasGpsOrigin: locationSource === 'gps',
      };

      const nearby = filterNearbyHelpers(rows, { ...sortCtx, hasKnownOrigin });
      const sorted = sortNearbyHelpers(nearby, sortCtx);

      setHelpers(enrichNearbyHelpersForMap(sorted, coords));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    session?.user?.id,
    coords.lat,
    coords.lng,
    locationSource,
    profile?.city,
    profile?.region,
    profile?.country,
    relatedKey,
    options.relatedCategoryIds,
  ]);

  const withCoords = useMemo(() => helpers.filter((h) => h.mapPosition != null), [helpers]);

  return {
    helpers,
    helpersWithMapPosition: withCoords,
    nearbyCount: helpers.length,
    loading,
    locationReady,
    locationSource: locationSource as UserLocationSource,
    clientCenter: coords,
  };
}
