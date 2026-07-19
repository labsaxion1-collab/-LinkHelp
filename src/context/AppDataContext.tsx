import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { avatarUrlForName } from '@/utils/avatarUrl';
import { clearDemoLocalData } from '@/utils/clearDemoLocalData';
import { enrichUpcomingJobsWithSubcategories, estimateScheduledAtFromJob } from '@/utils/upcomingJobUtils';
import { ROUTES } from '@/utils/constants';
import type { Job, JobStatus, JobUrgency } from '@/types/job';
import type { Application, ApplicationStatus } from '@/types/application';
import type { UpcomingJob, UpcomingWorkflowStatus } from '@/types/upcoming';
import type { AppNotification, NotificationType } from '@/types/notification';
import type { ApplicationRow, MapperProfile, RequestRow, ReviewRow, UpcomingJobRow } from '@/types/database';
import {
  emptyMapperProfile,
  fetchRemoteAppDataBootstrap,
  fetchRemoteNotifications,
  mergeProfilesIntoCache,
  remoteCreateRequest,
  remoteInsertNotification,
  remoteMarkAllNotificationsRead,
  remoteClearAllNotifications,
  remoteMarkNotificationRead,
  remoteUpdateRequestStatus,
  remoteCancelClientRequest,
  remotePauseClientRequest,
  remoteResumeClientRequest,
  remoteOfficiallyHireHelper,
  remoteUpdateApplicationStatus,
  remoteUpdateUpcomingWorkflow,
  remoteMarkServiceAwaitingConfirmation,
  remoteConfirmServiceCompleted,
  remoteFinalizeServiceCompletion,
  subscribeAppDataChanges,
  subscribeNotificationsChannel,
  type NotificationRow,
} from '@/services/supabase/appDataRemote';
import {
  resolveApplicationRowForPatch,
  resolveRequestRowForPatch,
  resolveReviewRowForPatch,
  resolveUpcomingJobRowForPatch,
} from '@/services/supabase/appDataRealtimePatch';
import { applicationRowToApp, notificationRowToApp, requestRowToJob, upcomingRowToUpcoming } from '@/services/supabase/mappers';
import { submitHelperApplication } from '@/services/supabase/helperApplicationService';
import { fetchRemoteReviews, remoteSubmitReview, reviewRowToServiceReview } from '@/services/supabase/reviewsRemote';
import { buildPendingServiceReviews } from '@/utils/serviceReviewQueue';
import { isAwaitingClientCompletion } from '@/utils/serviceWorkflow';
import type { PendingServiceReview, ServiceReview } from '@/types/review';
import { dispatchPushEvent } from '@/services/push/pushEventDispatcher';
import { useCredits } from '@/context/CreditContext';
import { getApplicationChargeLc } from '@/config/helperCreditCharge';
import { getExclusiveApplicationChargeLc } from '@/utils/helperCreditDisplay';
import {
  fetchHelperBaseDistanceKm,
  leadCostsForJob,
} from '@/services/helperLeadCredits';
import { isJobCancelled } from '@/utils/jobVisibility';
import { markNotificationsCleared } from '@/utils/notificationVisibility';
import { buildNotificationPayload } from '@/utils/notificationText';
import {
  MAX_JOB_INTERESTED,
  countActiveApplicationsForJob,
  isRequestExclusiveLockedForViewer,
} from '@/utils/applicationInterest';
import {
  resolveReviewTargetUserType,
  triggerGamificationRecalculate,
} from '@/gamification/services/triggerGamificationRecalculate';

function notificationMessagesUrl(conversationId: string): string {
  return `${ROUTES.messages}?c=${encodeURIComponent(conversationId)}`;
}

function notificationClientRequestUrl(requestId: string): string {
  return `${ROUTES.clientDashboard}?request=${encodeURIComponent(requestId)}`;
}

function notificationClientJobsUrl(requestId: string): string {
  return `${ROUTES.clientJobs}?request=${encodeURIComponent(requestId)}`;
}

function notificationHelperJobsUrl(
  requestId: string,
  tab: 'accepted' | 'applications' = 'accepted',
): string {
  const params = new URLSearchParams({ request: requestId, tab });
  return `${ROUTES.helperJobs}?${params.toString()}`;
}

export type { Job, JobStatus, JobUrgency, Application, ApplicationStatus, UpcomingJob, UpcomingWorkflowStatus };
export type { AppNotification, NotificationType };

export type OfficialHirePayload = {
  requestId: string;
  applicationId: string;
  helperId: string;
  proposedAmount?: number | null;
  slotIndex?: number;
};

