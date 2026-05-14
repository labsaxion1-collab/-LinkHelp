import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { mockUsers } from '@/data/mockUsers';
import { useAppData } from '@/context/AppDataContext';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { translateCategory } from '@/utils/translateCategory';
import { formatJobSchedule } from '@/utils/jobDisplay';
import { ROUTES } from '@/utils/constants';
import { avatarUrlForName } from '@/utils/avatarUrl';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

// Montreal area fallback (since application is mostly matching there or fallback to generic)
const DEFAULT_CENTER = { lat: 45.5017, lng: -73.5673 };

const MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
];

function MarkerWithInfoWindow({ position, title, children }: {
  position: google.maps.LatLngLiteral;
  title: string;
  children?: React.ReactNode;
  key?: string | number;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);

  return (
    <>
      <AdvancedMarker ref={markerRef} position={position} onClick={() => setOpen(true)} title={title}>
        <div className="relative group">
          <div className="w-10 h-10 bg-white rounded-full border-2 border-blue-500 shadow-lg p-0.5 animate-bounce [animation-duration:2s]">
             {children}
          </div>
        </div>
      </AdvancedMarker>
      {open && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)} maxWidth={250}>
           <div className="p-1">
             <div className="font-bold text-gray-900 mb-1">{title}</div>
             {children}
           </div>
        </InfoWindow>
      )}
    </>
  );
}

