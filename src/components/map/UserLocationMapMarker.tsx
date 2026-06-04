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
      <div className="relative flex justify-center items-center">
        <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-ping opacity-50 z-0 motion-reduce:animate-none" />
        <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg z-10 relative" />
      </div>
    </AdvancedMarker>
  );
}
