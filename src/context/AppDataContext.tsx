import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { avatarUrlForName } from '@/utils/avatarUrl';
import { clearDemoLocalData } from '@/utils/clearDemoLocalData';
import { estimateScheduledAtFromJob } from '@/utils/upcomingJobUtils';
import { ROUTES } from '@/utils/constants';
import type { Job, JobStatus, JobUrgency } from '@/types/job';
import type { Application, ApplicationStatus } from '@/types/application';
import type { UpcomingJob, UpcomingWorkflowStatus } from '@/types/upcoming';
import type { AppNotification, NotificationType } from '@/types/notification';
import {
  fetchRemoteJobsAndApps,
  remoteApply,
  remoteCreateRequest,
  remoteInsertNotification,
  remoteMarkAllNotificationsRead,
  remoteMarkNotificationRead,
  remoteUpdateRequestStatus,
  remoteOfficiallyHireHelper,
  remoteUpdateApplicationStatus,
  remoteUpdateUpcomingWorkflow,
  subscribeRemoteData,
} from '@/services/supabase/appDataRemote';

export type { Job, JobStatus, JobUrgency, Application, ApplicationStatus, UpcomingJob, UpcomingWorkflowStatus };
export type { AppNotification, NotificationType };

interface AppDataContextData {
  jobs: Job[];
  applications: Application[];
  upcomingJobs: UpcomingJob[];
  notifications: AppNotification[];
  dataLoading: boolean;
  createJob: (job: Omit<Job, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  applyForJob: (jobId: string, helperId: string) => Promise<void>;
  updateJobStatus: (jobId: string, status: JobStatus) => Promise<void>;
  updateApplicationStatus: (applicationId: string, status: ApplicationStatus) => Promise<void>;
  officiallyHireHelper: (applicationId: string, initialMessage?: string) => Promise<string | null>;
  getHelperApplications: (helperId: string) => Application[];
  getJobApplications: (jobId: string) => Application[];
  getUpcomingJobsForHelper: (helperId: string) => UpcomingJob[];
  updateUpcomingWorkflow: (upcomingId: string, workflowStatus: UpcomingWorkflowStatus) => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const AppDataContext = createContext<AppDataContextData>({} as AppDataContextData);

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
  const { session, profile } = useAuth();
  const useRemote = isSupabaseConfigured() && !!session;

  const [dataLoading, setDataLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<UpcomingJob[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const jobsRef = useRef(jobs);
  const applicationsRef = useRef(applications);
  jobsRef.current = jobs;
  applicationsRef.current = applications;

  useEffect(() => {
    clearDemoLocalData();
  }, []);

  const refreshRemote = useCallback(async () => {
    if (!useRemote) return;
    setDataLoading(true);
    try {
      const d = await fetchRemoteJobsAndApps();
      setJobs(d.jobs);
      setApplications(d.applications);
      setUpcomingJobs(d.upcomingJobs);
      setNotifications(d.notifications);
    } finally {
      setDataLoading(false);
    }
  }, [useRemote]);

  useEffect(() => {
    if (!useRemote) return;
    void refreshRemote();
    const unsub = subscribeRemoteData(() => {
      void refreshRemote();
    });
    return unsub;
  }, [useRemote, refreshRemote]);

  const addNotification = (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    if (useRemote) {
      void remoteInsertNotification(notif).then(() => void refreshRemote());
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
    if (useRemote) {
      void remoteMarkNotificationRead(id, true).then(() => void refreshRemote());
      return;
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    const uid = session?.user?.id;
    if (useRemote && uid) {
      void remoteMarkAllNotificationsRead(uid).then(() => void refreshRemote());
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
        preferredTimeWindow: jobDetails.preferredTimeWindow ?? null,
        preferredTime: jobDetails.preferredTime ?? null,
        dateLabel: jobDetails.date,
        budgetHint: jobDetails.value,
        budgetType: jobDetails.budgetType ?? undefined,
        budgetAmount: jobDetails.budgetAmount ?? null,
        currency: jobDetails.currency ?? 'CAD',
        budgetMin: jobDetails.budgetMin ?? null,
        budgetMax: jobDetails.budgetMax ?? null,
      });
      await refreshRemote();
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

  const applyForJob = async (jobId: string, helperId: string) => {
    const existing = applicationsRef.current.find((a) => a.jobId === jobId && a.helperId === helperId);
    if (existing) {
      throw new Error('ALREADY_APPLIED');
    }

    const job = jobsRef.current.find((j) => j.id === jobId);
    if (!job) throw new Error('JOB_NOT_FOUND');

    if (useRemote) {
      await remoteApply({
        requestId: jobId,
        helperId,
        clientId: job.clientId,
      });
      await refreshRemote();
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
      helperName,
      helperAvatar,
      helperRating: profile?.rating ?? 0,
      helperJobs: 0,
      helperPlan: 'BASIC',
      status: 'pending',
      createdAt: Date.now(),
    };
    setApplications((prev) => [newApp, ...prev]);

    if (job.clientId) {
      addNotification({
        userId: job.clientId,
        type: 'application',
        title: 'Nova Candidatura Recebida',
        message: `${helperName} se candidatou para "${job.title}".`,
        actionUrl: ROUTES.clientDashboard,
      });
    }
  };

  const updateJobStatus = async (jobId: string, status: JobStatus) => {
    if (useRemote) {
      await remoteUpdateRequestStatus(jobId, status);
      await refreshRemote();
      return;
    }
    setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, status } : job)));
  };

  const updateApplicationStatus = async (applicationId: string, status: ApplicationStatus) => {
    const targetApp = applicationsRef.current.find((a) => a.id === applicationId);
    const jobSnapshot = targetApp ? jobsRef.current.find((j) => j.id === targetApp.jobId) : undefined;

    if (useRemote && jobSnapshot) {
      await remoteUpdateApplicationStatus(applicationId, status, jobSnapshot);
      await refreshRemote();
      return;
    }

    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? { ...app, status, ...(status === 'accepted' ? { chatUnlocked: false } : {}) }
          : app,
      ),
    );

