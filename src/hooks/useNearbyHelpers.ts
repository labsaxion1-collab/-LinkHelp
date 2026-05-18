import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUserLocation } from '@/hooks/useUserLocation';
import { fetchNearbyHelpers } from '@/services/supabase/nearbyHelpersRemote';
import type { NearbyHelperMapPoint } from '@/types/nearbyHelper';
import { enrichNearbyHelpersForMap, sortNearbyHelpers } from '@/utils/nearbyHelpersMatching';

type Options = {
  relatedCategoryIds?: string[];
};

export function useNearbyHelpers(options: Options = {}) {
  const { profile, session } = useAuth();
  const { coords, ready: locationReady } = useUserLocation();
  const [helpers, setHelpers] = useState<NearbyHelperMapPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const relatedKey = options.relatedCategoryIds?.join('|') ?? '';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void (async () => {
      const rows = await fetchNearbyHelpers(session?.user?.id);
      if (cancelled) return;

      const sorted = sortNearbyHelpers(rows, {
        origin: coords,
        clientCity: profile?.city,
        clientProvince: profile?.province,
        clientCountry: profile?.country,
        relatedCategoryIds: options.relatedCategoryIds,
      });

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
    profile?.city,
    profile?.province,
    profile?.country,
    relatedKey,
    options.relatedCategoryIds,
  ]);

  const withCoords = useMemo(() => helpers.filter((h) => h.mapPosition != null), [helpers]);

  return {
    helpers,
    helpersWithMapPosition: withCoords,
    loading,
    locationReady,
    clientCenter: coords,
  };
}
