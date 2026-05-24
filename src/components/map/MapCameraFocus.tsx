import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

type Props = {
  position: google.maps.LatLngLiteral | null;
  zoom?: number;
};

const ZOOM_STEPS = 10;
const ZOOM_INTERVAL_MS = 35;

/** Pans/zooms the parent Map when position changes (must be a child of <Map>). */
export function MapCameraFocus({ position, zoom }: Props) {
  const map = useMap();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!map || !position) return;

    map.panTo(position);

    if (zoom == null) return;

    const targetZoom = zoom;
    const startZoom = map.getZoom() ?? targetZoom;

    if (Math.abs(targetZoom - startZoom) < 0.01) {
      map.setZoom(targetZoom);
      return;
    }

    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    let step = 0;
    const delta = (targetZoom - startZoom) / ZOOM_STEPS;

    timerRef.current = window.setInterval(() => {
      step += 1;
      if (step >= ZOOM_STEPS) {
        map.setZoom(targetZoom);
        if (timerRef.current != null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }
      map.setZoom(startZoom + delta * step);
    }, ZOOM_INTERVAL_MS);

    return () => {
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [map, position?.lat, position?.lng, zoom]);

  return null;
}
