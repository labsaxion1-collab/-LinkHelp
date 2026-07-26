import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useHomeDashboardShell } from '@/components/home/HomeDashboardShellContext';
import { preloadSecondaryRoutesForRole } from '@/routes/secondaryRoutePreload';
import { normalizeProfileRole } from '@/utils/userRole';
import { scheduleIdle } from '@/utils/scheduleIdle';
import { appPerfMark } from '@/utils/appPerf';

/**
 * After Home is interactive, warm messages / map / credits / services chunks
 * for the current role only (never both client + helper).
 */
export function SecondaryRoutePreloadEffect() {
  const { profile, sessionConfirmed } = useAuth();
  const { surfaceReady } = useHomeDashboardShell();
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionConfirmed || !surfaceReady || !profile?.id) return;
    const role = normalizeProfileRole(profile.role);
    const key = `${profile.id}:${role}`;
    if (startedFor.current === key) return;

    return scheduleIdle(() => {
      if (startedFor.current === key) return;
      startedFor.current = key;
      appPerfMark('secondary-route-preload', role);
      void preloadSecondaryRoutesForRole(role);
    }, 1800);
  }, [sessionConfirmed, surfaceReady, profile?.id, profile?.role]);

  return null;
}
