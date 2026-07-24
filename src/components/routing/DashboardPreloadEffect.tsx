import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { preloadDashboardForRole } from '@/routes/dashboardPreload';
import { normalizeProfileRole } from '@/utils/userRole';
import { appPerfMark } from '@/utils/appPerf';

/** After real profile role is known, warm the matching dashboard chunk in the background. */
export function DashboardPreloadEffect() {
  const { profile, session } = useAuth();
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (userId !== lastUserId.current) {
      lastUserId.current = userId;
    }
    if (!profile?.id || !userId || profile.id !== userId) return;
    const role = normalizeProfileRole(profile.role);
    appPerfMark('dashboard-preload', role);
    void preloadDashboardForRole(role);
  }, [profile?.id, profile?.role, session?.user?.id]);

  return null;
}
