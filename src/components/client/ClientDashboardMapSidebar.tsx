import { useAppDataNotifications } from '@/context/AppDataContext';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import type { NearbyHelperMapPoint } from '@/types/nearbyHelper';
import { ClientMapWidget } from '@/components/client/ClientMapWidget';
import { ClientNearbyHelpersList } from '@/components/client/ClientNearbyHelpersList';

type Props = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  clientId: string;
  jobs: Job[];
  applications: Application[];
  nearbyHelpers: NearbyHelperMapPoint[];
  nearbyHelpersLoading: boolean;
  onViewProfile: (helper: NearbyHelperMapPoint) => void;
};

import { useDevRenderCount } from '@/utils/devRenderCount';

/** Sidebar do mapa — notifications isoladas para não re-renderizar o feed/Hero. */
export function ClientDashboardMapSidebar({
  t,
  clientId,
  jobs,
  applications,
  nearbyHelpers,
  nearbyHelpersLoading,
  onViewProfile,
}: Props) {
  useDevRenderCount('ClientDashboardMapSidebar');
  const notifications = useAppDataNotifications();

  return (
    <div className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-120px)] space-y-4">
      <ClientMapWidget
        t={t}
        clientId={clientId}
        jobs={jobs}
        applications={applications}
        notifications={notifications}
        nearbyHelpers={nearbyHelpers}
        nearbyHelpersLoading={nearbyHelpersLoading}
      />
      <ClientNearbyHelpersList
        helpers={nearbyHelpers}
        loading={nearbyHelpersLoading}
        t={t}
        onViewProfile={onViewProfile}
      />
    </div>
  );
}
