import React, { useState } from 'react';
import { AdvancedMarker, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';

type Props = {
  key?: string;
  position: google.maps.LatLngLiteral;
  title: string;
  children?: React.ReactNode;
};

export function MarkerWithInfoWindow({ position, title, children }: Props) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);

  return (
    <>
      <AdvancedMarker ref={markerRef} position={position} onClick={() => setOpen(true)} title={title}>
        <div className="relative group">
          <div className="w-10 h-10 bg-white rounded-full border-2 border-blue-500 shadow-lg p-0.5 animate-bounce [animation-duration:2s] motion-reduce:animate-none flex items-center justify-center overflow-hidden">
            {children}
          </div>
        </div>
      </AdvancedMarker>
      {open && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)} maxWidth={280}>
          <div className="p-1">
            <div className="font-bold text-gray-900 mb-1">{title}</div>
            {children}
          </div>
        </InfoWindow>
      )}
    </>
  );
}