export default function LiveMapPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHelper = location.pathname.includes('/helper');
  const { jobs, addNotification } = useAppData();
  const { t } = useLanguage();
  
  const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';
  const [center, setCenter] = useState<google.maps.LatLngLiteral>(DEFAULT_CENTER);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);

  const [activeFilter, setActiveFilter] = useState<'all'|'urgent'|'online'|'nearest'|'highest_value'|'best_rating'>('all');
  
  // Real location logic
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setCenter(loc);
          setUserLocation(loc);
        },
        (error) => {
          console.warn("Location error:", error);
        }
      );
    }
  }, []);

  // Generate mock nearby helpers or jobs around center
  const [mockPoints, setMockPoints] = useState<any[]>([]);

  useEffect(() => {
     // Generate some random points in ~5km radius from center
     if (isHelper) {
        // Generate Jobs
        const validJobs = jobs.filter(j => j.status === 'open').slice(0, 10);
        const mappedJobs = validJobs.map((j, i) => {
           const latOffset = (Math.random() - 0.5) * 0.05;
           const lngOffset = (Math.random() - 0.5) * 0.05;
           const dist = Math.sqrt(Math.pow(latOffset, 2) + Math.pow(lngOffset, 2)) * 111; // Approx km

           return {
              id: j.id,
              type: 'job',
              data: j,
              position: { lat: center.lat + latOffset, lng: center.lng + lngOffset },
              urgency: j.urgency === 'high',
              dist: Number(dist.toFixed(1))
           }
        });
        setMockPoints(mappedJobs);
     } else {
        // Generate Helpers
        const helpers = [
            { id: 1, name: 'Alex M.', skills: 'assembly', rating: 4.9, avatar: avatarUrlForName('Alex M.', 'ede9fe', '5b21b6') },
            { id: 2, name: 'Sarah K.', skills: 'beauty', rating: 5.0, avatar: avatarUrlForName('Sarah K.', 'ffedd5', '9a3412') },
            { id: 3, name: 'John D.', skills: 'cleaning', rating: 4.8, avatar: avatarUrlForName('John D.', 'e0f2fe', '0c4a6e') },
            { id: 4, name: 'Emily R.', skills: 'moving', rating: 4.7, avatar: avatarUrlForName('Emily R.', 'fce7f3', '831843') },
            { id: 5, name: 'Carlos T.', skills: 'renovation', rating: 5.0, avatar: avatarUrlForName('Carlos T.', 'ecfdf5', '065f46') },
        ];
        const mappedHelpers = helpers.map(h => {
           const latOffset = (Math.random() - 0.5) * 0.04;
           const lngOffset = (Math.random() - 0.5) * 0.04;
           const dist = Math.sqrt(Math.pow(latOffset, 2) + Math.pow(lngOffset, 2)) * 111; // Approx km
           return {
              id: `helper_${h.id}`,
              type: 'helper',
              data: h,
              position: { lat: center.lat + latOffset, lng: center.lng + lngOffset },
              dist: Number(dist.toFixed(1))
           }
        });
        setMockPoints(mappedHelpers);
     }
  }, [isHelper, center, jobs]);

  let filteredPoints = mockPoints.filter(p => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'nearest') return true; // Nearest just sorts
    if (activeFilter === 'highest_value') return true; // Just sorts
    if (activeFilter === 'best_rating') return true; // Just sorts
    if (isHelper && activeFilter === 'urgent') return p.urgency === true;
    if (!isHelper && activeFilter === 'online') return true; // all mocked as online right now
    return true;
  });

  if (activeFilter === 'nearest') {
    filteredPoints = [...filteredPoints].sort((a, b) => a.dist - b.dist);
  } else if (activeFilter === 'highest_value') {
    filteredPoints = [...filteredPoints].sort((a, b) => (b.data.value || 0) - (a.data.value || 0));
  } else if (activeFilter === 'best_rating') {
    filteredPoints = [...filteredPoints].sort((a, b) => (b.data.rating || 0) - (a.data.rating || 0));
  }

  if (!hasValidKey) {
    return (
      <div className="flex bg-gray-50 flex-col items-center justify-center min-h-[calc(100vh-80px)] p-6 z-50">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-lg">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
             <Icons.Map className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-4">{t('live_map.setup_title')}</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">{t('live_map.setup_intro')}</p>
          <div className="space-y-4 text-sm text-gray-700 bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <p><strong>1.</strong> {t('live_map.setup_step_1_prefix')}{' '}
              <a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noopener" className="text-blue-600 font-bold hover:underline">{t('live_map.setup_step_1_link')}</a>.
            </p>
            <p><strong>2.</strong> {t('live_map.setup_step_2')}</p>
            <p><strong>3.</strong> {t('live_map.setup_step_3')} <code>GOOGLE_MAPS_PLATFORM_KEY</code></p>
          </div>
          <button onClick={() => navigate(-1)} className="mt-8 w-full py-4 font-bold text-gray-600 hover:text-gray-900 bg-gray-100 rounded-xl transition-colors">{t('live_map.setup_back')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] w-full relative flex flex-col sm:flex-row bg-gray-50 overflow-hidden">
      {/* Sidebar Panel */}
      <div className="w-full sm:w-[400px] h-[30vh] sm:h-full bg-white shadow-2xl z-10 flex flex-col overflow-hidden relative">
         <div className="p-6 border-b border-gray-100">
            <button onClick={() => navigate(-1)} className="mb-4 text-gray-500 hover:text-gray-900 flex items-center gap-2 font-bold text-sm transition-colors">
               <Icons.ArrowLeft className="w-4 h-4" /> {t('live_map.back_nav')}
            </button>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
               {isHelper ? <><Icons.Crosshair className="w-6 h-6 text-blue-600" /> {t('live_map.title_helper_radar')}</> : <><Icons.MapPin className="w-6 h-6 text-green-600" /> {t('live_map.title_client_nearby')}</>}
            </h1>
            <p className="text-sm text-gray-500 mt-2 font-medium">{t('live_map.subtitle_searching')}</p>

            {/* Quick Filters */}
            <div className="flex gap-2 overflow-x-auto mt-4 pb-2 hide-scrollbar">
                <button onClick={() => setActiveFilter('all')} className={`px-4 py-2 ${activeFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} text-xs font-bold rounded-full whitespace-nowrap transition-colors`}>{t('live_map.filter_all')}</button>
                
                <button onClick={() => setActiveFilter('nearest')} className={`px-4 py-2 ${activeFilter === 'nearest' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} text-xs font-bold rounded-full whitespace-nowrap transition-colors`}>{t('live_map.filter_nearest')}</button>

                {isHelper && (
                  <>
                    <button onClick={() => setActiveFilter('urgent')} className={`px-4 py-2 ${activeFilter === 'urgent' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'} text-xs font-bold rounded-full whitespace-nowrap transition-colors`}>{t('live_map.filter_urgent')}</button>
                    <button onClick={() => setActiveFilter('highest_value')} className={`px-4 py-2 ${activeFilter === 'highest_value' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'} text-xs font-bold rounded-full whitespace-nowrap transition-colors inline-flex items-center gap-1`}><Icons.DollarSign className="w-3.5 h-3.5" /> {t('live_map.filter_highest_value')}</button>
                  </>
                )}

                {!isHelper && (
                  <>
                    <button onClick={() => setActiveFilter('online')} className={`px-4 py-2 ${activeFilter === 'online' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'} text-xs font-bold rounded-full whitespace-nowrap transition-colors inline-flex items-center gap-1`}><span className="w-1.5 h-1.5 bg-current rounded-full"></span> {t('live_map.filter_online_now')}</button>
                    <button onClick={() => setActiveFilter('best_rating')} className={`px-4 py-2 ${activeFilter === 'best_rating' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'} text-xs font-bold rounded-full whitespace-nowrap transition-colors inline-flex items-center gap-1`}><Icons.Star className="w-3.5 h-3.5" /> {t('live_map.filter_best_rating')}</button>
                  </>
                )}
            </div>
         </div>

         {/* List Feed */}
         <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {filteredPoints.length === 0 && (
               <div className="text-center p-8 text-gray-500 font-medium">{t('live_map.empty_no_results')}</div>
            )}
            {filteredPoints.map(point => (
               <div key={point.id} className={`bg-white p-4 rounded-2xl shadow-sm border ${point.urgency ? 'border-red-200 hover:border-red-300' : 'border-gray-100 hover:border-blue-200'} transition-all cursor-pointer group`}>
                   {isHelper ? (
                      <>
                        <div className="flex justify-between items-start mb-2">
                           <div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2 inline-block ${point.urgency ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                {translateCategory(point.data.category, t)}
                              </span>
                              <h4 className="font-bold text-gray-900 text-sm">{point.data.title}</h4>
                           </div>
                           <span className="font-black text-green-600">${point.data.value}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 font-medium whitespace-nowrap overflow-hidden">
                           <span className="flex items-center gap-1 shrink-0"><Icons.MapPin className="w-3.5 h-3.5" /> ~{(Math.random() * 4 + 0.5).toFixed(1)} km</span>
                           <span className="flex items-center gap-1 shrink-0"><Icons.Clock className="w-3.5 h-3.5" /> {formatJobSchedule(point.data.date, t)}</span>
                        </div>
                        <button onClick={(e) => {
                           e.stopPropagation();
                           addNotification({
                             userId: mockUsers.helper.id,
                             type: 'application',
                             title: t('live_map.notif_sent_title'),
                             message: t('live_map.notif_sent_body', { title: point.data.title }),
                             actionUrl: ROUTES.helperOpportunities,
                           });
                           navigate(ROUTES.helperOpportunities);
                        }} className="mt-4 w-full py-2 bg-gray-50 group-hover:bg-blue-600 group-hover:text-white text-gray-700 font-bold text-xs rounded-xl transition-colors">
                           {t('live_map.apply')}
                        </button>
                      </>
                   ) : (
                      <div className="flex items-start gap-4">
                         <img src={point.data.avatar} alt="Hero" className="w-12 h-12 rounded-xl object-cover border-2 border-gray-100 group-hover:border-blue-200 transition-colors shrink-0" />
                         <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-gray-900 text-sm truncate pr-2">{point.data.name}</h4>
                              <span className="flex items-center gap-1 text-xs font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded shrink-0"><Icons.Star className="w-3 h-3 fill-yellow-500" /> {point.data.rating}</span>
                            </div>
                            <span className="text-xs text-gray-500 font-medium truncate block mt-0.5">{translateCategory(point.data.skills, t)}</span>
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between mt-3 gap-2">
                               <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded font-bold border border-green-100 flex items-center gap-1 w-max"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-[pulse_2s_ease-in-out_infinite]"></span> {t('live_map.status_online')}</span>
                               <button onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(ROUTES.messages);
                               }} className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-colors w-full xl:w-auto text-center">{t('live_map.chat')}</button>
                               <button onClick={(e) => {
                                  e.stopPropagation();
                                  addNotification({
                                     userId: mockUsers.client.id,
                                     type: 'system',
                                     title: t('live_map.notif_invite_title'),
                                     message: t('live_map.notif_invite_body', { name: point.data.name }),
                                     actionUrl: ROUTES.clientDashboard,
                                  });
                               }} className="px-3 py-1.5 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-bold transition-colors w-full xl:w-auto text-center">{t('live_map.invite')}</button>
                            </div>
                         </div>
                      </div>
                   )}
               </div>
            ))}
         </div>
         {/* Fade bottom */}
         <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative h-[70vh] sm:h-full">
         <APIProvider apiKey={API_KEY} version="weekly">
            <Map
               defaultCenter={center}
               defaultZoom={13}
               mapId="LIVE_RADAR_MAP_ID"
               internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
               style={{ width: '100%', height: '100%' }}
               disableDefaultUI={true}
               options={{
                 styles: MAP_STYLES
               }}
            >
               {userLocation && (
                  <AdvancedMarker position={userLocation}>
                     <div className="relative flex justify-center items-center">
                        <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-ping opacity-50 z-0"></div>
                        <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg z-10 relative"></div>
                     </div>
                  </AdvancedMarker>
               )}

               {filteredPoints.map(point => (
                  <MarkerWithInfoWindow 
                    key={point.id} 
                    position={point.position} 
                    title={isHelper ? point.data.title : point.data.name}
                  >
                     {isHelper ? (
                        <>
                           {point.urgency ? (
                              <div className="w-full h-full rounded-full bg-red-100 flex items-center justify-center relative border border-white">
                                 <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-60"></div>
                                 <Icons.Flame className="w-5 h-5 text-red-600 relative z-10" />
                              </div>
                           ) : (
                              <div className="w-full h-full rounded-full bg-blue-50 flex items-center justify-center border border-white">
                                 <Icons.Briefcase className="w-5 h-5 text-blue-600" />
                              </div>
                           )}
                           <div className="mt-2 text-center w-40 opacity-0 transition-opacity">
                              <div className="font-bold text-gray-900 text-sm mb-1">{point.data.title}</div>
                              <div className="text-green-600 font-black">${point.data.value}</div>
                           </div>
                        </>
                     ) : (
                        <>
                           <img src={point.data.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover border border-white" />
                           <div className="mt-2 text-center w-32 opacity-0 transition-opacity">
                              <div className="font-bold text-gray-900 text-sm mb-1">{point.data.name}</div>
                              <div className="flex items-center justify-center gap-1 text-xs"><Icons.Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {point.data.rating}</div>
                           </div>
                        </>
                     )}
                  </MarkerWithInfoWindow>
               ))}
            </Map>
         </APIProvider>

         {/* Floating Alert Example */}
         <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 z-20 whitespace-nowrap">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inset-0 rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="font-bold text-sm tracking-wide">
               {isHelper ? t('live_map.floating_helper') : t('live_map.floating_client')} 
            </span>
         </div>
      </div>
    </div>
  );
}
