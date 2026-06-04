import { AdvancedMarker, Marker } from '@vis.gl/react-google-maps';
import { circleMarkerIcon } from '@/utils/mapMarkerIcons';
import type { MapMarkerMode } from '@/hooks/useMapMarkerMode';

type Props = {
  position: google.maps.LatLngLiteral;
  mode: MapMarkerMode;
};

export function UserLocationMapMarker({ position, mode }: Props) {
  if (mode === 'classic') {
    return (
      <Marker
        position={position}
        icon={circleMarkerIcon('#2563eb', 22)}
        zIndex={1000}
        title="You are here"
      />
    );
  }

  return (
    <AdvancedMarker position={position} zIndex={1000}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: 22, height: 22, transform: 'none' }}
      >
        <div
          className="absolute rounded-full border-4 border-blue-500 animate-ping opacity-50 motion-reduce:animate-none"
          style={{ width: 22, height: 22 }}
        />
        <div
          className="relative z-10 rounded-full border-2 border-white bg-blue-600 shadow-lg"
          style={{ width: 20, height: 20 }}
        />
      </div>
    </AdvancedMarker>
  );
}
