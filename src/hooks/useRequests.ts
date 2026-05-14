import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSupabase } from '@/lib/supabase';
import type { RequestRow } from '@/types/database';
import { withRetry } from '@/utils/asyncRetry';

export function useRequests() {
  const { session, isConfigured } = useAuth();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!isConfigured || !session) {
      setRequests([]);
      setLoading(false);
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await withRetry(async () => {
        const { data, error: qErr } = await sb.from('requests').select('*').order('created_at', { ascending: false });
        if (qErr) throw new Error(qErr.message);
        return (data ?? []) as RequestRow[];
      });
      setRequests(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [isConfigured, session]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { requests, loading, error, refetch };
}
