import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { MultiCriteriaReviewModal } from '@/components/reviews/MultiCriteriaReviewModal';
import type { ReviewCriterionKey } from '@/config/reviewCriteria';
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
    async ({
      rating,
      comment,
      criteriaScores,
    }: {
      rating: number;
      comment: string;
      criteriaScores: Record<ReviewCriterionKey, number>;
    }) => {
      if (!active || !profile) return;
      try {
        await submitServiceReview({
          requestId: active.requestId,
          targetUserId: active.targetUserId,
          rating,
          comment,
          criteriaScores,
          reviewerRole: profile.role === 'helper' ? 'helper' : 'client',
        });
        try {
          sessionStorage.removeItem(`${DISMISS_PREFIX}${active.requestId}`);
        } catch {
          /* ignore */
        }
        void refreshProfile().catch((e) => {
          console.warn('[LinkHelp] refresh profile after review', e);
        });
        showToast(t('service_review.thanks'), 'success');
        setActive(null);
      } catch (error) {
        console.error('[LinkHelp] service review submit failed', {
          requestId: active.requestId,
          targetUserId: active.targetUserId,
          reviewerRole: profile.role,
          error,
        });
        throw error;
      }
    },
    [active, profile, submitServiceReview, refreshProfile, showToast, t],
  );

  const value = useMemo(
    () => ({ pendingServiceReviews, openReview, openReviewByRequestId }),
    [pendingServiceReviews, openReview, openReviewByRequestId],
  );

  const reviewerRole = profile?.role === 'helper' ? 'helper' : 'client';

  return (
    <ServiceReviewContext.Provider value={value}>
      {children}
      {profile && (profile.role === 'client' || profile.role === 'helper') ? (
        <MultiCriteriaReviewModal
          open={Boolean(active)}
          pending={active}
          reviewerRole={reviewerRole}
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
