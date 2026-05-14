import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { mockUsers } from '@/data/mockUsers';
import { avatarUrlForName } from '@/utils/avatarUrl';
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
  createJob: (job: Omit<Job, 'id' | 'createdAt' | 'status'>) => void;
  /** Resolves when remote apply completes; conversation opens only after client accepts. */
  applyForJob: (jobId: string, helperId: string) => Promise<void>;
  updateApplicationStatus: (applicationId: string, status: ApplicationStatus) => Promise<void>;
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

function migrateUpcomingAvatars(rows: UpcomingJob[]): UpcomingJob[] {
  return rows.map((u) => ({
    ...u,
    clientAvatar:
      u.clientAvatar?.includes('pravatar.cc') || u.clientAvatar?.includes('i.pravatar')
        ? avatarUrlForName(u.clientName, 'f1f5f9', '334155')
        : u.clientAvatar,
  }));
}

const INITIAL_JOBS: Job[] = [
  {
    id: 'job_1',
    clientId: 'user_other_1',
    clientName: 'Sophie L.',
    clientAvatar: avatarUrlForName('Sophie L.', 'fef3c7', '92400e'),
    title: 'Need help moving a sofa',
    category: 'moving',
    description: 'Moving between neighbourhoods—I need someone with a truck and muscle.',
    date: 'Tomorrow, 2:00 PM',
    location: 'Downtown Montreal',
    value: '40',
    urgency: 'high',
    status: 'open',
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'job_2',
    clientId: 'user_other_2',
    clientName: 'Marc A.',
    clientAvatar: avatarUrlForName('Marc A.', 'e0e7ff', '312e81'),
    title: 'IKEA furniture assembly',
    category: 'assembly',
    description: 'I bought a bed and a wardrobe and need someone to assemble them.',
    date: 'Friday, 10:00 AM',
    location: 'Laval',
    value: '80',
    urgency: 'normal',
    status: 'open',
    createdAt: Date.now() - 7200000,
  },
];

const INITIAL_UPCOMING: UpcomingJob[] = [
  {
    id: 'up_seed_1',
    helperId: mockUsers.helper.id,
    jobId: 'job_seed_1',
    clientName: 'Sophie L.',
    clientAvatar: avatarUrlForName('Sophie L.', 'fef3c7', '92400e'),
    title: 'IKEA furniture assembly',
    category: 'assembly',
    description: 'Wardrobe and queen bed assembly. Basic tools on site.',
    location: 'Plateau, Montreal',
    value: '85',
    urgency: 'normal',
    scheduledAt: Date.now() + 2 * 3600000,
    workflowStatus: 'scheduled',
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'up_seed_2',
    helperId: mockUsers.helper.id,
    jobId: 'job_seed_2',
    clientName: 'Marc A.',
    clientAvatar: avatarUrlForName('Marc A.', 'e0e7ff', '312e81'),
    title: 'Ceiling fan installation',
    category: 'renovation',
    description: 'Drywall ceiling; electrical box already in place.',
    location: 'Laval',
    value: '120',
    urgency: 'normal',
    scheduledAt: Date.now() + 30 * 3600000,
    workflowStatus: 'scheduled',
    createdAt: Date.now() - 172800000,
  },
];

