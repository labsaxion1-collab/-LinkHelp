import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUserLocation, type UserLocationSource } from '@/hooks/useUserLocation';
import { fetchNearbyHelpersCached } from '@/services/supabase/nearbyHelpersCache';
import type { NearbyHelper, NearbyHelperMapPoint } from '@/types/nearbyHelper';
import {
  enrichNearbyHelpersForMap,
  filterNearbyHelpers,
  sortNearbyHelpers,
} from '@/utils/nearbyHelpersMatching';
import { profileRegionFromRow } from '@/utils/profileLocation';

type Options = {
  relatedCategoryIds?: string[];
  /** When false, skip network — Home mounts without waiting for nearby helpers. */
  enabled?: boolean;
};

function processNearbyHelpers(
  rows: NearbyHelper[],
  options: {
    coords: { lat: number; lng: number };
    locationSource: UserLocationSource | string;
    profile: ReturnType<typeof useAuth>['profile'];
    relatedCategoryIds?: string[];
  },
): NearbyHelperMapPoint[] {
  const hasKnownOrigin = options.locationSource === 'gps' || options.locationSource === 'profile';
  const sortCtx = {
    origin: options.coords,
    clientCity: options.profile?.city,
    clientRegion: profileRegionFromRow(options.profile),
    clientCountry: options.profile?.country,
    relatedCategoryIds: options.relatedCategoryIds,
    hasGpsOrigin: options.locationSource === 'gps',
  };

  const nearby = filterNearbyHelpers(rows, { ...sortCtx, hasKnownOrigin });
  const sorted = sortNearbyHelpers(nearby, sortCtx);
  return enrichNearbyHelpersForMap(sorted, options.coords);
}

export function useNearbyHelpers(options: Options = {}) {
  const { profile, session, sessionConfirmed } = useAuth();
  const { coords, ready: locationReady, source: locationSource } = useUserLocation();
  const [rawHelpers, setRawHelpers] = useState<NearbyHelper[]>([]);
  const [loading, setLoading] = useState(Boolean(options.enabled ?? true));
  const enabled = (options.enabled ?? true) && sessionConfirmed;

  const viewerId = session?.user?.id;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    void fetchNearbyHelpersCached(viewerId)
      .then((rows) => {
        if (!cancelled) setRawHelpers(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [viewerId, enabled]);

  const relatedKey = options.relatedCategoryIds?.join('|') ?? '';

  const helpers = useMemo(
    () =>
      processNearbyHelpers(rawHelpers, {
        coords,
        locationSource,
        profile,
        relatedCategoryIds: options.relatedCategoryIds,
      }),
    [
      rawHelpers,
      coords.lat,
      coords.lng,
      locationSource,
      locationReady,
      profile?.city,
      profile?.region,
      profile?.country,
      relatedKey,
    ],
  );

  const withCoords = useMemo(() => helpers.filter((h) => h.mapPosition != null), [helpers]);

  return {
    helpers: enabled ? helpers : [],
    helpersWithMapPosition: enabled ? withCoords : [],
    nearbyCount: enabled ? helpers.length : 0,
    loading: enabled ? loading || !locationReady : false,
    locationReady,
    locationSource: locationSource as UserLocationSource,
    clientCenter: coords,
  };
}
