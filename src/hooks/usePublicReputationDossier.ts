import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { remoteFetchPublicReputationDossier } from '@/services/supabase/reputationRemote';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  buildLocalReputationDossier,
  mergeReputationDossiers,
  parseReputationDossierRpc,
  type PublicReputationDossier,
} from '@/utils/reputationDossier';
import { countCompletedForClient, countCompletedForHelper } from '@/utils/linkHelpRanking';

type Options = {
  userId: string;
  role: 'client' | 'helper';
  averageRating?: number | null;
  completedCount?: number | null;
  publishedCount?: number | null;
};

export function usePublicReputationDossier({
  userId,
  role,
  averageRating,
  completedCount,
  publishedCount,
}: Options): PublicReputationDossier {
  const { reviews, jobs, applications } = useAppData();
  const [rpcDossier, setRpcDossier] = useState<Omit<PublicReputationDossier, 'loading'> | null>(null);
  const [loading, setLoading] = useState(Boolean(isSupabaseConfigured() && userId));

  const localCompleted =
    completedCount ??
    (role === 'helper'
      ? countCompletedForHelper(userId, applications)
      : countCompletedForClient(userId, jobs));

  const localPublished =
    publishedCount ??
    (role === 'client'
      ? jobs.filter((j) => j.clientId === userId && j.status !== 'cancelled').length
      : null);

  const localDossier = useMemo(
    () =>
      buildLocalReputationDossier({
        userId,
        role,
        reviews,
        completedCount: localCompleted,
        publishedCount: localPublished,
        averageRating: averageRating ?? null,
      }),
    [userId, role, reviews, localCompleted, localPublished, averageRating],
  );

  useEffect(() => {
    if (!isSupabaseConfigured() || !userId) {
      setRpcDossier(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void remoteFetchPublicReputationDossier(userId)
      .then((payload) => {
        if (cancelled) return;
        setRpcDossier(parseReputationDossierRpc(userId, payload));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const merged = useMemo(
    () => mergeReputationDossiers(rpcDossier, localDossier),
    [rpcDossier, localDossier],
  );

  return { ...merged, loading };
}
