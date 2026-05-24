import { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

type Props = {
  position: google.maps.LatLngLiteral | null;
  zoom?: number;
};

/** Pans/zooms the parent Map when position changes (must be a child of <Map>). */
export function MapCameraFocus({ position, zoom }: Props) {
  const map = useMap();

  useEffect(() => {
    if (!map || !position) return;
    map.panTo(position);
    if (zoom != null) map.setZoom(zoom);
  }, [map, position?.lat, position?.lng, zoom]);

  return null;
}
