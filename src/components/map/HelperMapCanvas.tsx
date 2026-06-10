import { useState } from 'react';
import { Map } from '@vis.gl/react-google-maps';
import { MapCameraFocus } from '@/components/map/MapCameraFocus';
import { MapMarkerCrashBoundary } from '@/components/map/MapMarkerCrashBoundary';
import { UserLocationMapMarker } from '@/components/map/UserLocationMapMarker';
import { MarkerWithInfoWindow } from '@/components/map/MarkerWithInfoWindow';
import { ClientJobMapPin } from '@/components/map/ClientJobMapPin';
import { JobMapOpportunityCard } from '@/components/map/JobMapOpportunityCard';
import { useMapMarkerMode, type MapMarkerMode } from '@/hooks/useMapMarkerMode';
import { sanitizeMapPosition } from '@/utils/mapMarkerIcons';
import { getCategoryMapColors } from '@/utils/categoryFeedTheme';
import type { Job } from '@/types/job';

export type HelperMapJobPoint = {
  id: string;
  data: Job;
  position: google.maps.LatLngLiteral;
  urgency: boolean;
  dist: number | null;
};

type Props = {
  center: google.maps.LatLngLiteral;
  mapMarkerPoints: HelperMapJobPoint[];
  cameraFocus: { position: google.maps.LatLngLiteral; zoom: number } | null;
  focusedMarkerId: string | null;
  onFocusMarker: (id: string | null) => void;
  applicationCountByJobId: Map<string, number>;
  onViewOpportunity: (jobId: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

export function HelperMapCanvas({
  center,
  mapMarkerPoints,
  cameraFocus,
  focusedMarkerId,
  onFocusMarker,
  applicationCountByJobId,
  onViewOpportunity,
  t,
}: Props) {
  const [forcedMode, setForcedMode] = useState<MapMarkerMode | null>(null);
  const { mode, ready } = useMapMarkerMode(forcedMode);
  const safeCenter = sanitizeMapPosition(center);

  if (!ready || !safeCenter) {
    return <div className="h-full w-full bg-slate-100 animate-pulse" aria-hidden />;
  }

  const useAdvanced = mode === 'advanced';
  const mapKey = useAdvanced ? 'advanced' : 'classic';

  const markersLayer = (
    <>
      <UserLocationMapMarker position={safeCenter} mode={mode} />
      {mapMarkerPoints.map((point) => {
        const pos = sanitizeMapPosition(point.position);
        if (!pos) return null;
        const catColors = getCategoryMapColors(point.data.category);
        const classicColor = point.urgency ? '#dc2626' : catColors.border;
        return (
          <MarkerWithInfoWindow
            key={point.id}
            position={pos}
            title={point.data.clientName}
            open={focusedMarkerId === point.id}
            highlighted={focusedMarkerId === point.id}
            mode={mode}
            classicColor={classicColor}
            onOpenChange={(open) => {
              if (open) onFocusMarker(point.id);
              else if (focusedMarkerId === point.id) onFocusMarker(null);
            }}
            marker={
              <ClientJobMapPin
                clientName={point.data.clientName}
                clientAvatar={point.data.clientAvatar}
                urgent={point.urgency}
                highlighted={focusedMarkerId === point.id}
                category={point.data.category}
              />
            }
          >
            <JobMapOpportunityCard
              job={point.data}
              distanceKm={point.dist}
              applicationsCount={applicationCountByJobId.get(point.data.id) ?? 0}
              t={t}
              onViewOpportunity={() => onViewOpportunity(point.data.id)}
            />
          </MarkerWithInfoWindow>
        );
      })}
    </>
  );

  const classicFallback = (
    <>
      <UserLocationMapMarker position={safeCenter} mode="classic" />
      {mapMarkerPoints.map((point) => {
        const pos = sanitizeMapPosition(point.position);
        if (!pos) return null;
        const catColors = getCategoryMapColors(point.data.category);
        const classicColor = point.urgency ? '#dc2626' : catColors.border;
        return (
          <MarkerWithInfoWindow
            key={point.id}
            position={pos}
            title={point.data.clientName}
            open={focusedMarkerId === point.id}
            highlighted={focusedMarkerId === point.id}
            mode="classic"
            classicColor={classicColor}
            onOpenChange={(open) => {
              if (open) onFocusMarker(point.id);
              else if (focusedMarkerId === point.id) onFocusMarker(null);
            }}
            marker={null}
          >
            <JobMapOpportunityCard
              job={point.data}
              distanceKm={point.dist}
              applicationsCount={applicationCountByJobId.get(point.data.id) ?? 0}
              t={t}
              onViewOpportunity={() => onViewOpportunity(point.data.id)}
            />
          </MarkerWithInfoWindow>
        );
      })}
    </>
  );

  return (
    <Map
      key={mapKey}
      defaultCenter={safeCenter}
      defaultZoom={13}
      mapId={useAdvanced ? 'LIVE_RADAR_MAP_ID' : undefined}
      gestureHandling="greedy"
      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      style={{ width: '100%', height: '100%' }}
      disableDefaultUI
    >
      <MapCameraFocus position={cameraFocus?.position ?? null} zoom={cameraFocus?.zoom} />
      {useAdvanced ? (
        <MapMarkerCrashBoundary
          fallback={classicFallback}
          onCrash={() => setForcedMode('classic')}
        >
          {markersLayer}
        </MapMarkerCrashBoundary>
      ) : (
        markersLayer
      )}
    </Map>
  );
}
