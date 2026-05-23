import React, { useState } from 'react';
import { AdvancedMarker, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';

type Props = {
  key?: string;
  position: google.maps.LatLngLiteral;
  title: string;
  /** Pin content (avatar, icon, etc.) */
  marker: React.ReactNode;
  /** Info window body — omit for title-only */
  children?: React.ReactNode;
};

export function MarkerWithInfoWindow({ position, title, marker, children }: Props) {
  const [markerRef, markerInstance] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);

  return (
    <>
      <AdvancedMarker ref={markerRef} position={position} onClick={() => setOpen(true)} title={title}>
        <div className="relative flex items-center justify-center">
          {marker}
        </div>
      </AdvancedMarker>
      {open && (
        <InfoWindow anchor={markerInstance} onCloseClick={() => setOpen(false)} maxWidth={300}>
          <div className="p-1">
            {children ? (
              children
            ) : (
              <div className="font-bold text-gray-900 text-sm">{title}</div>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}
