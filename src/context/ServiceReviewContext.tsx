import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppData } from '@/context/AppDataContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { MultiCriteriaReviewModal } from '@/components/reviews/MultiCriteriaReviewModal';
import {
  SubmittedReviewModal,
  type SubmittedReviewViewModel,
} from '@/components/reviews/SubmittedReviewModal';
import type { ReviewCriterionKey } from '@/config/reviewCriteria';
import type { PendingServiceReview } from '@/types/review';
import { ReviewSubmitError } from '@/utils/reviewSubmitErrors';
import { findHiredApplicationForJob } from '@/utils/clientActivityApplications';

const DISMISS_PREFIX = 'lh_review_skip_';

type ServiceReviewContextValue = {
  pendingServiceReviews: PendingServiceReview[];
  reviewsLoaded: boolean;
  openReview: (item: PendingServiceReview) => void;
  openReviewByRequestId: (requestId: string) => void;
  openSubmittedReviewByRequestId: (requestId: string) => void;
};

const ServiceReviewContext = createContext<ServiceReviewContextValue | null>(null);

function isAlreadyReviewedError(error: unknown): boolean {
  if (error instanceof ReviewSubmitError) return error.code === 'ALREADY_REVIEWED';
  if (error instanceof Error) {
    return error.message.toUpperCase().includes('ALREADY_REVIEWED');
  }
  return false;
}

export function ServiceReviewProvider({ children }: { children: React.ReactNode }) {
  const { profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const {
    pendingServiceReviews,
    submitServiceReview,
    reviewsLoaded,
    reviews,
    jobs,
    applications,
    upcomingJobs,
    refreshReviews,
  } = useAppData();
  const [active, setActive] = useState<PendingServiceReview | null>(null);
  const [viewing, setViewing] = useState<SubmittedReviewViewModel | null>(null);
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
    setViewing(null);
    setActive(item);
  }, []);

  const openReviewByRequestId = useCallback(
    (requestId: string) => {
      const item = pendingServiceReviews.find((p) => p.requestId === requestId);
      if (item) openReview(item);
    },
    [pendingServiceReviews, openReview],
  );

  const openSubmittedReviewByRequestId = useCallback(
    (requestId: string) => {
      if (!profile?.id) return;
      const review = reviews.find((r) => r.requestId === requestId && r.reviewerId === profile.id);
      if (!review) return;
      const job = jobs.find((j) => j.id === requestId);
      if (!job) return;

      let targetName = '';
      let targetAvatar = '';
      if (profile.role === 'helper') {
        targetName = job.clientName;
        targetAvatar = job.clientAvatar;
      } else {
        const hired = findHiredApplicationForJob(job, applications, upcomingJobs);
        targetName = hired?.helperName ?? '';
        targetAvatar = hired?.helperAvatar ?? '';
      }

      setActive(null);
      setViewing({
        review,
        targetName,
        targetAvatar,
        jobTitle: job.title,
        jobCategory: job.category,
        jobSubcategory: job.subcategory,
      });
    },
    [profile?.id, profile?.role, reviews, jobs, applications, upcomingJobs],
  );

  useEffect(() => {
    if (!reviewsLoaded || active || viewing || visiblePending.length === 0 || !profile) return;
    const next = visiblePending.find((p) => !autoOpenedRef.current.has(p.requestId));
    if (!next) return;
    autoOpenedRef.current.add(next.requestId);
    setActive(next);
  }, [reviewsLoaded, visiblePending, active, viewing, profile]);

  // Drop auto-open memory for requests that are no longer pending (already reviewed).
  useEffect(() => {
    if (!reviewsLoaded) return;
    const pendingIds = new Set(pendingServiceReviews.map((p) => p.requestId));
    for (const id of [...autoOpenedRef.current]) {
      if (!pendingIds.has(id)) autoOpenedRef.current.delete(id);
    }
  }, [reviewsLoaded, pendingServiceReviews]);

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
        if (isAlreadyReviewedError(error)) {
          console.warn('[LinkHelp] ALREADY_REVIEWED — syncing reviews and closing modal', {
            requestId: active.requestId,
          });
          try {
            sessionStorage.setItem(`${DISMISS_PREFIX}${active.requestId}`, '1');
          } catch {
            /* ignore */
          }
          await refreshReviews();
          setActive(null);
          showToast(t('service_review.error_already_reviewed'), 'info');
          return;
        }
        console.error('[LinkHelp] service review submit failed', {
          requestId: active.requestId,
          targetUserId: active.targetUserId,
          reviewerRole: profile.role,
          error,
        });
        throw error;
      }
    },
    [active, profile, submitServiceReview, refreshProfile, refreshReviews, showToast, t],
  );

  const value = useMemo(
    () => ({
      pendingServiceReviews,
      reviewsLoaded,
      openReview,
      openReviewByRequestId,
      openSubmittedReviewByRequestId,
    }),
    [
      pendingServiceReviews,
      reviewsLoaded,
      openReview,
      openReviewByRequestId,
      openSubmittedReviewByRequestId,
    ],
  );

  const reviewerRole = profile?.role === 'helper' ? 'helper' : 'client';

  return (
    <ServiceReviewContext.Provider value={value}>
      {children}
      {profile && (profile.role === 'client' || profile.role === 'helper') ? (
        <>
          <MultiCriteriaReviewModal
            open={Boolean(active)}
            pending={active}
            reviewerRole={reviewerRole}
            onClose={handleClose}
            onSubmit={handleSubmit}
            t={t}
          />
          <SubmittedReviewModal
            open={Boolean(viewing)}
            item={viewing}
            reviewerRole={reviewerRole}
            onClose={() => setViewing(null)}
            onRequestEdit={() => {
              showToast(t('service_review.edit_requires_backend'), 'info');
            }}
            t={t}
          />
        </>
      ) : null}
    </ServiceReviewContext.Provider>
  );
}

export function useServiceReview() {
  const ctx = useContext(ServiceReviewContext);
  if (!ctx) throw new Error('useServiceReview must be used within ServiceReviewProvider');
  return ctx;
}