function loadUpcoming(): UpcomingJob[] {
  try {
    const raw = localStorage.getItem('linkhelp_upcoming_jobs');
    if (!raw) return INITIAL_UPCOMING;
    const parsed = JSON.parse(raw) as UpcomingJob[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_UPCOMING;
  } catch {
    return INITIAL_UPCOMING;
  }
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const useRemote = isSupabaseConfigured() && !!session;

  const [dataLoading, setDataLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>(() => {
    if (isSupabaseConfigured()) return [];
    const saved = localStorage.getItem('linkhelp_jobs');
    if (!saved) return INITIAL_JOBS;
    try {
      return migrateJobAvatars(JSON.parse(saved) as Job[]);
    } catch {
      return INITIAL_JOBS;
    }
  });

  const [applications, setApplications] = useState<Application[]>(() => {
    if (isSupabaseConfigured()) return [];
    const saved = localStorage.getItem('linkhelp_applications');
    return saved ? JSON.parse(saved) : [];
  });

  const [upcomingJobs, setUpcomingJobs] = useState<UpcomingJob[]>(() => {
    if (isSupabaseConfigured()) return [];
    return migrateUpcomingAvatars(loadUpcoming());
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (isSupabaseConfigured()) return [];
    const saved = localStorage.getItem('linkhelp_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const jobsRef = useRef(jobs);
  const applicationsRef = useRef(applications);
  jobsRef.current = jobs;
  applicationsRef.current = applications;

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

  useEffect(() => {
    if (useRemote) return;
    localStorage.setItem('linkhelp_jobs', JSON.stringify(jobs));
  }, [jobs, useRemote]);

  useEffect(() => {
    if (useRemote) return;
    localStorage.setItem('linkhelp_applications', JSON.stringify(applications));
  }, [applications, useRemote]);

  useEffect(() => {
    if (useRemote) return;
    localStorage.setItem('linkhelp_upcoming_jobs', JSON.stringify(upcomingJobs));
  }, [upcomingJobs, useRemote]);

  useEffect(() => {
    if (useRemote) return;
    localStorage.setItem('linkhelp_notifications', JSON.stringify(notifications));
  }, [notifications, useRemote]);

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

  const createJob = (jobDetails: Omit<Job, 'id' | 'createdAt' | 'status'>) => {
    if (useRemote) {
      void (async () => {
        try {
          await remoteCreateRequest({
            clientId: jobDetails.clientId,
            category: jobDetails.category,
            subcategory: jobDetails.subcategory ?? null,
            title: jobDetails.title,
            description: jobDetails.description,
            urgency: jobDetails.urgency,
            location: jobDetails.location,
            latitude: jobDetails.latitude ?? null,
            longitude: jobDetails.longitude ?? null,
            dateLabel: jobDetails.date,
            budgetHint: jobDetails.value,
          });
          await refreshRemote();
        } catch (e) {
          console.error(e);
          alert(e instanceof Error ? e.message : 'Failed to create request');
        }
      })();
      return;
    }

    const newJob: Job = {
      ...jobDetails,
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'open',
      createdAt: Date.now(),
    };
    setJobs((prev) => [newJob, ...prev]);

    addNotification({
      userId: mockUsers.helper.id,
      type: 'job_update',
      title: '🚨 Nova Oportunidade Perto de Você',
      message: `Um novo pedido "${newJob.title}" acabou de ser postado perto de você!`,
      actionUrl: ROUTES.helperOpportunities,
    });
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

    await new Promise((resolve) => setTimeout(resolve, 800));

    const newApp: Application = {
      id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      jobId,
      helperId,
      clientId: job.clientId,
      helperName: mockUsers.helper.name,
      helperAvatar: mockUsers.helper.avatar,
      helperRating: mockUsers.helper.rating || 5.0,
      helperJobs: mockUsers.helper.jobsCompleted || 0,
      helperPlan: mockUsers.helper.subscriptionTier ?? 'BASIC',
      status: 'pending',
      createdAt: Date.now(),
    };
    setApplications((prev) => [newApp, ...prev]);

    addNotification({
      userId: job.clientId,
      type: 'application',
      title: 'Nova Candidatura Recebida',
      message: `${mockUsers.helper.name} se candidatou para "${job.title}".`,
      actionUrl: ROUTES.clientDashboard,
    });
    return;
  };

  const updateApplicationStatus = async (applicationId: string, status: ApplicationStatus) => {
    const targetApp = applicationsRef.current.find((a) => a.id === applicationId);
    const jobSnapshot = targetApp ? jobsRef.current.find((j) => j.id === targetApp.jobId) : undefined;

    if (useRemote && jobSnapshot) {
      await remoteUpdateApplicationStatus(applicationId, status, jobSnapshot);
      await refreshRemote();
      return;
    }

    setApplications((prev) => prev.map((app) => (app.id === applicationId ? { ...app, status } : app)));

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
        updateApplicationStatus,
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
