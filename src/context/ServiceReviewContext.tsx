import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { ServiceReviewModal } from '@/components/reviews/ServiceReviewModal';
import type { PendingServiceReview } from '@/types/review';

const DISMISS_PREFIX = 'lh_review_skip_';

type ServiceReviewContextValue = {
  pendingServiceReviews: PendingServiceReview[];
  openReview: (item: PendingServiceReview) => void;
  openReviewByRequestId: (requestId: string) => void;
};

const ServiceReviewContext = createContext<ServiceReviewContextValue | null>(null);

export function ServiceReviewProvider({ children }: { children: React.ReactNode }) {
  const { profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { pendingServiceReviews, submitServiceReview } = useAppData();
  const [active, setActive] = useState<PendingServiceReview | null>(null);
  const autoOpenedRef = useRef<Set<string>>(new Set());

  const visiblePending = useMemo(
    () =>
      pendingServiceReviews.filter((p) => {
        try {
          return sessionStorage.getItem(`${DISMISS_PREFIX}${p.requestId}`) !== '1';
        } catch {
          return true;
        }
      }),
    [pendingServiceReviews],
  );

  const openReview = useCallback((item: PendingServiceReview) => {
    try {
      sessionStorage.removeItem(`${DISMISS_PREFIX}${item.requestId}`);
    } catch {
      /* ignore */
    }
    setActive(item);
  }, []);

  const openReviewByRequestId = useCallback(
    (requestId: string) => {
      const item = pendingServiceReviews.find((p) => p.requestId === requestId);
      if (item) openReview(item);
    },
    [pendingServiceReviews, openReview],
  );

  useEffect(() => {
    if (active || visiblePending.length === 0 || !profile) return;
    const next = visiblePending.find((p) => !autoOpenedRef.current.has(p.requestId));
    if (!next) return;
    autoOpenedRef.current.add(next.requestId);
    setActive(next);
  }, [visiblePending, active, profile]);

  const handleClose = useCallback(() => {
    if (active) {
      try {
        sessionStorage.setItem(`${DISMISS_PREFIX}${active.requestId}`, '1');
      } catch {
        /* ignore */
      }
    }
    setActive(null);
  }, [active]);

  const handleSubmit = useCallback(
    async ({ rating, comment }: { rating: number; comment: string }) => {
      if (!active || !profile) return;
      await submitServiceReview({
        requestId: active.requestId,
        targetUserId: active.targetUserId,
        rating,
        comment,
      });
      try {
        sessionStorage.removeItem(`${DISMISS_PREFIX}${active.requestId}`);
      } catch {
        /* ignore */
      }
      await refreshProfile();
      showToast(t('service_review.thanks'), 'success');
      setActive(null);
    },
    [active, profile, submitServiceReview, refreshProfile, showToast, t],
  );

  const value = useMemo(
    () => ({ pendingServiceReviews, openReview, openReviewByRequestId }),
    [pendingServiceReviews, openReview, openReviewByRequestId],
  );

  return (
    <ServiceReviewContext.Provider value={value}>
      {children}
      {profile ? (
        <ServiceReviewModal
          open={Boolean(active)}
          pending={active}
          reviewerRole={profile.role}
          onClose={handleClose}
          onSubmit={handleSubmit}
          t={t}
        />
      ) : null}
    </ServiceReviewContext.Provider>
  );
}

export function useServiceReview() {
  const ctx = useContext(ServiceReviewContext);
  if (!ctx) throw new Error('useServiceReview must be used within ServiceReviewProvider');
  return ctx;
}
