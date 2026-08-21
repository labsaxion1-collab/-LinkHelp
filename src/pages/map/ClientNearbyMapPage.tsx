import { useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAppData } from '@/context/AppDataContext';
import { MapCameraFocus } from '@/components/map/MapCameraFocus';
import { MarkerWithInfoWindow } from '@/components/map/MarkerWithInfoWindow';
import { AvatarMapPin } from '@/components/map/AvatarMapPin';
import { NearbyHelperListItem } from '@/components/map/NearbyHelperListItem';
import { useNearbyHelpers } from '@/hooks/useNearbyHelpers';
import { parseSkillKey, skillSubLabelKey } from '@/data/helperSkillsCatalog';
import {
  attachGoogleMapsAuthFailureListener,
  classifyGoogleMapsLoaderError,
  getGoogleMapsApiKey,
  getGoogleMapsApiKeySanitizedPrefix,
  isGoogleMapsConfigured,
} from '@/utils/googleMapsConfig';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { CloseToHomeButton } from '@/components/layout/CloseToHomeButton';

export default function ClientNearbyMapPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { jobs } = useAppData();

  const relatedCategories = useMemo(() => {
    const open = jobs.filter((j) => j.status === 'open');
    return [...new Set(open.map((j) => j.category).filter(Boolean))];
  }, [jobs]);

  const {
    helpers,
    helpersWithMapPosition,
    nearbyCount,
    loading,
    clientCenter,
    locationReady,
    locationSource,
  } = useNearbyHelpers({
    relatedCategoryIds: relatedCategories,
  });

  const mapMarkerCount = helpersWithMapPosition.length;

  const initialCameraDone = useRef(false);
  const mapSectionRef = useRef<HTMLElement>(null);
  const [focusedMarkerId, setFocusedMarkerId] = useState<string | null>(null);
  const [desktopListOpen, setDesktopListOpen] = useState(true);
  const [cameraFocus, setCameraFocus] = useState<{ position: google.maps.LatLngLiteral; zoom: number } | null>(
    null,
  );
  const FOCUS_ZOOM = 15;

  useEffect(() => {
    if (!locationReady || initialCameraDone.current) return;
    initialCameraDone.current = true;
    setCameraFocus({ position: clientCenter, zoom: 12 });
  }, [locationReady, clientCenter]);

  const focusHelperOnMap = (helperId: string, position: google.maps.LatLngLiteral) => {
    setFocusedMarkerId(helperId);
    setCameraFocus({ position, zoom: FOCUS_ZOOM });
    requestAnimationFrame(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const mapsReady = isGoogleMapsConfigured();
  const mapsApiKey = getGoogleMapsApiKey();

  useEffect(() => {
    if (!mapsReady) return;
    return attachGoogleMapsAuthFailureListener();
  }, [mapsReady]);

  const skillLabel = (skillId: string) => {
    const parsed = parseSkillKey(skillId);
    if (!parsed) return skillId;
    const subKey = skillSubLabelKey(parsed.primary, parsed.sub);
    const sub = t(subKey);
    if (sub !== subKey) return sub;
    return parsed.primary === 'support' ? t('skills.support') : t(`categories.${parsed.primary}`);
  };

  const emptyMessage =
    locationSource === 'default'
      ? t('live_map.empty_no_client_location')
      : t('live_map.empty_no_nearby_helpers');

  const listContent = loading ? (
    <p className="text-center p-8 text-gray-500 font-medium">{t('common.loading')}</p>
  ) : helpers.length === 0 ? (
    <p className="text-center p-8 text-gray-500 font-medium">{emptyMessage}</p>
  ) : (
    helpers.map((helper) => (
      <NearbyHelperListItem
        key={helper.id}
        helper={helper}
        t={t}
        skillLabel={skillLabel}
        highlighted={focusedMarkerId === helper.id}
        onSelect={
          helper.mapPosition ? () => focusHelperOnMap(helper.id, helper.mapPosition!) : undefined
        }
      />
    ))
  );

  return (
    <div className="h-[calc(100dvh-80px)] w-full relative flex flex-col lg:flex-row bg-[#EAF7FF] overflow-hidden lh-app-page">
      <section
        ref={mapSectionRef}
        className="relative flex-1 min-h-0 min-w-0 h-[58vh] lg:h-full shrink-0"
      >
        {mapsReady ? (
          <APIProvider
            apiKey={mapsApiKey}
            version="weekly"
            libraries={['marker']}
            onError={(error) => {
              console.error('[Google Maps] loader error (key not logged)', {
                envVar: 'VITE_GOOGLE_MAPS_PLATFORM_KEY',
                keyPrefix: getGoogleMapsApiKeySanitizedPrefix(mapsApiKey),
                code: classifyGoogleMapsLoaderError(error),
              });
            }}
          >
            <Map
              defaultCenter={clientCenter}
              defaultZoom={12}
              mapId="CLIENT_NEARBY_HELPERS_MAP"
              gestureHandling="greedy"
              style={{ width: '100%', height: '100%' }}
              disableDefaultUI
            >
              <MapCameraFocus position={cameraFocus?.position ?? null} zoom={cameraFocus?.zoom} />
              <AdvancedMarker position={clientCenter} title={t('live_map.you_are_here')}>
                <div className="relative flex justify-center items-center">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-ping opacity-50 z-0 motion-reduce:animate-none" />
                  <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg z-10 relative" />
                </div>
              </AdvancedMarker>

              {helpersWithMapPosition.map((helper) =>
                helper.mapPosition ? (
                  <MarkerWithInfoWindow
                    key={helper.id}
                    position={helper.mapPosition}
                    title={helper.name}
                    open={focusedMarkerId === helper.id}
                    highlighted={focusedMarkerId === helper.id}
                    onOpenChange={(open) => {
                      if (!open && focusedMarkerId === helper.id) setFocusedMarkerId(null);
                    }}
                    marker={
                      <AvatarMapPin
                        name={helper.name}
                        avatarUrl={helper.avatarUrl}
                        variant="helper"
                        highlighted={focusedMarkerId === helper.id}
                      />
                    }
                  >
                    <div>
                      <p className="text-sm font-black text-gray-900">{helper.name}</p>
                      {helper.regionLabel ? (
                        <p className="text-xs text-gray-600 mt-1">{helper.regionLabel}</p>
                      ) : null}
                      {helper.distanceKm != null ? (
                        <p className="text-xs font-semibold text-blue-700 mt-1">
                          {t('live_map.distance_km', { km: helper.distanceKm })}
                        </p>
                      ) : null}
                    </div>
                  </MarkerWithInfoWindow>
                ) : null,
              )}
            </Map>
          </APIProvider>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-8 text-center">
            <Icons.Map className="w-14 h-14 text-slate-400 mb-4" />
            <p className="text-lg font-bold text-slate-800 max-w-md">{t('live_map.map_unavailable_client_title')}</p>
            <p className="text-sm text-slate-600 mt-2 max-w-md font-medium">{t('live_map.map_unavailable_client_body')}</p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3 pt-4 safe-top">
          <div className="pointer-events-auto flex items-center justify-between gap-2">
            <DesktopBackButton className="shrink-0 shadow-md" />
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="lg:hidden shrink-0 rounded-xl border border-gray-200 bg-white/95 px-3 py-2 text-xs font-bold text-gray-700 shadow-md"
            >
              <Icons.ArrowLeft className="inline h-4 w-4 -mt-0.5 mr-1" />
              {t('nav.back')}
            </button>
            {!loading && mapMarkerCount > 0 ? (
              <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-sm">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inset-0 rounded-full bg-green-400 opacity-75 motion-reduce:animate-none" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                <span className="font-bold text-sm text-[#0D1B2A] whitespace-nowrap">
                  {t('live_map.floating_client', { count: mapMarkerCount })}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-sm">
                <Icons.MapPin className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-sm text-[#0D1B2A]">{t('live_map.title_client_nearby')}</span>
              </div>
            )}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setDesktopListOpen((v) => !v)}
                className="hidden lg:flex pointer-events-auto items-center gap-1 rounded-xl border border-gray-200 bg-white/95 px-3 py-2 text-xs font-bold text-gray-700 shadow-md"
              >
                <Icons.List className="h-4 w-4" />
                {nearbyCount}
              </button>
              <CloseToHomeButton className="shadow-md bg-white/95 border border-gray-200" />
            </div>
          </div>
        </div>

        {mapsReady && !loading && helpers.length === 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-[max(5rem,env(safe-area-inset-bottom))] z-10 flex justify-center px-4 lg:bottom-8">
            <p className="rounded-xl border border-slate-200/90 bg-white/90 px-4 py-2.5 text-center text-xs font-semibold text-slate-600 shadow-md backdrop-blur-sm max-w-sm">
              {emptyMessage}
            </p>
          </div>
        ) : null}
      </section>

      <aside
        className={clsx(
          'lh-sidebar w-full lg:w-[400px] shrink-0 shadow-2xl z-10 flex flex-col overflow-hidden relative border-t lg:border-t-0 lg:border-l border-gray-100 bg-white',
          'h-[42vh] lg:h-full',
          'lg:transition-transform lg:duration-300',
          desktopListOpen ? 'lg:translate-x-0' : 'lg:translate-x-full lg:absolute lg:right-0 lg:top-0 lg:bottom-0',
        )}
      >
        <header className="p-4 lg:p-6 border-b border-gray-100 shrink-0">
          <h1 className="text-lg lg:text-2xl font-black text-gray-900 flex items-center gap-2">
            <Icons.MapPin className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" /> {t('live_map.title_client_nearby')}
          </h1>
          <p className="text-xs lg:text-sm text-gray-500 mt-1 lg:mt-2 font-medium">{t('live_map.subtitle_client_nearby')}</p>
        </header>

        <div className="flex-1 overflow-y-auto p-3 lg:p-4 pb-[max(5rem,env(safe-area-inset-bottom))] space-y-3 bg-gray-50/50">{listContent}</div>
      </aside>
    </div>
  );
}
