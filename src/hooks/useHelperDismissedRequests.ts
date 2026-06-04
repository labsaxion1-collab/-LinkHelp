import { useCallback, useEffect, useState } from 'react';
import {
  fetchHelperNotInterestedRequestIds,
  persistLocalDismissedRequest,
} from '@/services/supabase/helperDismissedRemote';
import { recordNotInterestedSignal } from '@/services/marketSignals';
import type { Job } from '@/types/job';

type DismissMeta = {
  category?: string | null;
  city?: string | null;
  province?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  distanceKm?: number | null;
  source?: 'swipe' | 'modal' | 'details' | 'feed';
};

export function useHelperDismissedRequests(helperId: string | undefined) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!helperId) {
      setDismissedIds(new Set());
      setLoaded(true);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    void fetchHelperNotInterestedRequestIds(helperId).then((ids) => {
      if (cancelled) return;
      setDismissedIds(new Set(ids));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [helperId]);

  const dismissRequest = useCallback(
    (requestId: string, meta?: DismissMeta, options?: { updateState?: boolean }) => {
      if (!helperId || !requestId) return;
      persistLocalDismissedRequest(helperId, requestId);
      recordNotInterestedSignal({
        requestId,
        helperId,
        category: meta?.category ?? null,
        city: meta?.city ?? null,
        province: meta?.province ?? null,
        budgetMin: meta?.budgetMin ?? null,
        budgetMax: meta?.budgetMax ?? null,
        distanceKm: meta?.distanceKm ?? null,
        source: meta?.source ?? 'feed',
      });
      if (options?.updateState !== false) {
        setDismissedIds((prev) => {
          if (prev.has(requestId)) return prev;
          const next = new Set(prev);
          next.add(requestId);
          return next;
        });
      }
    },
    [helperId],
  );

  const dismissJob = useCallback(
    (
      job: Job,
      meta?: Omit<DismissMeta, 'category' | 'city' | 'province' | 'budgetMin' | 'budgetMax'>,
      options?: { updateState?: boolean },
    ) => {
      dismissRequest(
        job.id,
        {
          category: job.category,
          city: job.city ?? null,
          province: job.region ?? null,
          budgetMin: job.budgetMin ?? null,
          budgetMax: job.budgetMax ?? null,
          distanceKm: meta?.distanceKm ?? null,
          source: meta?.source ?? 'feed',
        },
        options,
      );
    },
    [dismissRequest],
  );

  const markDismissedInState = useCallback((requestId: string) => {
    setDismissedIds((prev) => {
      if (prev.has(requestId)) return prev;
      const next = new Set(prev);
      next.add(requestId);
      return next;
    });
  }, []);

  return { dismissedIds, dismissRequest, dismissJob, markDismissedInState, loaded };
}
