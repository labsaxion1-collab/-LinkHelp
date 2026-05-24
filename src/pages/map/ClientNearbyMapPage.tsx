import { useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAppData } from '@/context/AppDataContext';
import { MapCameraFocus } from '@/components/map/MapCameraFocus';
import { MarkerWithInfoWindow } from '@/components/map/MarkerWithInfoWindow';
import { AvatarMapPin } from '@/components/map/AvatarMapPin';
import { NearbyHelperListItem } from '@/components/map/NearbyHelperListItem';
import { MAP_STYLES } from '@/components/map/mapStyles';
import { useNearbyHelpers } from '@/hooks/useNearbyHelpers';
import { parseSkillKey, skillSubLabelKey } from '@/data/helperSkillsCatalog';
import { getGoogleMapsApiKey, isGoogleMapsConfigured } from '@/utils/googleMapsConfig';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';

export default function ClientNearbyMapPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { jobs } = useAppData();

  const relatedCategories = useMemo(() => {
    const open = jobs.filter((j) => j.status === 'open');
    return [...new Set(open.map((j) => j.category).filter(Boolean))];
  }, [jobs]);

  const { helpers, helpersWithMapPosition, loading, clientCenter, locationReady } = useNearbyHelpers({
    relatedCategoryIds: relatedCategories,
  });

  const initialCameraDone = useRef(false);
  const mapSectionRef = useRef<HTMLElement>(null);
  const [focusedMarkerId, setFocusedMarkerId] = useState<string | null>(null);
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

  const skillLabel = (skillId: string) => {
    const parsed = parseSkillKey(skillId);
    if (!parsed) return skillId;
    const subKey = skillSubLabelKey(parsed.primary, parsed.sub);
    const sub = t(subKey);
    if (sub !== subKey) return sub;
    return parsed.primary === 'support' ? t('skills.support') : t(`categories.${parsed.primary}`);
  };

  return (
    <div className="h-[calc(100vh-80px)] w-full relative flex flex-col sm:flex-row bg-[#0B0F19] overflow-hidden lh-app-page">
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
            <Icons.MapPin className="w-6 h-6 text-blue-600" /> {t('live_map.title_client_nearby')}
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">{t('live_map.subtitle_client_nearby')}</p>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
          {loading ? (
            <p className="text-center p-8 text-gray-500 font-medium">{t('common.loading')}</p>
          ) : helpers.length === 0 ? (
            <p className="text-center p-8 text-gray-500 font-medium">{t('live_map.empty_no_nearby_helpers')}</p>
          ) : (
            helpers.map((helper) => (
              <NearbyHelperListItem
                key={helper.id}
                helper={helper}
                t={t}
                skillLabel={skillLabel}
                highlighted={focusedMarkerId === helper.id}
                onViewOnMap={
                  helper.mapPosition
                    ? () => focusHelperOnMap(helper.id, helper.mapPosition!)
                    : undefined
                }
              />
            ))
          )}
        </div>
      </aside>

      <section
        ref={mapSectionRef}
        className="flex-1 relative h-[60vh] sm:h-full order-1 sm:order-2 min-h-[240px]"
      >
        {mapsReady ? (
          <APIProvider apiKey={mapsApiKey} version="weekly">
            <Map
              defaultCenter={clientCenter}
              defaultZoom={12}
              mapId="CLIENT_NEARBY_HELPERS_MAP"
              style={{ width: '100%', height: '100%' }}
              disableDefaultUI
              styles={MAP_STYLES}
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
                    marker={<AvatarMapPin name={helper.name} avatarUrl={helper.avatarUrl} variant="helper" />}
                  >
                    <div>
                      <p className="text-sm font-black text-gray-900">{helper.name}</p>
                      {helper.regionLabel ? (
                        <p className="text-xs text-gray-600 mt-1">{helper.regionLabel}</p>
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

        {mapsReady && helpers.length > 0 ? (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-20 whitespace-nowrap">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inset-0 rounded-full bg-green-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
            <span className="font-bold text-sm tracking-wide">{t('live_map.floating_client', { count: helpers.length })}</span>
          </div>
        ) : null}
      </section>
    </div>
  );
}
