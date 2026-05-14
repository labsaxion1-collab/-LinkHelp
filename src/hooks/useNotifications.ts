import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSupabase } from '@/lib/supabase';
import type { NotificationRow } from '@/types/database';
import { withRetry } from '@/utils/asyncRetry';

export function useNotifications() {
  const { session, isConfigured, user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const uid = user?.id;
    if (!isConfigured || !session || !uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await withRetry(async () => {
        const { data, error: qErr } = await sb
          .from('notifications')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false });
        if (qErr) throw new Error(qErr.message);
        return (data ?? []) as NotificationRow[];
      });
      setNotifications(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [isConfigured, session, user?.id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { notifications, loading, error, refetch, setNotifications };
}
