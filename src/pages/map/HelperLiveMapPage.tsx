import React, { useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useAppData } from '@/context/AppDataContext';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { translateCategory } from '@/utils/translateCategory';
import { ROUTES } from '@/utils/constants';
import { getGoogleMapsApiKey, isGoogleMapsConfigured } from '@/utils/googleMapsConfig';
import { jobCoordinates } from '@/utils/geocodeLocation';
import {
  distanceToJobKm,
  filterJobsForHelperRadar,
  sortOpportunitiesForHelper,
} from '@/utils/locationMatching';
import { isRemoteJob } from '@/utils/calculateHelperLeadCreditCost';
import { isJobCancelled } from '@/utils/jobVisibility';
import type { Job } from '@/types/job';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { MapCameraFocus } from '@/components/map/MapCameraFocus';
import { MarkerWithInfoWindow } from '@/components/map/MarkerWithInfoWindow';
import { ClientJobMapPin } from '@/components/map/ClientJobMapPin';
import { JobMapOpportunityCard } from '@/components/map/JobMapOpportunityCard';

type JobMapPoint = {
  id: string;
  data: Job;
  position: google.maps.LatLngLiteral;
  urgency: boolean;
  dist: number | null;
};

export default function HelperLiveMapPage() {
  const navigate = useNavigate();
  const { jobs, applications } = useAppData();
  const { t } = useLanguage();
  const me = useSessionViewer();
  const { coords: userCoords, ready: locationReady } = useUserLocation();
  const initialCameraDone = useRef(false);
  const [focusedMarkerId, setFocusedMarkerId] = useState<string | null>(null);
  const [cameraFocus, setCameraFocus] = useState<{ position: google.maps.LatLngLiteral; zoom: number } | null>(
    null,
  );
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'nearest' | 'highest_value'>('all');
  const [desktopListOpen, setDesktopListOpen] = useState(false);
  const FOCUS_ZOOM = 15;
  const mapsApiKey = getGoogleMapsApiKey();
  const mapsReady = isGoogleMapsConfigured();

  const applicationCountByJobId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const app of applications) {
      if (app.status === 'cancelled') continue;
      counts.set(app.jobId, (counts.get(app.jobId) ?? 0) + 1);
    }
    return counts;
  }, [applications]);

  const center = useMemo(
    () => ({ lat: userCoords.lat, lng: userCoords.lng }),
    [userCoords.lat, userCoords.lng],
  );

  useEffect(() => {
    if (!locationReady || initialCameraDone.current) return;
    initialCameraDone.current = true;
    setCameraFocus({ position: center, zoom: 13 });
  }, [locationReady, center]);

  const jobPoints = useMemo((): JobMapPoint[] => {
    const openJobs = jobs.filter(
      (j) => j.status === 'open' && !isJobCancelled(j) && j.clientId !== me.id,
    );
    const inRadius = filterJobsForHelperRadar(openJobs, userCoords);
    const sorted = sortOpportunitiesForHelper(inRadius, { origin: userCoords, helperSkillIds: [] });

    return sorted
      .map((job) => {
        const remote = isRemoteJob(job);
        const coords = jobCoordinates(job);
        if (!coords && !remote) return null;
        const dist = remote ? null : distanceToJobKm(userCoords, job);
        if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return null;
        return {
          id: job.id,
          data: job,
          position: coords,
          urgency: job.urgency === 'high',
          dist: dist != null ? Number(dist.toFixed(1)) : null,
        };
      })
      .filter((p): p is JobMapPoint => p != null);
  }, [jobs, userCoords, me.id]);

  const filteredPoints = useMemo(() => {
    let list = jobPoints.filter((p) => (activeFilter === 'urgent' ? p.urgency : true));
    if (activeFilter === 'nearest') {
      list = [...list].sort((a, b) => (a.dist ?? 999) - (b.dist ?? 999));
    } else if (activeFilter === 'highest_value') {
      list = [...list].sort((a, b) => {
        const parseVal = (v: string | null | undefined) =>
          Number.parseFloat(String(v ?? '').replace(/[^\d.]/g, '')) || 0;
        return parseVal(b.data.value) - parseVal(a.data.value);
      });
    }
    return list;
  }, [jobPoints, activeFilter]);

  const mapMarkerPoints = useMemo(() => filteredPoints.slice(0, 40), [filteredPoints]);
  const focusedPoint = mapMarkerPoints.find((p) => p.id === focusedMarkerId) ?? null;

  const openOpportunity = (jobId: string) => {
    navigate(ROUTES.helperOpportunities, { state: { openJobId: jobId } });
  };

  const filterChips = (
    <div className="flex gap-2 overflow-x-auto pb-0.5 hide-scrollbar">
      {(['all', 'nearest', 'urgent', 'highest_value'] as const).map((filter) => {
        const isActive = activeFilter === filter;
        const label =
          filter === 'all'
            ? t('live_map.filter_all')
            : filter === 'nearest'
              ? t('live_map.filter_nearest')
              : filter === 'urgent'
                ? t('live_map.filter_urgent')
                : t('live_map.filter_highest_value');
        const cls =
          filter === 'urgent'
            ? isActive
              ? 'bg-red-500 text-white'
              : 'bg-red-50 text-red-600 border border-red-200'
            : filter === 'highest_value'
              ? isActive
                ? 'bg-green-600 text-white'
                : 'bg-green-50 text-green-700 border border-green-200'
              : isActive
                ? 'bg-[#1565FF] text-white'
                : 'bg-white/95 text-gray-700 border border-gray-200';
        return (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-colors shadow-sm ${cls}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="h-[calc(100dvh-80px)] w-full relative flex bg-[#EAF7FF] overflow-hidden lh-app-page">
      <section className="relative flex-1 min-h-0 min-w-0">
        {mapsReady ? (
          <APIProvider apiKey={mapsApiKey} version="weekly" libraries={['marker']}>
            <Map
              defaultCenter={center}
              defaultZoom={13}
              mapId="LIVE_RADAR_MAP_ID"
              gestureHandling="greedy"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
              disableDefaultUI
            >
              <MapCameraFocus position={cameraFocus?.position ?? null} zoom={cameraFocus?.zoom} />
              <AdvancedMarker position={center}>
                <div className="relative flex justify-center items-center">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-ping opacity-50 z-0" />
                  <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg z-10 relative" />
                </div>
              </AdvancedMarker>

              {mapMarkerPoints.map((point) => (
                <MarkerWithInfoWindow
                  key={point.id}
                  position={point.position}
                  title={point.data.clientName}
                  open={focusedMarkerId === point.id}
                  highlighted={focusedMarkerId === point.id}
                  onOpenChange={(open) => {
                    if (open) setFocusedMarkerId(point.id);
                    else if (focusedMarkerId === point.id) setFocusedMarkerId(null);
                  }}
                  marker={
                    <ClientJobMapPin
                      clientName={point.data.clientName}
                      clientAvatar={point.data.clientAvatar}
                      urgent={point.urgency}
                    />
                  }
                >
                  <JobMapOpportunityCard
                    job={point.data}
                    distanceKm={point.dist}
                    applicationsCount={applicationCountByJobId.get(point.data.id) ?? 0}
                    t={t}
                    onViewOpportunity={() => openOpportunity(point.data.id)}
                  />
                </MarkerWithInfoWindow>
              ))}
            </Map>
          </APIProvider>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-8 text-center">
            <Icons.Map className="w-14 h-14 text-slate-400 mb-4" />
            <p className="text-lg font-bold text-slate-800 max-w-md">{t('live_map.map_unavailable')}</p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3 pt-4 safe-top">
          <div className="pointer-events-auto flex items-center justify-between gap-2">
            <DesktopBackButton className="shrink-0 shadow-md" />
            <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-sm">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inset-0 rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <span className="font-bold text-sm text-[#0D1B2A]">{t('live_map.title_helper_radar')}</span>
            </div>
            <button
              type="button"
              onClick={() => setDesktopListOpen((v) => !v)}
              className="hidden lg:flex pointer-events-auto items-center gap-1 rounded-xl border border-gray-200 bg-white/95 px-3 py-2 text-xs font-bold text-gray-700 shadow-md"
            >
              <Icons.List className="h-4 w-4" />
              {filteredPoints.length}
            </button>
          </div>
          <div className="pointer-events-auto max-w-full">{filterChips}</div>
        </div>

        {focusedPoint ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-blue-100 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase text-blue-600">
                    {translateCategory(focusedPoint.data.category, t)}
                  </p>
                  <p className="truncate text-sm font-black text-gray-900">{focusedPoint.data.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFocusedMarkerId(null)}
                  className="shrink-0 rounded-full bg-slate-100 p-1.5 text-slate-500"
                  aria-label={t('common.close')}
                >
                  <Icons.X className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => openOpportunity(focusedPoint.data.id)}
                className="mt-3 w-full min-h-[44px] rounded-xl bg-blue-600 text-sm font-black text-white hover:bg-blue-700"
              >
                {t('live_map.view_opportunity')}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <aside
        className={clsx(
          'hidden lg:flex flex-col w-[320px] shrink-0 border-l border-gray-100 bg-white shadow-xl z-10 transition-all duration-300',
          desktopListOpen ? 'translate-x-0' : 'translate-x-full absolute right-0 top-0 bottom-0',
        )}
      >
        <header className="p-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Icons.Crosshair className="w-5 h-5 text-blue-600" />
            {t('live_map.title_helper_radar')}
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-medium">{t('live_map.subtitle_searching')}</p>
        </header>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredPoints.length === 0 ? (
            <p className="text-center p-6 text-sm text-gray-500">{t('live_map.empty_no_results')}</p>
          ) : (
            filteredPoints.map((point) => (
              <button
                key={point.id}
                type="button"
                onClick={() => {
                  setFocusedMarkerId(point.id);
                  setCameraFocus({ position: point.position, zoom: FOCUS_ZOOM });
                }}
                className={clsx(
                  'w-full text-left rounded-xl border p-3 transition-colors',
                  focusedMarkerId === point.id
                    ? 'border-blue-400 bg-blue-50/50'
                    : 'border-gray-100 bg-white hover:border-blue-200',
                )}
              >
                <p className="text-[10px] font-bold uppercase text-blue-600">
                  {translateCategory(point.data.category, t)}
                </p>
                <p className="text-sm font-bold text-gray-900 line-clamp-1">{point.data.title}</p>
                {point.dist != null ? (
                  <p className="mt-1 text-xs text-gray-500">{t('live_map.distance_km', { km: point.dist })}</p>
                ) : null}
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
