import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  coordinatesFromProfile,
  DEFAULT_MAP_CENTER,
  requestBrowserCoordinates,
  type Coordinates,
} from '@/utils/geocodeLocation';

export type UserLocationSource = 'gps' | 'profile' | 'default';

export function useUserLocation() {
  const { profile } = useAuth();
  const [coords, setCoords] = useState<Coordinates>(DEFAULT_MAP_CENTER);
  const [source, setSource] = useState<UserLocationSource>('default');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const gps = await requestBrowserCoordinates();
      if (cancelled) return;

      if (gps) {
        setCoords(gps);
        setSource('gps');
        setReady(true);
        return;
      }

      const profileCoords = coordinatesFromProfile(profile);
      if (profileCoords) {
        setCoords(profileCoords);
        setSource('profile');
        setReady(true);
        return;
      }

      setCoords(DEFAULT_MAP_CENTER);
      setSource('default');
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.city, profile?.region, profile?.country]);

  return { coords, source, ready };
}
