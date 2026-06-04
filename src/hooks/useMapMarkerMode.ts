import { useEffect, useState } from 'react';
import { useApiIsLoaded, useMapsLibrary } from '@vis.gl/react-google-maps';
import { isAdvancedMarkerElementAvailable } from '@/utils/mapMarkerIcons';

export type MapMarkerMode = 'advanced' | 'classic';

/**
 * Prefer AdvancedMarker when the marker library loaded and AdvancedMarkerElement exists.
 * Pass `forcedMode` after a crash to pin classic markers only.
 */
export function useMapMarkerMode(forcedMode?: MapMarkerMode | null): {
  mode: MapMarkerMode;
  ready: boolean;
} {
  const apiLoaded = useApiIsLoaded();
  const markerLibrary = useMapsLibrary('marker');
  const [detected, setDetected] = useState<MapMarkerMode>('classic');

  useEffect(() => {
    if (!apiLoaded || !markerLibrary) return;
    setDetected(isAdvancedMarkerElementAvailable() ? 'advanced' : 'classic');
  }, [apiLoaded, markerLibrary]);

  const ready = apiLoaded && Boolean(markerLibrary);
  const mode = forcedMode ?? detected;

  return { mode, ready };
}
