import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { AdminDashboardSummary } from '../adminDashboardContract';
import { clearAdminDashboardCache, subscribeAdminDashboardSummary } from '../api/adminDashboardApi';

export function useAdminDashboardSummary() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const accessToken = session?.access_token ?? null;
  const [data, setData] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(userId && accessToken));
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    if (userId) clearAdminDashboardCache(userId);
    setReloadKey((value) => value + 1);
  }, [userId]);

  useEffect(() => {
    let active = true;
    if (!userId || !accessToken) {
      setData(null);
      setLoading(false);
      setError(null);
      return () => { active = false; };
    }
    setLoading(true);
    setError(null);
    const subscription = subscribeAdminDashboardSummary({ userId, accessToken, force: reloadKey > 0 });
    subscription.promise.then(
      (summary) => {
        if (!active) return;
        setData(summary);
        setLoading(false);
      },
      (reason: unknown) => {
        if (!active || (reason instanceof DOMException && reason.name === 'AbortError')) return;
        setError(reason instanceof Error ? reason.message : 'ADMIN_SUMMARY_UNAVAILABLE');
        setLoading(false);
      },
    );
    return () => {
      active = false;
      subscription.release();
    };
  }, [userId, accessToken, reloadKey]);

  return { data, loading, error, reload };
}
