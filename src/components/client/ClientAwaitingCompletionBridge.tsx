import { useEffect } from 'react';
import { useAppDataCore, useAppDataNotifications } from '@/context/AppDataContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { remoteFetchClientAwaitingCompletionJobIds } from '@/services/supabase/appDataRemote';

type Props = {
  clientId: string;
  onAwaitingIds: (ids: Set<string>) => void;
};

/** Refetch awaiting-completion quando jobs/upcoming/notifications mudam — sem assinar notifications no dashboard. */
export function ClientAwaitingCompletionBridge({ clientId, onAwaitingIds }: Props) {
  const { jobs, upcomingJobs } = useAppDataCore();
  const notifications = useAppDataNotifications();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    void remoteFetchClientAwaitingCompletionJobIds(clientId).then((ids) => {
      if (!cancelled) onAwaitingIds(new Set(ids));
    });
    return () => {
      cancelled = true;
    };
  }, [clientId, jobs, upcomingJobs, notifications, onAwaitingIds]);

  return null;
}
