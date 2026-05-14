import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSupabase } from '@/lib/supabase';
import type { ApplicationRow } from '@/types/database';
import { withRetry } from '@/utils/asyncRetry';

export function useApplications() {
  const { session, isConfigured } = useAuth();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!isConfigured || !session) {
      setApplications([]);
      setLoading(false);
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await withRetry(async () => {
        const { data, error: qErr } = await sb.from('applications').select('*').order('created_at', { ascending: false });
        if (qErr) throw new Error(qErr.message);
        return (data ?? []) as ApplicationRow[];
      });
      setApplications(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [isConfigured, session]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { applications, loading, error, refetch };
}