interface AppDataContextData {
  jobs: Job[];
  applications: Application[];
  upcomingJobs: UpcomingJob[];
  notifications: AppNotification[];
  dataLoading: boolean;
  createJob: (job: Omit<Job, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  applyForJob: (
    jobId: string,
    helperId: string,
    proposedAmount?: number | null,
    options?: { distanceKm?: number | null; message?: string | null; isExclusive?: boolean },
  ) => Promise<void>;
  updateJobStatus: (jobId: string, status: JobStatus) => Promise<{ expiredWhilePaused?: boolean } | void>;
  updateApplicationStatus: (applicationId: string, status: ApplicationStatus) => Promise<void>;
  officiallyHireHelper: (payload: OfficialHirePayload, initialMessage?: string) => Promise<string | null>;
  getHelperApplications: (helperId: string) => Application[];
  getJobApplications: (jobId: string) => Application[];
  getUpcomingJobsForHelper: (helperId: string) => UpcomingJob[];
  updateUpcomingWorkflow: (upcomingId: string, workflowStatus: UpcomingWorkflowStatus) => void;
  confirmServiceCompleted: (requestId: string) => Promise<void>;
  finalizeServiceCompletion: (input: {
    requestId: string;
    upcomingJobId: string;
    role: 'client' | 'helper';
  }) => Promise<void>;
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAllNotifications: (userId: string) => Promise<void>;
  reviews: ServiceReview[];
  pendingServiceReviews: PendingServiceReview[];
  submitServiceReview: (input: {
    requestId: string;
    targetUserId: string;
    rating: number;
    comment?: string | null;
    criteriaScores?: Record<string, number> | null;
    reviewerRole?: 'client' | 'helper';
  }) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextData>({} as AppDataContextData);

function upsertJob(list: Job[], job: Job): Job[] {
  const next = list.filter((j) => j.id !== job.id);
  next.unshift(job);
  return next.sort((a, b) => b.createdAt - a.createdAt);
}

function upsertApplication(list: Application[], app: Application): Application[] {
  const next = list.filter((a) => a.id !== app.id);
  next.unshift(app);
  return next.sort((a, b) => b.createdAt - a.createdAt);
}

function upsertUpcoming(list: UpcomingJob[], row: UpcomingJob): UpcomingJob[] {
  const next = list.filter((u) => u.id !== row.id);
  next.push(row);
  return next.sort((a, b) => a.scheduledAt - b.scheduledAt);
}

function upsertReview(list: ServiceReview[], review: ServiceReview): ServiceReview[] {
  const next = list.filter((r) => r.id !== review.id);
  next.unshift(review);
  return next.sort((a, b) => b.createdAt - a.createdAt);
}

function migrateJobAvatars(jobs: Job[]): Job[] {
  return jobs.map((j) => ({
    ...j,
    clientAvatar:
      j.clientAvatar?.includes('pravatar.cc') || j.clientAvatar?.includes('i.pravatar')
        ? avatarUrlForName(j.clientName, 'f1f5f9', '334155')
        : j.clientAvatar,
  }));
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { session, profile, refreshProfile } = useAuth();
  const { chargeApplicationInterest, chargeApplicationSelected } = useCredits();
  const useRemote = isSupabaseConfigured() && !!session;
  const userId = session?.user?.id ?? '';
  const userRole = profile?.role ?? 'client';

  const [dataLoading, setDataLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<UpcomingJob[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [reviews, setReviews] = useState<ServiceReview[]>([]);

  const filterUpcomingByRequestStatus = useCallback((rows: UpcomingJob[], jobRows: Job[]) => {
    const jobStatusById = new Map(jobRows.map((j) => [j.id, j.status]));
    return rows.filter((u) => {
      if (u.workflowStatus === 'cancelled' || u.workflowStatus === 'completed') return false;
      const jobStatus = jobStatusById.get(u.jobId);
      return !jobStatus || !isJobCancelled({ status: jobStatus });
    });
  }, []);

  const jobsRef = useRef(jobs);
  const applicationsRef = useRef(applications);
  const upcomingJobsRef = useRef(upcomingJobs);
  const profilesCacheRef = useRef<Map<string, MapperProfile>>(new Map());
  const chatUnlockedKeysRef = useRef<Set<string>>(new Set());
  const bootstrapLockRef = useRef(false);
  const pendingRealtimePatchesRef = useRef<Array<() => void>>([]);
  const reviewsRef = useRef(reviews);
  jobsRef.current = jobs;
  applicationsRef.current = applications;
  upcomingJobsRef.current = upcomingJobs;
  reviewsRef.current = reviews;

  useEffect(() => {
    clearDemoLocalData();
  }, []);

  useEffect(() => {
    if (useRemote && userId) return;
    setJobs([]);
    setApplications([]);
    setUpcomingJobs([]);
    setNotifications([]);
    setReviews([]);
    profilesCacheRef.current = new Map();
    chatUnlockedKeysRef.current = new Set();
    pendingRealtimePatchesRef.current = [];
    bootstrapLockRef.current = false;
  }, [useRemote, userId]);

  const runOrQueueRealtimePatch = useCallback((patch: () => void) => {
    if (bootstrapLockRef.current) {
      pendingRealtimePatchesRef.current.push(patch);
      return;
    }
    patch();
  }, []);

  const refreshRemoteBootstrap = useCallback(async () => {
    if (!useRemote || !userId) return;
    const loadUserId = userId;
    bootstrapLockRef.current = true;
    setDataLoading(true);
    try {
      const bootstrap = await fetchRemoteAppDataBootstrap();
      if (loadUserId !== userId) return;
      profilesCacheRef.current = bootstrap.profilesMap;
      chatUnlockedKeysRef.current = bootstrap.chatUnlockedKeys;
      const migratedJobs = migrateJobAvatars(bootstrap.jobs);
      setJobs(migratedJobs);
      setApplications(bootstrap.applications);
      setUpcomingJobs(filterUpcomingByRequestStatus(bootstrap.upcomingJobs, migratedJobs));
    } finally {
      if (loadUserId === userId) {
        bootstrapLockRef.current = false;
        const pending = pendingRealtimePatchesRef.current.splice(0);
        pending.forEach((fn) => fn());
      } else {
        bootstrapLockRef.current = false;
        pendingRealtimePatchesRef.current = [];
      }
      setDataLoading(false);
    }
  }, [useRemote, userId, filterUpcomingByRequestStatus]);

  const refreshRemoteFull = useCallback(async () => {
    if (!useRemote || !userId) return;
    const loadUserId = userId;
    bootstrapLockRef.current = true;
    setDataLoading(true);
    try {
      const [bootstrap, notifs, reviewRows] = await Promise.all([
        fetchRemoteAppDataBootstrap(),
        fetchRemoteNotifications(userId),
        fetchRemoteReviews(),
      ]);
      if (loadUserId !== userId) return;
      profilesCacheRef.current = bootstrap.profilesMap;
      chatUnlockedKeysRef.current = bootstrap.chatUnlockedKeys;
      const migratedJobs = migrateJobAvatars(bootstrap.jobs);
      setJobs(migratedJobs);
      setApplications(bootstrap.applications);
      setUpcomingJobs(filterUpcomingByRequestStatus(bootstrap.upcomingJobs, migratedJobs));
      setNotifications(notifs);
      setReviews(reviewRows);
    } finally {
      if (loadUserId === userId) {
        bootstrapLockRef.current = false;
        const pending = pendingRealtimePatchesRef.current.splice(0);
        pending.forEach((fn) => fn());
      } else {
        bootstrapLockRef.current = false;
        pendingRealtimePatchesRef.current = [];
      }
      setDataLoading(false);
    }
  }, [useRemote, userId, filterUpcomingByRequestStatus]);

  const patchRequestRow = useCallback(
    async (partial: Partial<RequestRow>) => {
      const existing = partial.id ? jobsRef.current.find((j) => j.id === partial.id) : undefined;
      const row = await resolveRequestRowForPatch(partial, existing);
      if (!row) return;
      await mergeProfilesIntoCache([row.client_id], profilesCacheRef.current);
      const job = requestRowToJob(row, profilesCacheRef.current.get(row.client_id) ?? emptyMapperProfile());
      const mergedJob = existing
        ? {
            ...existing,
            ...migrateJobAvatars([job])[0]!,
            clientName:
              job.clientName !== 'Client' || existing.clientName === 'Client'
                ? job.clientName
                : existing.clientName,
            clientAvatar: job.clientAvatar || existing.clientAvatar,
          }
        : migrateJobAvatars([job])[0]!;
      setJobs((prev) => {
        const next = upsertJob(prev, mergedJob);
        if (isJobCancelled({ status: mergedJob.status })) {
          setUpcomingJobs((up) => filterUpcomingByRequestStatus(up, next));
        }
        return next;
      });
    },
    [filterUpcomingByRequestStatus],
  );

  const patchApplicationRow = useCallback(async (partial: Partial<ApplicationRow>) => {
    const existing = partial.id ? applicationsRef.current.find((a) => a.id === partial.id) : undefined;
    const row = await resolveApplicationRowForPatch(partial, existing);
    if (!row) return;
    await mergeProfilesIntoCache([row.helper_id], profilesCacheRef.current);
    const unlockKey = `${row.request_id}:${row.helper_id}`;
    if (row.status === 'accepted') {
      chatUnlockedKeysRef.current.add(unlockKey);
    }
    const mapped = applicationRowToApp(row, profilesCacheRef.current.get(row.helper_id) ?? emptyMapperProfile());
    const app: Application = {
      ...(existing ?? mapped),
      ...mapped,
      chatUnlocked:
        chatUnlockedKeysRef.current.has(unlockKey) ||
        mapped.status === 'accepted' ||
        existing?.chatUnlocked === true,
    };
    setApplications((prev) => upsertApplication(prev, app));
  }, []);

  const patchUpcomingRow = useCallback(
    async (partial: Partial<UpcomingJobRow>) => {
      const existing = partial.id ? upcomingJobsRef.current.find((u) => u.id === partial.id) : undefined;
      const row = await resolveUpcomingJobRowForPatch(partial, existing);
      if (!row) return;
      const upcoming = upcomingRowToUpcoming(row);
      setUpcomingJobs((prev) => {
        const merged = upsertUpcoming(prev, existing ? { ...existing, ...upcoming } : upcoming);
        return filterUpcomingByRequestStatus(merged, jobsRef.current);
      });
    },
    [filterUpcomingByRequestStatus],
  );

  const patchReviewRow = useCallback(async (partial: Partial<ReviewRow>) => {
    const existing = partial.id ? reviewsRef.current.find((r) => r.id === partial.id) : undefined;
    const row = await resolveReviewRowForPatch(partial, existing);
    if (!row) return;
    const review = reviewRowToServiceReview(row);
    setReviews((prev) => {
      const duplicate = prev.some(
        (r) => r.id === review.id || (r.requestId === review.requestId && r.reviewerId === review.reviewerId),
      );
      if (duplicate) {
        return upsertReview(
          prev.filter(
            (r) => !(r.requestId === review.requestId && r.reviewerId === review.reviewerId && r.id !== review.id),
          ),
          review,
        );
      }
      return upsertReview(prev, review);
    });
  }, []);


  useEffect(() => {
    if (!useRemote || !userId) return;
    void refreshRemoteBootstrap();
    const unsub = subscribeAppDataChanges({
      requests: {
        onInsert: (row) => {
          runOrQueueRealtimePatch(() => {
            void patchRequestRow(row);
          });
        },
        onUpdate: (row) => {
          runOrQueueRealtimePatch(() => {
            void patchRequestRow(row);
          });
        },
        onDelete: (id) => {
          runOrQueueRealtimePatch(() => {
            setJobs((prev) => prev.filter((j) => j.id !== id));
            setApplications((prev) => prev.filter((a) => a.jobId !== id));
            setUpcomingJobs((prev) => prev.filter((u) => u.jobId !== id));
          });
        },
      },
      applications: {
        onInsert: (row) => {
          runOrQueueRealtimePatch(() => {
            void patchApplicationRow(row);
          });
        },
        onUpdate: (row) => {
          runOrQueueRealtimePatch(() => {
            void patchApplicationRow(row);
          });
        },
        onDelete: (id) => {
          runOrQueueRealtimePatch(() => {
            setApplications((prev) => prev.filter((a) => a.id !== id));
          });
        },
      },
      upcomingJobs: {
        onInsert: (row) => {
          runOrQueueRealtimePatch(() => {
            void patchUpcomingRow(row);
          });
        },
        onUpdate: (row) => {
          runOrQueueRealtimePatch(() => {
            void patchUpcomingRow(row);
          });
        },
        onDelete: (id) => {
          runOrQueueRealtimePatch(() => {
            setUpcomingJobs((prev) => prev.filter((u) => u.id !== id));
          });
        },
      },
      reviews: {
        onInsert: (row) => {
          runOrQueueRealtimePatch(() => {
            void patchReviewRow(row);
          });
        },
        onUpdate: (row) => {
          runOrQueueRealtimePatch(() => {
            void patchReviewRow(row);
          });
        },
        onDelete: (id) => {
          runOrQueueRealtimePatch(() => {
            setReviews((prev) => prev.filter((r) => r.id !== id));
          });
        },
      },
    });
    return () => {
      unsub();
      pendingRealtimePatchesRef.current = [];
    };
  }, [
    useRemote,
    userId,
    refreshRemoteBootstrap,
    patchRequestRow,
    patchApplicationRow,
    patchUpcomingRow,
    patchReviewRow,
    runOrQueueRealtimePatch,
  ]);

  useEffect(() => {
    if (!useRemote || !userId) return;
    let cancelled = false;
    void fetchRemoteNotifications(userId).then((rows) => {
      if (!cancelled) setNotifications(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [useRemote, userId]);

  useEffect(() => {
    if (!useRemote || !userId) return;
    let cancelled = false;
    void fetchRemoteReviews().then((rows) => {
      if (!cancelled) setReviews(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [useRemote, userId]);

  // Granular realtime subscription for notifications — updates state
  // directly without a full app-data refetch, making the bell icon
  // update instantly for both clients and helpers on web and PWA.
  useEffect(() => {
    if (!useRemote || !userId) return;
    return subscribeNotificationsChannel(userId, {
      onInsert: (row: NotificationRow) => {
        const notif = notificationRowToApp(row);
        setNotifications((prev) => {
          if (prev.some((n) => n.id === notif.id)) return prev;
          return [notif, ...prev];
        });
      },
      onUpdate: (row: NotificationRow) => {
        const notif = notificationRowToApp(row);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? notif : n)),
        );
      },
      onDelete: (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      },
    });
  }, [useRemote, userId]);

  const addNotification = (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    if (useRemote) {
      // Optimistically add to local state immediately; the realtime
      // INSERT event from subscribeNotificationsChannel will confirm it.
      const optimisticNotif: AppNotification = {
        ...notif,
        id: `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        read: false,
        createdAt: Date.now(),
      };
      setNotifications((prev) => [optimisticNotif, ...prev]);
      void remoteInsertNotification(notif).catch((e) => {
        console.warn('[LinkHelp] addNotification remote insert', e);
        // On failure, remove optimistic entry
        setNotifications((prev) => prev.filter((n) => n.id !== optimisticNotif.id));
      });
      return;
    }
    const newNotif: AppNotification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      createdAt: Date.now(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (useRemote) {
      void remoteMarkNotificationRead(id, true).catch((e) => {
        console.warn('[LinkHelp] markNotificationAsRead', e);
      });
      return;
    }
  };

  const markAllAsRead = () => {
    const uid = session?.user?.id;
    setNotifications((prev) => prev.map((n) => (n.userId === uid ? { ...n, read: true } : n)));
    if (useRemote && uid) {
      void remoteMarkAllNotificationsRead(uid).catch((e) => {
        console.warn('[LinkHelp] markAllAsRead', e);
      });
      return;
    }
  };

  const clearAllNotifications = async (targetUserId: string) => {
    markNotificationsCleared(targetUserId);
    setNotifications((prev) => prev.filter((n) => n.userId !== targetUserId));
    if (useRemote) {
      await remoteClearAllNotifications(targetUserId).catch((e) => {
        console.warn('[LinkHelp] clearAllNotifications', e);
      });
    }
  };

  const createJob = async (jobDetails: Omit<Job, 'id' | 'createdAt' | 'status'>) => {
    if (useRemote) {
      await remoteCreateRequest({
        clientId: jobDetails.clientId,
        category: jobDetails.category,
        subcategory: jobDetails.subcategory ?? null,
        title: jobDetails.title,
        description: jobDetails.description,
        urgency: jobDetails.urgency,
        location: jobDetails.location,
        address: jobDetails.address ?? null,
        city: jobDetails.city ?? null,
        region: jobDetails.region ?? null,
        postalCode: jobDetails.postalCode ?? null,
        latitude: jobDetails.latitude ?? null,
        longitude: jobDetails.longitude ?? null,
        preferredDate: jobDetails.preferredDate ?? null,
        preferredTimeWindow: jobDetails.preferredPeriod ?? jobDetails.preferredTimeWindow ?? null,
        preferredTime: jobDetails.preferredTime ?? null,
        preferredPeriod: jobDetails.preferredPeriod ?? jobDetails.preferredTimeWindow ?? null,
        dateLabel: jobDetails.date,
        budgetHint: jobDetails.value,
        budgetType: jobDetails.budgetType ?? undefined,
        budgetAmount: jobDetails.budgetAmount ?? null,
        currency: jobDetails.currency ?? 'CAD',
        budgetMin: jobDetails.budgetMin ?? null,
        budgetMax: jobDetails.budgetMax ?? null,
        timezone: jobDetails.timezone ?? jobDetails.createdTimezone ?? null,
        createdTimezone: jobDetails.createdTimezone ?? jobDetails.timezone ?? null,
      });
      await refreshProfile();
      triggerGamificationRecalculate('request_published', 'client');
      return;
    }

    const newJob: Job = {
      ...jobDetails,
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'open',
      createdAt: Date.now(),
    };
    setJobs((prev) => migrateJobAvatars([newJob, ...prev]));
  };

  const applyForJob = async (
    jobId: string,
    helperId: string,
    proposedAmount?: number | null,
    options?: { distanceKm?: number | null; message?: string | null; isExclusive?: boolean },
  ) => {
    const existing = applicationsRef.current.find(
      (a) => a.jobId === jobId && a.helperId === helperId && a.status !== 'cancelled',
    );
    if (existing) {
      throw new Error('ALREADY_APPLIED');
    }

    const job = jobsRef.current.find((j) => j.id === jobId);
    if (!job) throw new Error('JOB_NOT_FOUND');

    if (job.clientId === helperId) {
      console.log('[LinkHelp] Self request blocked', { requestId: jobId, helperId });
      throw new Error('SELF_REQUEST');
    }

    if (isRequestExclusiveLockedForViewer(job, applicationsRef.current, helperId)) {
      throw new Error('EXCLUSIVE_APPLICATION_LOCKED');
    }

    if (!options?.isExclusive && countActiveApplicationsForJob(applicationsRef.current, jobId) >= MAX_JOB_INTERESTED) {
      throw new Error('APPLICATION_LIMIT_REACHED');
    }

    const leadCostBreakdown = leadCostsForJob(job, { distanceKm: options?.distanceKm ?? null });
    const interestCost = options?.isExclusive
      ? getExclusiveApplicationChargeLc(leadCostBreakdown)
      : getApplicationChargeLc(leadCostBreakdown);

    const sessionUserId = session?.user?.id ?? profile?.id ?? null;

    if (useRemote) {
      await submitHelperApplication({
        requestId: jobId,
        helperId,
        clientId: job.clientId,
        proposedAmount: proposedAmount ?? null,
        message: options?.message?.trim() || null,
        isExclusive: options?.isExclusive === true,
        interestCost:
          sessionUserId && helperId === sessionUserId ? interestCost : 0,
      });
      const helperName = profile?.name?.trim() || 'Helper';
      const title = 'Nova candidatura recebida';
      const proposalText =
        proposedAmount != null
          ? `${helperName} enviou uma proposta de CAD $${Math.round(proposedAmount)} para "${job.title}".`
          : `${helperName} se candidatou para "${job.title}".`;
      dispatchPushEvent({
        kind: 'helper_applied',
        userId: job.clientId,
        title,
        body: proposalText,
        url: notificationClientRequestUrl(job.id),
      });
      triggerGamificationRecalculate('application_submitted', 'helper');
      return;
    }

    const helperName = profile?.name?.trim() || 'Helper';
    const helperAvatar =
      profile?.avatar_url?.trim() || avatarUrlForName(helperName, 'dcfce7', '14532d');

    await new Promise((resolve) => setTimeout(resolve, 400));

    const newApp: Application = {
      id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      jobId,
      helperId,
      clientId: job.clientId,
      message: options?.message?.trim() || null,
      proposedAmount: proposedAmount ?? null,
      isExclusive: options?.isExclusive === true,
      helperName,
      helperAvatar,
      helperRating: profile?.rating ?? 0,
      helperJobs: 0,
      status: 'pending',
      createdAt: Date.now(),
    };
    setApplications((prev) => [newApp, ...prev]);

    if (sessionUserId && helperId === sessionUserId) {
      await chargeApplicationInterest(jobId, interestCost);
    }

    if (job.clientId) {
      const title = 'Nova Candidatura Recebida';
      const proposalText =
        proposedAmount != null
          ? `${helperName} enviou uma proposta de CAD $${Math.round(proposedAmount)} para "${job.title}".`
          : `${helperName} se candidatou para "${job.title}".`;
      const message = proposalText;
      addNotification({
        userId: job.clientId,
        type: 'application',
        title,
        message,
        ...buildNotificationPayload({ audience: 'client', requestId: job.id }),
      });
      dispatchPushEvent({
        kind: 'helper_applied',
        userId: job.clientId,
        title,
        body: message,
        url: notificationClientRequestUrl(job.id),
      });
    }
  };

  const updateJobStatus = async (jobId: string, status: JobStatus): Promise<{ expiredWhilePaused?: boolean } | void> => {
    const jobSnapshot = jobsRef.current.find((j) => j.id === jobId);
    const previousStatus = jobSnapshot?.status;
    const isLifecycleChange =
      isJobCancelled({ status }) ||
      (status === 'paused' && previousStatus === 'open') ||
      (status === 'open' && previousStatus === 'paused');

    if (isLifecycleChange && isSupabaseConfigured() && !session) {
      throw new Error('AUTH_REQUIRED');
    }

    if (useRemote) {
      if (isJobCancelled({ status })) {
        await remoteCancelClientRequest(jobId);
        setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, status: 'cancelled' } : job)));
        setApplications((prev) =>
          prev.map((app) =>
            app.jobId === jobId && app.status !== 'cancelled'
              ? { ...app, status: 'cancelled' as ApplicationStatus }
              : app,
          ),
        );
        setUpcomingJobs((prev) =>
          prev.map((u) => (u.jobId === jobId ? { ...u, workflowStatus: 'cancelled' as UpcomingWorkflowStatus } : u)),
        );
      } else if (status === 'paused' && previousStatus === 'open') {
        await remotePauseClientRequest(jobId);
        setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, status: 'paused' } : job)));
      } else if (status === 'open' && previousStatus === 'paused') {
        const result = await remoteResumeClientRequest(jobId);
        if (result.expiredWhilePaused || result.status === 'cancelled') {
          setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, status: 'cancelled' } : job)));
          setApplications((prev) =>
            prev.map((app) =>
              app.jobId === jobId && app.status !== 'cancelled'
                ? { ...app, status: 'cancelled' as ApplicationStatus }
                : app,
            ),
          );
          setUpcomingJobs((prev) =>
            prev.map((u) => (u.jobId === jobId ? { ...u, workflowStatus: 'cancelled' as UpcomingWorkflowStatus } : u)),
          );
          if (isJobCancelled({ status: 'cancelled' })) {
            triggerGamificationRecalculate('request_cancelled', 'client');
          }
          return { expiredWhilePaused: true };
        }
        setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, status: 'open' } : job)));
      } else {
        await remoteUpdateRequestStatus(jobId, status);
        setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, status } : job)));
      }
      if (isJobCancelled({ status })) {
        triggerGamificationRecalculate('request_cancelled', 'client');
      }
      return;
    }

    if (isLifecycleChange && isSupabaseConfigured()) {
      throw new Error('REQUEST_LIFECYCLE_BACKEND_NOT_READY');
    }

    setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, status } : job)));

    if (isJobCancelled({ status })) {
      setApplications((prev) =>
        prev.map((app) =>
          app.jobId === jobId && app.status !== 'cancelled'
            ? { ...app, status: 'cancelled' as ApplicationStatus }
            : app,
        ),
      );
      setUpcomingJobs((prev) =>
        prev.map((u) => (u.jobId === jobId ? { ...u, workflowStatus: 'cancelled' as UpcomingWorkflowStatus } : u)),
      );

      if (jobSnapshot) {
        const relatedApps = applicationsRef.current.filter(
          (a) => a.jobId === jobId && a.status !== 'cancelled',
        );
        for (const app of relatedApps) {
          const cancelTitle = 'Chamado cancelado';
          const cancelMessage = `O cliente cancelou o chamado "${jobSnapshot.title}".`;
          addNotification({
            userId: app.helperId,
            type: 'application',
            title: cancelTitle,
            message: cancelMessage,
            ...buildNotificationPayload({ audience: 'helper', requestId: jobId }),
          });
          dispatchPushEvent({
            kind: 'request_cancelled',
            userId: app.helperId,
            title: cancelTitle,
            body: cancelMessage,
            url: notificationHelperJobsUrl(jobId),
          });
        }
        addNotification({
          userId: jobSnapshot.clientId,
          type: 'application',
          title: 'Chamado cancelado',
          message: `Seu pedido "${jobSnapshot.title}" foi cancelado.`,
          ...buildNotificationPayload({ audience: 'client', requestId: jobId }),
        });
      }
    }
  };

  const updateApplicationStatus = async (applicationId: string, status: ApplicationStatus) => {
    const targetApp = applicationsRef.current.find((a) => a.id === applicationId);
    const jobSnapshot = targetApp ? jobsRef.current.find((j) => j.id === targetApp.jobId) : undefined;

    if (useRemote) {
      await remoteUpdateApplicationStatus(applicationId, status, jobSnapshot);
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId
            ? { ...app, status, ...(status === 'accepted' ? { chatUnlocked: false } : {}) }
            : app,
        ),
      );
      return;
    }

    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? { ...app, status, ...(status === 'accepted' ? { chatUnlocked: false } : {}) }
          : app,
      ),
    );

    if (status === 'accepted' && targetApp && jobSnapshot) {
      setJobs((prev) => prev.map((job) => (job.id === targetApp.jobId ? { ...job, status: 'in_progress' as JobStatus } : job)));

      setUpcomingJobs((prev) => {
        if (prev.some((u) => u.jobId === targetApp.jobId && u.helperId === targetApp.helperId)) {
          return prev;
        }
        const scheduledAt = estimateScheduledAtFromJob(jobSnapshot);
        const row: UpcomingJob = {
          id: `up_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          helperId: targetApp.helperId,
          jobId: jobSnapshot.id,
          clientName: jobSnapshot.clientName,
          clientAvatar: jobSnapshot.clientAvatar,
          title: jobSnapshot.title,
          category: jobSnapshot.category,
          subcategory: jobSnapshot.subcategory ?? null,
          description: jobSnapshot.description,
          location: jobSnapshot.location,
          value: jobSnapshot.value,
          urgency: jobSnapshot.urgency,
          scheduledAt,
          workflowStatus: 'scheduled',
          completionRequestedAt: null,
          reviewWindowEndsAt: null,
          createdAt: Date.now(),
        };
        return [row, ...prev];
      });

      const acceptTitle = 'Application accepted! 🎉';
      const acceptMessage = `The client accepted your application. Next job: "${jobSnapshot.title}".`;
      const helperJobLink = buildNotificationPayload({ audience: 'helper', requestId: targetApp.jobId });
      addNotification({
        userId: targetApp.helperId,
        type: 'application',
        title: acceptTitle,
        message: acceptMessage,
        ...helperJobLink,
      });
      dispatchPushEvent({
        kind: 'helper_accepted',
        userId: targetApp.helperId,
        title: acceptTitle,
        body: acceptMessage,
        url: helperJobLink.actionUrl ?? `${ROUTES.helperJobs}?tab=accepted`,
      });
    }
  };

  const officiallyHireHelper = async (payload: OfficialHirePayload, initialMessage?: string): Promise<string | null> => {
    const { requestId, applicationId, helperId } = payload;
    const targetApp = applicationsRef.current.find((a) => a.id === applicationId);
    const jobSnapshot = jobsRef.current.find((j) => j.id === requestId);

    if (!targetApp || !jobSnapshot) {
      throw new Error('APPLICATION_NOT_FOUND');
    }
    if (targetApp.jobId !== requestId || targetApp.helperId !== helperId) {
      throw new Error('APPLICATION_MISMATCH');
    }

    const selectedDistanceKm = useRemote ? await fetchHelperBaseDistanceKm(helperId, jobSnapshot) : null;
    const selectedCost = leadCostsForJob(jobSnapshot, { distanceKm: selectedDistanceKm }).selectedCost;

    const applyOptimisticHire = () => {
      chatUnlockedKeysRef.current.add(`${requestId}:${helperId}`);
      setApplications((prev) =>
        prev.map((app) => {
          if (app.id === applicationId) {
            return { ...app, status: 'accepted' as ApplicationStatus, chatUnlocked: true };
          }
          if (
            app.jobId === requestId &&
            app.id !== applicationId &&
            (app.status === 'pending' || app.status === 'viewed')
          ) {
            return { ...app, status: 'rejected' as ApplicationStatus };
          }
          return app;
        }),
      );
      setJobs((prev) =>
        prev.map((job) => (job.id === requestId ? { ...job, status: 'in_progress' as JobStatus } : job)),
      );
    };

    if (useRemote) {
      applyOptimisticHire();
      try {
        const conversationId = await remoteOfficiallyHireHelper(payload, jobSnapshot, initialMessage, {
          chargeAmount: selectedCost,
        });

        const hireHelperTitle = 'Contratação oficial';
        const hireHelperMessage = `O cliente aceitou sua proposta para "${jobSnapshot.title}". O chat está liberado.`;
        dispatchPushEvent({
          kind: 'helper_accepted',
          userId: targetApp.helperId,
          title: hireHelperTitle,
          body: hireHelperMessage,
          url: conversationId ? notificationMessagesUrl(conversationId) : notificationHelperJobsUrl(requestId),
        });

        return conversationId;
      } catch (error) {
        await refreshRemoteFull();
        throw error;
      }
    }

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === applicationId) {
          return { ...app, status: 'accepted' as ApplicationStatus, chatUnlocked: true };
        }
        if (
          app.jobId === requestId &&
          app.id !== applicationId &&
          (app.status === 'pending' || app.status === 'viewed')
        ) {
          return { ...app, status: 'rejected' as ApplicationStatus };
        }
        return app;
      }),
    );
    setJobs((prev) =>
      prev.map((job) => (job.id === targetApp.jobId ? { ...job, status: 'in_progress' as JobStatus } : job)),
    );
    setUpcomingJobs((prev) => {
      if (prev.some((u) => u.jobId === targetApp.jobId && u.helperId === targetApp.helperId)) return prev;
      const scheduledAt = estimateScheduledAtFromJob(jobSnapshot);
      const row: UpcomingJob = {
        id: `up_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        helperId: targetApp.helperId,
        jobId: jobSnapshot.id,
        clientName: jobSnapshot.clientName,
        clientAvatar: jobSnapshot.clientAvatar,
        title: jobSnapshot.title,
        category: jobSnapshot.category,
        subcategory: jobSnapshot.subcategory ?? null,
        description: jobSnapshot.description,
        location: jobSnapshot.location,
        value: jobSnapshot.value,
        urgency: jobSnapshot.urgency,
        scheduledAt,
        workflowStatus: 'scheduled',
        completionRequestedAt: null,
        reviewWindowEndsAt: null,
        createdAt: Date.now(),
      };
      return [row, ...prev];
    });

    const hireHelperTitle = 'Contratação oficial';
    const hireHelperMessage = `O cliente contratou você para "${jobSnapshot.title}". O chat está liberado.`;
    const helperHireLink = buildNotificationPayload({ audience: 'helper', requestId });
    addNotification({
      userId: targetApp.helperId,
      type: 'application',
      title: hireHelperTitle,
      message: hireHelperMessage,
      ...helperHireLink,
    });
    dispatchPushEvent({
      kind: 'service_confirmed',
      userId: targetApp.helperId,
      title: hireHelperTitle,
      body: hireHelperMessage,
      url: helperHireLink.actionUrl ?? `${ROUTES.helperJobs}?tab=accepted`,
    });
    const hireClientTitle = 'Helper contratado';
    const hireClientMessage = `Você pode conversar com ${targetApp.helperName} sobre "${jobSnapshot.title}".`;
    const clientHireLink = buildNotificationPayload({
      audience: 'client',
      requestId,
      clientTarget: 'jobs',
    });
    addNotification({
      userId: jobSnapshot.clientId,
      type: 'application',
      title: hireClientTitle,
      message: hireClientMessage,
      ...clientHireLink,
    });
    dispatchPushEvent({
      kind: 'service_confirmed',
      userId: jobSnapshot.clientId,
      title: hireClientTitle,
      body: hireClientMessage,
      url: clientHireLink.actionUrl ?? notificationClientJobsUrl(requestId),
    });

    return null;
  };

  const getHelperApplications = (helperId: string) => {
    return applications.filter((a) => a.helperId === helperId).sort((a, b) => b.createdAt - a.createdAt);
  };

  const getJobApplications = (jobId: string) => {
    return applications.filter((a) => a.jobId === jobId).sort((a, b) => b.createdAt - a.createdAt);
  };

  const getUpcomingJobsForHelper = (helperId: string) => {
    const jobStatusById = new Map<string, JobStatus>(jobs.map((j) => [j.id, j.status]));
    return upcomingJobs
      .filter((u) => {
        if (u.helperId !== helperId) return false;
        if (u.workflowStatus === 'cancelled' || u.workflowStatus === 'completed' || u.workflowStatus === 'auto_completed') return false;
        const jobStatus = jobStatusById.get(u.jobId);
        return !jobStatus || !isJobCancelled({ status: jobStatus });
      })
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  };

  const updateUpcomingWorkflow = (upcomingId: string, workflowStatus: UpcomingWorkflowStatus) => {
    const upcoming = upcomingJobsRef.current.find((u) => u.id === upcomingId);
    const jobSnapshot = upcoming ? jobsRef.current.find((j) => j.id === upcoming.jobId) : undefined;

    if (useRemote) {
      if (workflowStatus === 'awaiting_client_confirmation' || workflowStatus === 'completion_requested') {
        void remoteMarkServiceAwaitingConfirmation(upcomingId).catch((e) =>
          console.error('[LinkHelp] mark service awaiting confirmation', e),
        );
        return;
      }
      void remoteUpdateUpcomingWorkflow(upcomingId, workflowStatus);
      return;
    }

    setUpcomingJobs((prev) => prev.map((u) => (u.id === upcomingId ? { ...u, workflowStatus, completionRequestedAt: workflowStatus === 'completion_requested' || workflowStatus === 'awaiting_client_confirmation' ? Date.now() : u.completionRequestedAt } : u)));

    if ((workflowStatus === 'awaiting_client_confirmation' || workflowStatus === 'completion_requested') && upcoming && jobSnapshot?.clientId) {
      const completionLink = buildNotificationPayload({
        audience: 'client',
        requestId: upcoming.jobId,
        clientTarget: 'jobs',
      });
      addNotification({
        userId: jobSnapshot.clientId,
        type: 'application',
        title: 'Serviço concluído',
        message: `Seu Help informou que o trabalho "${jobSnapshot.title}" foi concluído. Confirme se o serviço foi feito.`,
        ...completionLink,
      });
    }
  };

  const confirmServiceCompleted = async (requestId: string) => {
    if (isSupabaseConfigured() && !session) {
      throw new Error('AUTH_REQUIRED');
    }
    if (useRemote) {
      await remoteConfirmServiceCompleted(requestId);
      setJobs((prev) =>
        prev.map((job) => (job.id === requestId ? { ...job, status: 'completed' as JobStatus } : job)),
      );
      setUpcomingJobs((prev) =>
        prev.map((u) =>
          u.jobId === requestId && isAwaitingClientCompletion(u.workflowStatus)
            ? { ...u, workflowStatus: 'completed' as UpcomingWorkflowStatus }
            : u,
        ),
      );
      setApplications((prev) =>
        prev.map((app) =>
          app.jobId === requestId && app.status === 'accepted'
            ? { ...app, status: 'completed' as ApplicationStatus }
            : app,
        ),
      );
      const completedApp = applicationsRef.current.find(
        (app) => app.jobId === requestId && app.status === 'accepted',
      );
      triggerGamificationRecalculate('service_completed', 'client');
      if (completedApp) {
        triggerGamificationRecalculate('service_completed', 'helper');
      }
      return;
    }

    if (isSupabaseConfigured()) {
      throw new Error('REQUEST_LIFECYCLE_BACKEND_NOT_READY');
    }

    setJobs((prev) => prev.map((job) => (job.id === requestId ? { ...job, status: 'completed' as JobStatus } : job)));
    setUpcomingJobs((prev) =>
      prev.map((u) =>
        u.jobId === requestId && isAwaitingClientCompletion(u.workflowStatus)
          ? { ...u, workflowStatus: 'completed' as UpcomingWorkflowStatus }
          : u,
      ),
    );
    setApplications((prev) =>
      prev.map((app) =>
        app.jobId === requestId && app.status === 'accepted'
          ? { ...app, status: 'completed' as ApplicationStatus }
          : app,
      ),
    );
  };

  const applyLocalServiceCompleted = (requestId: string) => {
    setJobs((prev) =>
      prev.map((job) => (job.id === requestId ? { ...job, status: 'completed' as JobStatus } : job)),
    );
    setUpcomingJobs((prev) =>
      prev.map((u) =>
        u.jobId === requestId ? { ...u, workflowStatus: 'completed' as UpcomingWorkflowStatus } : u,
      ),
    );
    setApplications((prev) =>
      prev.map((app) =>
        app.jobId === requestId && (app.status === 'accepted' || app.status === 'completed')
          ? { ...app, status: 'completed' as ApplicationStatus }
          : app,
      ),
    );
    triggerGamificationRecalculate('service_completed', 'client');
    triggerGamificationRecalculate('service_completed', 'helper');
  };

  const finalizeServiceCompletion = async (input: {
    requestId: string;
    upcomingJobId: string;
    role: 'client' | 'helper';
  }) => {
    const { requestId, upcomingJobId, role } = input;
    if (isSupabaseConfigured() && !session) {
      throw new Error('AUTH_REQUIRED');
    }

    const upcoming = upcomingJobsRef.current.find((u) => u.id === upcomingJobId);
    const jobSnapshot = jobsRef.current.find((j) => j.id === requestId);

    if (useRemote) {
      try {
        await remoteFinalizeServiceCompletion(requestId);
        applyLocalServiceCompleted(requestId);
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg !== 'FINALIZE_RPC_NOT_DEPLOYED') {
          throw e;
        }
      }

      if (role === 'helper') {
        await remoteMarkServiceAwaitingConfirmation(upcomingJobId);
        setUpcomingJobs((prev) =>
          prev.map((u) =>
            u.id === upcomingJobId
              ? {
                  ...u,
                  workflowStatus: 'completion_requested' as UpcomingWorkflowStatus,
                  completionRequestedAt: Date.now(),
                }
              : u,
          ),
        );
        if (upcoming && jobSnapshot?.clientId) {
          const completionLink = buildNotificationPayload({
            audience: 'client',
            requestId,
            clientTarget: 'jobs',
          });
          addNotification({
            userId: jobSnapshot.clientId,
            type: 'application',
            title: 'Serviço concluído',
            message: `Seu Help informou que o trabalho "${jobSnapshot.title}" foi concluído. Confirme se o serviço foi feito.`,
            ...completionLink,
          });
        }
        return;
      }

      const awaiting = upcoming && isAwaitingClientCompletion(upcoming.workflowStatus);
      if (awaiting) {
        await confirmServiceCompleted(requestId);
        return;
      }

      throw new Error('CLIENT_COMPLETE_REQUIRES_FINALIZE_RPC');
    }

    if (isSupabaseConfigured()) {
      throw new Error('REQUEST_LIFECYCLE_BACKEND_NOT_READY');
    }

    applyLocalServiceCompleted(requestId);
  };

  const pendingServiceReviews = useMemo(
    () =>
      userId
        ? buildPendingServiceReviews(userId, userRole as 'client' | 'helper', jobs, applications, reviews, upcomingJobs)
        : [],
    [userId, userRole, jobs, applications, reviews, upcomingJobs],
  );

  const submitServiceReview = async (input: {
    requestId: string;
    targetUserId: string;
    rating: number;
    comment?: string | null;
    criteriaScores?: Record<string, number> | null;
    reviewerRole?: 'client' | 'helper';
  }) => {
    if (!userId) throw new Error('NOT_AUTHENTICATED');
    if (useRemote) {
      const row = await remoteSubmitReview({
        requestId: input.requestId,
        reviewerId: userId,
        targetUserId: input.targetUserId,
        rating: input.rating,
        comment: input.comment,
        criteriaScores: input.criteriaScores,
        reviewerRole: input.reviewerRole,
      });
      setReviews((prev) => [row, ...prev.filter((r) => r.id !== row.id)]);
      triggerGamificationRecalculate(
        'review_received',
        resolveReviewTargetUserType(input.reviewerRole),
      );
      return;
    }
    const local: ServiceReview = {
      id: `rev_${Date.now()}`,
      requestId: input.requestId,
      reviewerId: userId,
      targetUserId: input.targetUserId,
      rating: input.rating,
      comment: input.comment?.trim() || null,
      criteriaScores: input.criteriaScores ?? null,
      reviewerRole: input.reviewerRole ?? null,
      createdAt: Date.now(),
    };
    setReviews((prev) => [local, ...prev]);
  };

  const upcomingJobsEnriched = useMemo(
    () => enrichUpcomingJobsWithSubcategories(upcomingJobs, jobs),
    [upcomingJobs, jobs],
  );

  return (
    <AppDataContext.Provider
      value={{
        jobs,
        applications,
        upcomingJobs: upcomingJobsEnriched,
        notifications,
        dataLoading,
        createJob,
        applyForJob,
        updateJobStatus,
        updateApplicationStatus,
        officiallyHireHelper,
        getHelperApplications,
        getJobApplications,
        getUpcomingJobsForHelper,
        updateUpcomingWorkflow,
        confirmServiceCompleted,
        finalizeServiceCompletion,
        addNotification,
        markNotificationAsRead,
        markAllAsRead,
        clearAllNotifications,
        reviews,
        pendingServiceReviews,
        submitServiceReview,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used within an AppDataProvider');
  return context;
}
