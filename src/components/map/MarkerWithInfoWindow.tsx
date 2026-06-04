import React, { memo, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import {
  AdvancedMarker,
  InfoWindow,
  Marker,
  useAdvancedMarkerRef,
  useMarkerRef,
} from '@vis.gl/react-google-maps';
import type { MapMarkerMode } from '@/hooks/useMapMarkerMode';
import { circleMarkerIcon, sanitizeMapPosition } from '@/utils/mapMarkerIcons';
import { MapMarkerCrashBoundary } from '@/components/map/MapMarkerCrashBoundary';

type Props = {
  key?: string;
  position: google.maps.LatLngLiteral;
  title: string;
  /** Pin content (avatar, icon, etc.) — advanced mode only */
  marker?: React.ReactNode;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  highlighted?: boolean;
  mode?: MapMarkerMode;
  /** Classic marker dot color when `mode` is classic */
  classicColor?: string;
};

function MarkerWithInfoWindowInner({
  position,
  title,
  marker,
  children,
  open: openControlled,
  onOpenChange,
  highlighted = false,
  mode = 'advanced',
  classicColor = '#2563eb',
}: Props) {
  const safePosition = sanitizeMapPosition(position);
  if (!safePosition) return null;

  return (
    <MapMarkerCrashBoundary fallback={null}>
      <MarkerWithInfoWindowBody
        position={safePosition}
        title={title}
        marker={marker}
        open={openControlled}
        onOpenChange={onOpenChange}
        highlighted={highlighted}
        mode={mode}
        classicColor={classicColor}
      >
        {children}
      </MarkerWithInfoWindowBody>
    </MapMarkerCrashBoundary>
  );
}

function MarkerWithInfoWindowBody({
  position,
  title,
  marker,
  children,
  open: openControlled,
  onOpenChange,
  highlighted,
  mode,
  classicColor,
}: Props & { position: google.maps.LatLngLiteral }) {
  const [advancedRef, advancedInstance] = useAdvancedMarkerRef();
  const [classicRef, classicInstance] = useMarkerRef();
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

  const anchor = mode === 'advanced' ? advancedInstance : classicInstance;

  if (mode === 'classic') {
    return (
      <>
        <Marker
          ref={classicRef}
          position={position}
          title={title}
          icon={circleMarkerIcon(highlighted ? '#1d4ed8' : classicColor, highlighted ? 32 : 28)}
          zIndex={highlighted ? 200 : 100}
          onClick={() => setOpen(true)}
        />
        {isOpen && anchor ? (
          <InfoWindow anchor={anchor} onCloseClick={() => setOpen(false)} maxWidth={300}>
            <div className="p-1">
              {children ? children : <div className="font-bold text-gray-900 text-sm">{title}</div>}
            </div>
          </InfoWindow>
        ) : null}
      </>
    );
  }

  return (
    <>
      <AdvancedMarker ref={advancedRef} position={position} onClick={() => setOpen(true)} title={title}>
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
      {isOpen && anchor ? (
        <InfoWindow anchor={anchor} onCloseClick={() => setOpen(false)} maxWidth={300}>
          <div className="p-1">
            {children ? children : <div className="font-bold text-gray-900 text-sm">{title}</div>}
          </div>
        </InfoWindow>
      ) : null}
    </>
  );
}

export const MarkerWithInfoWindow = memo(MarkerWithInfoWindowInner);
