import React, { memo, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { AdvancedMarker, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';

type Props = {
  key?: string;
  position: google.maps.LatLngLiteral;
  title: string;
  /** Pin content (avatar, icon, etc.) */
  marker: React.ReactNode;
  /** Info window body — omit for title-only */
  children?: React.ReactNode;
  /** Controlled open state (e.g. “Ver no mapa”) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Highlight pin when focused from sidebar */
  highlighted?: boolean;
};

function MarkerWithInfoWindowInner({
  position,
  title,
  marker,
  children,
  open: openControlled,
  onOpenChange,
  highlighted = false,
}: Props) {
  const [markerRef, markerInstance] = useAdvancedMarkerRef();
  const [openInternal, setOpenInternal] = useState(false);
  const isControlled = openControlled !== undefined;
  const isOpen = isControlled ? openControlled : openInternal;

  const setOpen = (next: boolean) => {
    if (!isControlled) setOpenInternal(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (openControlled === true) setOpenInternal(true);
    if (openControlled === false) setOpenInternal(false);
  }, [openControlled]);

  return (
    <>
      <AdvancedMarker ref={markerRef} position={position} onClick={() => setOpen(true)} title={title}>
        <div
          className={clsx(
            'relative flex items-center justify-center transition-transform',
            highlighted && 'scale-110',
          )}
        >
          <div
            className={clsx(
              highlighted && 'rounded-full ring-4 ring-blue-400/70 ring-offset-2 ring-offset-white',
            )}
          >
            {marker}
          </div>
        </div>
      </AdvancedMarker>
      {isOpen && (
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

export const MarkerWithInfoWindow = memo(MarkerWithInfoWindowInner);
