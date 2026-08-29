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
const DONE_PREFIX = 'lh_review_done_';

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

function readSessionFlag(prefix: string, requestId: string): boolean {
  try {
    return sessionStorage.getItem(`${prefix}${requestId}`) === '1';
  } catch {
    return false;
  }
}

function writeSessionFlag(prefix: string, requestId: string): void {
  try {
    sessionStorage.setItem(`${prefix}${requestId}`, '1');
  } catch {
    /* ignore */
  }
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
  const thankedToastRef = useRef<Set<string>>(new Set());

  const myReviewedIds = useMemo(() => {
    if (!profile?.id) return new Set<string>();
    return new Set(reviews.filter((r) => r.reviewerId === profile.id).map((r) => r.requestId));
  }, [profile?.id, reviews]);

  const visiblePending = useMemo(
    () =>
      pendingServiceReviews.filter((p) => {
        if (myReviewedIds.has(p.requestId)) return false;
        if (readSessionFlag(DONE_PREFIX, p.requestId)) return false;
        if (readSessionFlag(DISMISS_PREFIX, p.requestId)) return false;
        return true;
      }),
    [pendingServiceReviews, myReviewedIds],
  );

  const openReview = useCallback((item: PendingServiceReview) => {
    if (myReviewedIds.has(item.requestId) || readSessionFlag(DONE_PREFIX, item.requestId)) {
      return;
    }
    setViewing(null);
    setActive(item);
  }, [myReviewedIds]);

  const openReviewByRequestId = useCallback(
    (requestId: string) => {
      if (myReviewedIds.has(requestId) || readSessionFlag(DONE_PREFIX, requestId)) return;
      const item = pendingServiceReviews.find((p) => p.requestId === requestId);
      if (item) openReview(item);
    },
    [pendingServiceReviews, openReview, myReviewedIds],
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

  // Keep auto-open memory for done reviews so remount+refetch cannot reopen them this session.
  useEffect(() => {
    if (!reviewsLoaded) return;
    for (const id of myReviewedIds) {
      autoOpenedRef.current.add(id);
    }
  }, [reviewsLoaded, myReviewedIds]);

  const handleClose = useCallback(() => {
    if (active) {
      writeSessionFlag(DISMISS_PREFIX, active.requestId);
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
      const requestId = active.requestId;
      try {
        await submitServiceReview({
          requestId,
          targetUserId: active.targetUserId,
          rating,
          comment,
          criteriaScores,
          reviewerRole: profile.role === 'helper' ? 'helper' : 'client',
        });
        writeSessionFlag(DONE_PREFIX, requestId);
        writeSessionFlag(DISMISS_PREFIX, requestId);
        autoOpenedRef.current.add(requestId);
        void refreshProfile().catch((e) => {
          console.warn('[LinkHelp] refresh profile after review', e);
        });
        if (!thankedToastRef.current.has(requestId)) {
          thankedToastRef.current.add(requestId);
          showToast(t('service_review.thanks'), 'success');
        }
        setActive(null);
      } catch (error) {
        if (isAlreadyReviewedError(error)) {
          console.warn('[LinkHelp] ALREADY_REVIEWED — syncing reviews and closing modal', {
            requestId,
          });
          writeSessionFlag(DONE_PREFIX, requestId);
          writeSessionFlag(DISMISS_PREFIX, requestId);
          autoOpenedRef.current.add(requestId);
          await refreshReviews();
          setActive(null);
          showToast(t('service_review.error_already_reviewed'), 'info');
          return;
        }
        console.error('[LinkHelp] service review submit failed', {
          requestId,
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
