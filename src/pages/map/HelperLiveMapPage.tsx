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
import { formatJobScheduleDisplay } from '@/utils/jobDisplay';
import { formatJobBudgetDisplay } from '@/utils/formatJobBudget';
import { ROUTES } from '@/utils/constants';
import { getGoogleMapsApiKey, isGoogleMapsConfigured } from '@/utils/googleMapsConfig';
import { jobCoordinates } from '@/utils/geocodeLocation';
import {
  distanceToJobKm,
  filterJobsForHelperRadar,
  sortOpportunitiesForHelper,
} from '@/utils/locationMatching';
import type { Job } from '@/types/job';

import { MAP_STYLES } from '@/components/map/mapStyles';
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
  dist: number;
};

export default function HelperLiveMapPage() {
  const navigate = useNavigate();
  const { jobs, addNotification } = useAppData();
  const { t } = useLanguage();
  const me = useSessionViewer();
  const { coords: userCoords, ready: locationReady } = useUserLocation();
  const initialCameraDone = useRef(false);
  const mapSectionRef = useRef<HTMLElement>(null);
  const [focusedMarkerId, setFocusedMarkerId] = useState<string | null>(null);
  const [cameraFocus, setCameraFocus] = useState<{ position: google.maps.LatLngLiteral; zoom: number } | null>(
    null,
  );
  const FOCUS_ZOOM = 15;
  const mapsApiKey = getGoogleMapsApiKey();
  const mapsReady = isGoogleMapsConfigured();

  const center = useMemo(
    () => ({ lat: userCoords.lat, lng: userCoords.lng }),
    [userCoords.lat, userCoords.lng],
  );

  useEffect(() => {
    if (!locationReady || initialCameraDone.current) return;
    initialCameraDone.current = true;
    setCameraFocus({ position: center, zoom: 13 });
  }, [locationReady, center]);

  const focusOnMap = (point: JobMapPoint) => {
    setFocusedMarkerId(point.id);
    setCameraFocus({ position: point.position, zoom: FOCUS_ZOOM });
    requestAnimationFrame(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'nearest' | 'highest_value'>('all');

  const jobPoints = useMemo((): JobMapPoint[] => {
    const openJobs = jobs.filter((j) => j.status === 'open' && j.clientId !== me.id);
    const inRadius = filterJobsForHelperRadar(openJobs, userCoords);
    const sorted = sortOpportunitiesForHelper(inRadius, { origin: userCoords, helperSkillIds: [] });

    return sorted
      .map((job) => {
        const coords = jobCoordinates(job);
        if (!coords) return null;
        const dist = distanceToJobKm(userCoords, job) ?? 0;
        return {
          id: job.id,
          data: job,
          position: coords,
          urgency: job.urgency === 'high',
          dist: Number(dist.toFixed(1)),
        };
      })
      .filter((p): p is JobMapPoint => p != null);
  }, [jobs, userCoords, me.id]);

  const filteredPoints = useMemo(() => {
    let list = jobPoints.filter((p) => (activeFilter === 'urgent' ? p.urgency : true));
    if (activeFilter === 'nearest') {
      list = [...list].sort((a, b) => a.dist - b.dist);
    } else if (activeFilter === 'highest_value') {
      list = [...list].sort((a, b) => {
        const parseVal = (v: string) => Number.parseFloat(v.replace(/[^\d.]/g, '')) || 0;
        return parseVal(b.data.value) - parseVal(a.data.value);
      });
    }
    return list;
  }, [jobPoints, activeFilter]);

  const mapMarkerPoints = useMemo(() => filteredPoints.slice(0, 40), [filteredPoints]);

  return (
    <div className="h-[calc(100vh-80px)] w-full relative flex flex-col sm:flex-row bg-[#EAF7FF] overflow-hidden lh-app-page">
      <aside className="lh-sidebar w-full sm:w-[400px] h-[40vh] sm:h-full shadow-2xl z-10 flex flex-col overflow-hidden relative order-2 sm:order-1">
        <header className="p-6 border-b border-gray-100 shrink-0">
          <DesktopBackButton className="mb-4" />
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="lg:hidden mb-4 text-gray-500 hover:text-gray-900 flex items-center gap-2 font-bold text-sm transition-colors"
          >
            <Icons.ArrowLeft className="w-4 h-4" /> {t('nav.back')}
          </button>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Icons.Crosshair className="w-6 h-6 text-blue-600" /> {t('live_map.title_helper_radar')}
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">{t('live_map.subtitle_searching')}</p>

          <div className="flex gap-2 overflow-x-auto mt-4 pb-1 hide-scrollbar">
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
                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                  : filter === 'highest_value'
                    ? isActive
                      ? 'bg-green-600 text-white'
                      : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                    : isActive
                      ? 'bg-[#1565FF] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-2 text-xs font-bold rounded-full whitespace-nowrap transition-colors inline-flex items-center gap-1 ${cls}`}
                >
                  {filter === 'highest_value' && <Icons.DollarSign className="w-3.5 h-3.5" />}
                  {label}
                </button>
              );
            })}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
          {filteredPoints.length === 0 && (
            <div className="text-center p-8 text-gray-500 font-medium">{t('live_map.empty_no_results')}</div>
          )}
          {filteredPoints.map((point) => (
            <div
              key={point.id}
              className={clsx(
                'bg-white p-4 rounded-2xl shadow-sm border transition-all cursor-pointer group',
                focusedMarkerId === point.id
                  ? 'border-blue-400 ring-2 ring-blue-200/80 shadow-md'
                  : point.urgency
                    ? 'border-red-200 hover:border-red-300'
                    : 'border-gray-100 hover:border-blue-200',
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2 inline-block ${
                      point.urgency ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {translateCategory(point.data.category, t)}
                  </span>
                  <h4 className="font-bold text-gray-900 text-sm">{point.data.title}</h4>
                </div>
                <span className="font-black text-green-600 shrink-0">{formatJobBudgetDisplay(point.data, t)}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 font-medium whitespace-nowrap overflow-hidden">
                <span className="flex items-center gap-1 shrink-0">
                  <Icons.MapPin className="w-3.5 h-3.5" /> {t('live_map.distance_km', { km: point.dist })}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <Icons.Clock className="w-3.5 h-3.5" /> {formatJobScheduleDisplay(point.data, t)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => focusOnMap(point)}
                className="mt-3 w-full py-2 bg-blue-50 text-blue-700 font-bold text-xs rounded-xl hover:bg-blue-100 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Icons.Map className="w-3.5 h-3.5" />
                {t('live_map.view_on_map')}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  addNotification({
                    userId: me.id,
                    type: 'application',
                    title: t('live_map.notif_sent_title'),
                    message: t('live_map.notif_sent_body', { title: point.data.title }),
                    actionUrl: ROUTES.helperOpportunities,
                  });
                  navigate(ROUTES.helperOpportunities);
                }}
                className="mt-4 w-full py-2 bg-gray-50 group-hover:bg-blue-600 group-hover:text-white text-gray-700 font-bold text-xs rounded-xl transition-colors"
              >
                {t('live_map.apply')}
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section
        ref={mapSectionRef}
        className="flex-1 relative h-[60vh] sm:h-full order-1 sm:order-2 min-h-[240px]"
      >
        {mapsReady ? (
          <APIProvider apiKey={mapsApiKey} version="weekly">
            <Map
              defaultCenter={center}
              defaultZoom={13}
              mapId="LIVE_RADAR_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
              disableDefaultUI
              styles={MAP_STYLES}
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
                    if (!open && focusedMarkerId === point.id) setFocusedMarkerId(null);
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
                    t={t}
                    onViewOpportunity={() => navigate(ROUTES.helperOpportunities)}
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

        <div className="absolute top-6 left-1/2 -translate-x-1/2 border border-blue-100 bg-white/90 backdrop-blur-sm text-[#0D1B2A] px-5 py-3 rounded-2xl shadow-2xl shadow-blue-500/10 flex items-center gap-3 z-20 whitespace-nowrap">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inset-0 rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <span className="font-bold text-sm tracking-wide">{t('live_map.floating_helper')}</span>
        </div>
      </section>
    </div>
  );
}