    if (status === 'cancelled' && targetApp) {
      addNotification({
        userId: targetApp.clientId ?? jobSnapshot?.clientId ?? '',
        type: 'application',
        title: 'Candidatura cancelada',
        message: 'Um helper retirou a candidatura.',
        actionUrl: ROUTES.clientDashboard,
      });
    }

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
          description: jobSnapshot.description,
          location: jobSnapshot.location,
          value: jobSnapshot.value,
          urgency: jobSnapshot.urgency,
          scheduledAt,
          workflowStatus: 'scheduled',
          createdAt: Date.now(),
        };
        return [row, ...prev];
      });

      addNotification({
        userId: targetApp.helperId,
        type: 'application',
        title: 'Application accepted! 🎉',
        message: `The client accepted your application. Next job: "${jobSnapshot.title}".`,
        actionUrl: ROUTES.helperJobsUpcoming,
      });
    } else if (status === 'rejected' && targetApp) {
      addNotification({
        userId: targetApp.helperId,
        type: 'application',
        title: 'Application declined',
        message: `The client chose another helper this time.`,
        actionUrl: ROUTES.helperOpportunities,
      });
    }
  };

  const officiallyHireHelper = async (applicationId: string, initialMessage?: string): Promise<string | null> => {
    const targetApp = applicationsRef.current.find((a) => a.id === applicationId);
    const jobSnapshot = targetApp ? jobsRef.current.find((j) => j.id === targetApp.jobId) : undefined;
    if (!targetApp || !jobSnapshot) return null;

    if (useRemote) {
      const conversationId = await remoteOfficiallyHireHelper(applicationId, jobSnapshot, initialMessage);
      await refreshRemote();
      return conversationId;
    }

    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId ? { ...app, status: 'accepted' as ApplicationStatus, chatUnlocked: true } : app,
      ),
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
        description: jobSnapshot.description,
        location: jobSnapshot.location,
        value: jobSnapshot.value,
        urgency: jobSnapshot.urgency,
        scheduledAt,
        workflowStatus: 'scheduled',
        createdAt: Date.now(),
      };
      return [row, ...prev];
    });

    addNotification({
      userId: targetApp.helperId,
      type: 'application',
      title: 'Contratação oficial',
      message: `O cliente contratou você para "${jobSnapshot.title}". O chat está liberado.`,
      actionUrl: ROUTES.messages,
    });
    addNotification({
      userId: jobSnapshot.clientId,
      type: 'application',
      title: 'Helper contratado',
      message: `Você pode conversar com ${targetApp.helperName} sobre "${jobSnapshot.title}".`,
      actionUrl: ROUTES.messages,
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
    return upcomingJobs
      .filter((u) => u.helperId === helperId)
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  };

  const updateUpcomingWorkflow = (upcomingId: string, workflowStatus: UpcomingWorkflowStatus) => {
    if (useRemote) {
      void remoteUpdateUpcomingWorkflow(upcomingId, workflowStatus).then(() => void refreshRemote());
      return;
    }
    setUpcomingJobs((prev) => prev.map((u) => (u.id === upcomingId ? { ...u, workflowStatus } : u)));
  };

  return (
    <AppDataContext.Provider
      value={{
        jobs,
        applications,
        upcomingJobs,
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
        addNotification,
        markNotificationAsRead,
        markAllAsRead,
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
