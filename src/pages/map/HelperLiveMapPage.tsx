import { useAppMode } from '@/context/AppModeContext';
import ClientNearbyMapPage from '@/pages/map/ClientNearbyMapPage';
import HelperLiveMapPage from '@/pages/map/HelperLiveMapPage';

export default function HelperLiveMapPage() {
  const { isHelperMode } = useAppMode();
  return isHelperMode ? <HelperLiveMapPage /> : <ClientNearbyMapPage />;
}
