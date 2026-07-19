import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { AdminDashboardPayload } from '../adminDashboardContract';
import type { AdminDashboardApiErrorCode } from '../adminDashboardErrors';
import type { AdminFinancialTimeRange } from '../adminDashboardFinancialContract';
import { AdminApiError, clearAdminDashboardCache, subscribeAdminDashboardSummary } from '../api/adminDashboardApi';

export function useAdminDashboardSummary(timeRange: AdminFinancialTimeRange = 'all') {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const accessToken = session?.access_token ?? null;
  const [data, setData] = useState<AdminDashboardPayload | null>(null);
  const [loading, setLoading] = useState(Boolean(userId && accessToken));
  const [errorCode, setErrorCode] = useState<AdminDashboardApiErrorCode | null>(null);
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
      setErrorCode(null);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setErrorCode(null);
    const subscription = subscribeAdminDashboardSummary({
      userId,
      accessToken,
      force: reloadKey > 0,
      timeRange,
    });
    subscription.promise.then(
      (payload) => {
        if (!active) return;
        setData(payload);
        setLoading(false);
        setErrorCode(null);
      },
      (reason: unknown) => {
        if (!active || (reason instanceof DOMException && reason.name === 'AbortError')) return;
        setData(null);
        setLoading(false);
        if (reason instanceof AdminApiError) {
          setErrorCode(reason.code);
          return;
        }
        setErrorCode('ADMIN_SUMMARY_UNAVAILABLE');
      },
    );
    return () => {
      active = false;
      subscription.release();
    };
  }, [userId, accessToken, reloadKey, timeRange]);

  return {
    data,
    summary: data?.summary ?? null,
    financial: data?.financial ?? null,
    financialError: data?.financialError ?? null,
    loading,
    errorCode,
    reload,
  };
}
