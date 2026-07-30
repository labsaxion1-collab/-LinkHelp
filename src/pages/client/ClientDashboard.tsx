import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Plus, Star, MessageSquare, ChevronRight, Bell } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAppDataCore, useAppDataActionsRef, type OfficialHirePayload } from '@/context/AppDataContext';
import { useServiceReview } from '@/context/ServiceReviewContext';
import { ServiceConfirmModal } from '@/components/modals/ServiceConfirmModal';
import { SERVICE_CATEGORIES, isOfficialServiceCategoryId } from '@/data/serviceCategories';
import { getCategoryLucideIcon } from '@/utils/categoryIcons';
import { getCategoryAccent, getCategoryFeedTheme } from '@/utils/categoryFeedTheme';
import { clsx } from 'clsx';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { CloseToHomeButton } from '@/components/layout/CloseToHomeButton';
import { formatJobScheduleDisplay, isBeautyScheduledJob } from '@/utils/jobDisplay';
import { ROUTES } from '@/utils/constants';
import { BRAND } from '@/utils/brandAssets';
import { avatarUrlForName } from '@/utils/avatarUrl';
import { LinkHelpRankBadgeFromStats } from '@/components/ranking/LinkHelpRankBadge';
import { CreateRequestModal } from '@/components/client/create-request/CreateRequestModal';
import { ClientAwaitingCompletionBridge } from '@/components/client/ClientAwaitingCompletionBridge';
import { ClientDashboardMapSidebar } from '@/components/client/ClientDashboardMapSidebar';
import { ClientDashboardHeroSlot } from '@/components/client/ClientDashboardHeroSlot';
import { ClientCandidateCard } from '@/components/client/ClientCandidateCard';
import { ClientActivityOpenRequestCard } from '@/components/client/ClientActivityOpenRequestCard';
import { candidateProfileExpandKey } from '@/utils/candidateProfileExpand';
import { useNearbyHelpers } from '@/hooks/useNearbyHelpers';
import type { NearbyHelperMapPoint } from '@/types/nearbyHelper';
import { LhCard } from '@/components/design-system/LhCard';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { useToast } from '@/context/ToastContext';
import { UserProfileModal } from '@/components/profile/UserProfileModal';
import { HelperPublicProfileView } from '@/components/features/HelperPublicProfileView';
import { PublicProfileSheetFrame, PUBLIC_PROFILE_SCROLL_ATTR } from '@/components/reputation/PublicProfileSheetFrame';
import { formatJobBudgetDisplay } from '@/utils/formatJobBudget';
import { formatMoneyAmount, jobHasBoundedBudget } from '@/utils/jobProposal';
import {
  findClientHelperApplication,
  isChatUnlockedApplication,
  resolveClientHelperApplication,
} from '@/utils/chatHireGate';
import { ensureConversation } from '@/services/supabase/conversationEnsure';
import { remoteGetPreMatchClientCount } from '@/services/supabase/appDataRemote';
import { isSupabaseConfigured } from '@/lib/supabase';
import { PRE_HIRE_MESSAGE_LIMIT } from '@/utils/preMatchLimits';
import {
  isJobExpired,
  isJobCancelled,
  isJobPaused,
  isJobVisibleToClient,
  hideJobForUser,
  readHiddenJobIds,
} from '@/utils/jobVisibility';
import { CancelRequestModal } from '@/components/client/CancelRequestModal';
import { PauseRequestModal } from '@/components/client/PauseRequestModal';
import { CLIENT_LINKCREDITS_ENABLED } from '@/config/clientLinkCredits';
import { isRequestLifecycleControlsEnabled } from '@/config/requestLifecycleCapability';
import { extractErrorMessage } from '@/utils/errorMessage';
import { formatHireError, formatRejectApplicationError, logAcceptProposalError } from '@/utils/formatHireError';
import { formatRequestLifecycleError } from '@/utils/formatRequestLifecycleError';
import {
  activityCandidateCount,
  canAcceptApplicationForJob,
  findHiredApplicationForJob,
  isHireTeamComplete,
  isHiredActivityJob,
  isPreHireActivityJob,
  listCandidateApplicationsForJob,
} from '@/utils/clientActivityApplications';
import { useAuth } from '@/context/AuthContext';
import { ClientCreditsWalletBadge } from '@/components/client/ClientCreditsWalletBadge';
import { CompletionReminderCard } from '@/components/reviews/CompletionReminderCard';
import { isAwaitingClientCompletion, shouldShowCompletionReminder } from '@/utils/serviceWorkflow';
import { ClientOnboardingCarousel } from '@/components/client/onboarding/ClientOnboardingCarousel';
import { useClientOnboarding } from '@/hooks/useClientOnboarding';
import { CLIENT_WELCOME_30_LC } from '@/config/onboardingRewards';
import { InterestedRing } from '@/components/opportunities/InterestedRing';
import { useGamification } from '@/gamification/hooks/useGamification';
import { GamificationProgressCard } from '@/gamification/components/GamificationProgressCard';
import { AppHomeClientQuickStrip } from '@/components/home/AppHomeClientQuickStrip';
import { useMarkHomeDashboardSurfaceReady } from '@/components/home/HomeDashboardShellContext';
import { useDevRenderCount } from '@/utils/devRenderCount';
import { readAccountHomeSnapshot } from '@/utils/accountSessionSnapshot';
import { scheduleIdle } from '@/utils/scheduleIdle';
import { useProgressiveReveal } from '@/hooks/useProgressiveReveal';
import { appPerfMark } from '@/utils/appPerf';

const SERVICE_CONFIRM_DISMISS_PREFIX = 'lh_service_confirm_skip_';
import { translateJobTitle } from '@/utils/translateCategory';
import type { Job } from '@/types/job';
import type { Application } from '@/types/application';

function formatClientBudgetRangeLabel(job: Job, t: (key: string, vars?: Record<string, string | number>) => string): string | null {
  if (!jobHasBoundedBudget(job)) return null;
  const currency = job.currency?.trim() || 'CAD';
  return t('client_dashboard.client_budget_range', {
    min: Math.round(job.budgetMin!),
    max: Math.round(job.budgetMax!),
    currency,
  });
}
type RecommendedHelperCard = {
  id: string | number;
  name: string;
  rating: number;
  avatar: string;
  skills: readonly string[];
  isOnline: boolean;
  jobsCompleted?: number;
};

const RECOMMENDED_HELPERS: RecommendedHelperCard[] = [];

/** Accentos do dashboard via CSS vars `--medal-*` (tema global da medalha). */
const CLIENT_DASHBOARD_MEDAL_ACCENT = {
  summaryCard: 'lh-medal-card-active border bg-[#0a0c0a]/92',
  summaryLabel: 'lh-medal-primary',
  categoryIcon: 'lh-medal-icon shadow-sm',
  categoryHover: 'hover:opacity-95',
  actionLink: 'lh-medal-text',
  trustPanel: 'lh-medal-card-active border bg-[#0a0c0a]/92',
  trustDivider: 'lh-medal-border',
  trustIcon: 'lh-medal-primary',
  activityColor: 'var(--medal-primary)',
  activityGradient: 'lh-medal-btn-primary',
  activityAccentBar: 'lh-medal-accent-bar',
  activityText: 'lh-medal-text',
  activitySoftBg: 'lh-medal-light-bg',
  activitySoftBorder: 'lh-medal-border',
  activityTabBadge: 'bg-white/20 text-white',
  activityBudgetChip: 'lh-medal-border lh-medal-light-bg lh-medal-text border',
  activityIconBubble: 'lh-medal-icon shadow-sm',
  activityTipPanel: 'lh-medal-border lh-medal-light-bg border',
} as const;

function estimateClientLeadQuality(description: string, location: string, budget: string, applicationsCount: number): number {
  let score = 52;
  if (description.trim().length > 120) score += 16;
  if (location.trim()) score += 12;
  if (budget.trim() && !/negotiable|combinar|agree/i.test(budget)) score += 12;
  if (applicationsCount > 0) score += 8;
  return Math.min(score, 98);
}

export default function ClientDashboard() {
  useMarkHomeDashboardSurfaceReady();
  const clientGamification = useGamification('client');
  const clientDashboardAccent = CLIENT_DASHBOARD_MEDAL_ACCENT;
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedCreditPackage, setSelectedCreditPackage] = useState<number | null>(null);
  const successModalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissSuccessModal = () => {
    if (successModalTimerRef.current) {
      clearTimeout(successModalTimerRef.current);
      successModalTimerRef.current = null;
    }
    setShowSuccessModal(false);
  };

  const processPayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setShowCreditModal(false);
      setShowSuccessModal(true);
      if (successModalTimerRef.current) clearTimeout(successModalTimerRef.current);
      successModalTimerRef.current = setTimeout(() => dismissSuccessModal(), 3000);
    }, 1500);
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createInitialCategory, setCreateInitialCategory] = useState('');
  const [createInitialSubcategory, setCreateInitialSubcategory] = useState('');
  const [activeSidebarTab, setActiveSidebarTab] = useState<'dashboard' | 'my-helpers' | 'active-services' | 'saved'>('dashboard');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [toastNotification, setToastNotification] = useState<{message: string, show: boolean}>({message: '', show: false});
  const [previousAppCount, setPreviousAppCount] = useState(0);
  
  const [selectedHelper, setSelectedHelper] = useState<any>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [showHelperProfileModal, setShowHelperProfileModal] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireModalKind, setHireModalKind] = useState<'hire' | 'proposal'>('hire');
  const [inviteMessage, setInviteMessage] = useState('');
  const [jobsListTab, setJobsListTab] = useState<'active' | 'history'>('active');
  const [expandedActivityPanel, setExpandedActivityPanel] = useState<{
    jobId: string;
    panel: 'applications' | 'description';
  } | null>(null);
  const [activityMenuJobId, setActivityMenuJobId] = useState<string | null>(null);
  const [profileContextRequestId, setProfileContextRequestId] = useState<string | null>(null);
  const activityMenuRef = useRef<HTMLDivElement | null>(null);
  const [hiddenJobIds, setHiddenJobIds] = useState<Set<string>>(() => new Set());
  const [acceptingApplicationId, setAcceptingApplicationId] = useState<string | null>(null);
  const [cancelTargetJobId, setCancelTargetJobId] = useState<string | null>(null);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [pauseTargetJobId, setPauseTargetJobId] = useState<string | null>(null);
  const [pausingJobId, setPausingJobId] = useState<string | null>(null);
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [expandedCandidateProfileKey, setExpandedCandidateProfileKey] = useState<string | null>(null);
  const [serviceConfirmJob, setServiceConfirmJob] = useState<Job | null>(null);
  const [serviceConfirmBusy, setServiceConfirmBusy] = useState(false);
  
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isClientJobsPage = routerLocation.pathname === ROUTES.clientJobs;
  const lifecycleControlsEnabled = isRequestLifecycleControlsEnabled();

  const { t } = useLanguage();
  const { showToast } = useToast();
  const { profile, authLoading, session } = useAuth();
  const { shouldShow: showClientOnboarding, completing: completingClientOnboarding, complete: completeClientOnboarding } =
    useClientOnboarding();
  const snapshotLc = useMemo(() => {
    const uid = profile?.id ?? session?.user?.id ?? null;
    if (!uid) return null;
    return readAccountHomeSnapshot(uid)?.lcBalanceVisual ?? null;
  }, [profile?.id, session?.user?.id]);
  // Prefer live profile credits; fall back to same-account snapshot — never flash 0 while loading.
  const clientCreditsBalance =
    typeof profile?.credits === 'number' ? profile.credits : snapshotLc;
  const creditsLoading = authLoading && clientCreditsBalance == null;
  const skillChip = (skill: string) =>
    skill === 'support' ? t('skills.support') : t(`categories.${skill}`);
  const { jobs, applications, pendingServiceReviews, upcomingJobs } = useAppDataCore();
  const appDataActionsRef = useAppDataActionsRef();
  useDevRenderCount('ClientDashboard');
  const { openReviewByRequestId } = useServiceReview();
  const me = useSessionViewer();

  const [secondaryBlocksReady, setSecondaryBlocksReady] = useState(false);
  useEffect(() => {
    appPerfMark('client-home-structure');
    return scheduleIdle(() => {
      setSecondaryBlocksReady(true);
      appPerfMark('client-secondary-ready');
    }, 1400);
  }, []);

  const [awaitingCompletionJobIds, setAwaitingCompletionJobIds] = useState<Set<string>>(new Set());

  const myJobIds = useMemo(() => jobs.filter((j) => j.clientId === me.id).map((j) => j.id), [jobs, me.id]);

  const handleAwaitingCompletionIds = useCallback((ids: Set<string>) => {
    setAwaitingCompletionJobIds(ids);
  }, []);

  const isJobAwaitingCompletion = useCallback(
    (jobId: string) => {
      if (awaitingCompletionJobIds.has(jobId)) return true;
      return upcomingJobs.some(
        (u) => u.jobId === jobId && isAwaitingClientCompletion(u.workflowStatus),
      );
    },
    [awaitingCompletionJobIds, upcomingJobs],
  );

  const jobsAwaitingServiceConfirm = useMemo(
    () =>
      jobs.filter(
        (j) =>
          j.clientId === me.id &&
          j.status === 'in_progress' &&
          isJobAwaitingCompletion(j.id),
      ),
    [jobs, isJobAwaitingCompletion, me.id],
  );

  const completionReminderJobs = useMemo(
    () =>
      jobsAwaitingServiceConfirm.filter((j) => {
        const uj = upcomingJobs.find((u) => u.jobId === j.id && isAwaitingClientCompletion(u.workflowStatus));
        return uj && shouldShowCompletionReminder(uj.workflowStatus, uj.completionRequestedAt);
      }),
    [jobsAwaitingServiceConfirm, upcomingJobs],
  );

  useEffect(() => {
    if (serviceConfirmJob || serviceConfirmBusy) return;
    const next = jobsAwaitingServiceConfirm.find((job) => {
      try {
        return sessionStorage.getItem(`${SERVICE_CONFIRM_DISMISS_PREFIX}${job.id}`) !== '1';
      } catch {
        return true;
      }
    });
    if (next) setServiceConfirmJob(next);
  }, [jobsAwaitingServiceConfirm, serviceConfirmJob, serviceConfirmBusy]);

  const dismissServiceConfirm = (job: Job) => {
    try {
      sessionStorage.setItem(`${SERVICE_CONFIRM_DISMISS_PREFIX}${job.id}`, '1');
    } catch {
      /* ignore */
    }
    setServiceConfirmJob(null);
  };

  const handleReportServiceProblem = async (job: Job) => {
    dismissServiceConfirm(job);
    const hiredApp = applications.find(
      (a) => a.jobId === job.id && (a.status === 'accepted' || a.status === 'completed'),
    );
    showToast(t('service_confirm.report_problem_toast'), 'info');
    if (!hiredApp) return;
    try {
      const convId = await ensureConversation({
        requestId: job.id,
        clientId: me.id,
        helperId: hiredApp.helperId,
        contactUnlocked: true,
      });
      navigate(`${ROUTES.messages}?c=${convId}`);
    } catch {
      /* chat optional */
    }
  };

  const handleConfirmServiceCompleted = async () => {
    if (!serviceConfirmJob) return;
    setServiceConfirmBusy(true);
    const requestId = serviceConfirmJob.id;
    const upcoming = upcomingJobs.find((u) => u.jobId === requestId);
    try {
      if (upcoming) {
        await appDataActionsRef.current.finalizeServiceCompletion({
          requestId,
          upcomingJobId: upcoming.id,
          role: 'client',
        });
      } else {
        await appDataActionsRef.current.confirmServiceCompleted(requestId);
      }
      try {
        sessionStorage.removeItem(`${SERVICE_CONFIRM_DISMISS_PREFIX}${requestId}`);
      } catch {
        /* ignore */
      }
      setServiceConfirmJob(null);
      setJobsListTab('history');
      showToast(t('service_confirm.success_toast'), 'success');
      window.setTimeout(() => openReviewByRequestId(requestId), 400);
    } catch (error) {
      console.error('[LinkHelp] confirm service completed', error);
      showToast(t('service_confirm.error_toast'), 'error');
    } finally {
      setServiceConfirmBusy(false);
    }
  };

  const profileApp = useMemo(() => {
    if (!selectedHelper) return undefined;
    return resolveClientHelperApplication(String(selectedHelper.id), myJobIds, applications, {
      applicationId: selectedApplicationId,
      requestId: detailJob?.id ?? profileContextRequestId ?? null,
    });
  }, [selectedHelper, selectedApplicationId, detailJob?.id, profileContextRequestId, myJobIds, applications]);

  const profileChatUnlocked = useMemo(() => {
    return profileApp ? isChatUnlockedApplication(profileApp) : false;
  }, [profileApp]);

  const isHelperChatUnlocked = (helperId: string | number) => {
    const helperChatApp = findClientHelperApplication(String(helperId), myJobIds, applications);
    return helperChatApp ? isChatUnlockedApplication(helperChatApp) : false;
  };

  /** True when the helper has an active (pending/viewed) application — pre-hire chat allowed. */
  const profilePreMatchEligible = useMemo(() => {
    if (!profileApp || profileChatUnlocked) return false;
    return profileApp.status === 'pending' || profileApp.status === 'viewed';
  }, [profileApp, profileChatUnlocked]);

  const profileApplicationId = useMemo(() => {
    if (selectedApplicationId) return selectedApplicationId;
    return profileApp?.id ?? null;
  }, [selectedApplicationId, profileApp]);

  const [profilePreMatchCount, setProfilePreMatchCount] = useState<number | null>(null);

  useEffect(() => {
    if (!showHelperProfileModal || !profilePreMatchEligible || !profileApp) {
      setProfilePreMatchCount(null);
      return;
    }
    let cancelled = false;
    remoteGetPreMatchClientCount(me.id, profileApp.jobId, profileApp.helperId)
      .then((c) => { if (!cancelled) setProfilePreMatchCount(c); })
      .catch(() => { if (!cancelled) setProfilePreMatchCount(null); });
    return () => { cancelled = true; };
  }, [showHelperProfileModal, profilePreMatchEligible, profileApp, me.id]);

  useEffect(() => {
    setHiddenJobIds(readHiddenJobIds(me.id));
  }, [me.id]);

  useEffect(() => {
    if (showCreditModal) setSelectedCreditPackage(2);
  }, [showCreditModal]);

  useEffect(() => {
    if (routerLocation.pathname === ROUTES.clientJobs) {
      setActiveSidebarTab('active-services');
    } else if (routerLocation.pathname === ROUTES.clientDashboard) {
      setActiveSidebarTab('dashboard');
    }
  }, [routerLocation.pathname]);

  useEffect(() => {
    const tab = (routerLocation.state as { tab?: string } | null)?.tab;
    if (tab === 'saved') setActiveSidebarTab('saved');
  }, [routerLocation.state]);

  useEffect(() => {
    const state = routerLocation.state as { openCreate?: boolean } | null;
    if (routerLocation.pathname === ROUTES.clientDashboard && state?.openCreate) {
      setShowCreateModal(true);
      navigate(ROUTES.clientDashboard, { replace: true, state: null });
    }
  }, [navigate, routerLocation.pathname, routerLocation.state]);

  useEffect(
    () => () => {
      if (successModalTimerRef.current) clearTimeout(successModalTimerRef.current);
    },
    [],
  );

  // Deep-link: ?request=UUID → auto-open the request detail sheet.
  // Notification click lands here with this param.
  useEffect(() => {
    const requestId = searchParams.get('request');
    if (!requestId || jobs.length === 0) return;
    const target = jobs.find((j) => j.id === requestId && j.clientId === me.id);
    if (!target) return;
    setDetailJob(target);
    // Remove the param so refreshing doesn't re-open the sheet
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('request');
      return next;
    }, { replace: true });
  }, [searchParams, jobs, me.id, setSearchParams]);

  useEffect(() => {
    const myJobIds = jobs.filter((j) => j.clientId === me.id).map((j) => j.id);
    const myApps = applications.filter(a => myJobIds.includes(a.jobId));
    
    if (myApps.length > previousAppCount && previousAppCount > 0) {
      const newApp = myApps[0]; // Assuming newest is first
      setToastNotification({
        message: t('client_toast.application_received', { name: newApp.helperName }),
        show: true,
      });
      setTimeout(() => setToastNotification({ message: '', show: false }), 4000);
    }
    setPreviousAppCount(myApps.length);
  }, [applications, jobs, previousAppCount, t]);

  const openHelperProfile = (
    helper: RecommendedHelperCard,
    applicationId?: string,
    requestId?: string | null,
  ) => {
    setSelectedHelper(helper);
    setSelectedApplicationId(applicationId ?? null);
    setProfileContextRequestId(requestId ?? null);
    setShowHelperProfileModal(true);
  };

  const toggleActivityPanel = (jobId: string, panel: 'applications' | 'description') => {
    setExpandedActivityPanel((current) => {
      const next =
        current?.jobId === jobId && current.panel === panel ? null : { jobId, panel };
      if (!next || next.panel !== 'applications') {
        setExpandedCandidateProfileKey(null);
      }
      return next;
    });
  };

  const toggleCandidateProfile = (jobId: string, applicationId: string) => {
    const key = candidateProfileExpandKey(jobId, applicationId);
    setExpandedCandidateProfileKey((current) => (current === key ? null : key));
  };

  const myOpenJobCategories = useMemo(
    () => [
      ...new Set(
        jobs
          .filter((j) => j.clientId === me.id && j.status === 'open' && isOfficialServiceCategoryId(j.category))
          .map((j) => j.category),
      ),
    ],
    [jobs, me.id],
  );
  const { helpers: nearbyHelpers, loading: nearbyHelpersLoading } = useNearbyHelpers({
    relatedCategoryIds: myOpenJobCategories,
    enabled: secondaryBlocksReady,
  });

  const clientJobs = useMemo(
    () => jobs.filter((j) => j.clientId === me.id),
    [jobs, me.id],
  );
  const activeClientJobs = useMemo(
    () =>
      clientJobs.filter(
        (j) =>
          isJobVisibleToClient(j, hiddenJobIds) &&
          (j.status === 'open' || j.status === 'paused' || j.status === 'in_progress'),
      ),
    [clientJobs, hiddenJobIds],
  );
  const completedClientJobs = useMemo(
    () => clientJobs.filter((j) => !isJobCancelled(j) && (hiddenJobIds.has(j.id) || j.status === 'completed' || isJobExpired(j))),
    [clientJobs, hiddenJobIds],
  );
  const activityTabJobs = jobsListTab === 'history' ? completedClientJobs : activeClientJobs;
  const progressiveActivityJobs = useProgressiveReveal(activityTabJobs, 3, 800);
  const clientApplicationCount = useMemo(
    () => applications.filter((app) => clientJobs.some((job) => job.id === app.jobId)).length,
    [applications, clientJobs],
  );
  const pendingApplicationsForClient = useMemo(
    () =>
      applications.filter(
        (app) =>
          (app.status === 'pending' || app.status === 'viewed') &&
          clientJobs.some((job) => job.id === app.jobId),
      ).length,
    [applications, clientJobs],
  );
  const clientUpcomingCount = useMemo(
    () => upcomingJobs.filter((uj) => clientJobs.some((job) => job.id === uj.jobId)).length,
    [upcomingJobs, clientJobs],
  );

  const handleConfirmPauseJob = async () => {
    if (!pauseTargetJobId || pausingJobId) return;
    setPausingJobId(pauseTargetJobId);
    try {
      await appDataActionsRef.current.updateJobStatus(pauseTargetJobId, 'paused');
      showToast('Chamado pausado.', 'success');
      setPauseTargetJobId(null);
    } catch (error) {
      console.error(error);
      showToast(formatRequestLifecycleError(error, t), 'error');
    } finally {
      setPausingJobId(null);
    }
  };

  const handleResumeJob = async (jobId: string) => {
    try {
      const outcome = await appDataActionsRef.current.updateJobStatus(jobId, 'open');
      if (outcome && 'expiredWhilePaused' in outcome && outcome.expiredWhilePaused) {
        showToast('Chamado cancelado porque a data prevista passou durante a pausa.', 'info');
      } else {
        showToast('Chamado retomado.', 'success');
      }
      setActivityMenuJobId(null);
    } catch (error) {
      console.error(error);
      showToast(formatRequestLifecycleError(error, t), 'error');
    }
  };

  const openHelperProfileFromApplication = (job: Job, app: Application) => {
    openHelperProfile(
      {
        id: app.helperId,
        name: app.helperName,
        avatar: app.helperAvatar,
        rating: app.helperRating,
        jobsCompleted: app.helperJobs,
        skills: [],
        isOnline: true,
      },
      app.id,
      job.id,
    );
  };

  useEffect(() => {
    if (!activityMenuJobId) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!activityMenuRef.current?.contains(event.target as Node)) {
        setActivityMenuJobId(null);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [activityMenuJobId]);

  const handleConfirmCancelJob = async () => {
    if (!cancelTargetJobId || cancellingJobId) return;
    const jobId = cancelTargetJobId;
    setCancellingJobId(jobId);
    try {
      await appDataActionsRef.current.updateJobStatus(jobId, 'cancelled');
      hideJobForUser(me.id, jobId);
      setHiddenJobIds((prev) => new Set(prev).add(jobId));
      showToast(t('client_dashboard.request_cancelled_toast'), 'success');
      setCancelTargetJobId(null);
    } catch (error) {
      console.error(error);
      showToast(formatRequestLifecycleError(error, t), 'error');
    } finally {
      setCancellingJobId(null);
    }
  };

  const handleRejectApplication = async (applicationId: string, isExclusive: boolean) => {
    try {
      await appDataActionsRef.current.updateApplicationStatus(applicationId, 'rejected');
      showToast(
        isExclusive
          ? t('client_dashboard.exclusive_reject_success_toast')
          : t('client_dashboard.reject_success_toast'),
        'success',
      );
    } catch (error) {
      console.error('[LinkHelp] reject application', error);
      showToast(formatRejectApplicationError(error, t), 'error');
    }
  };

  const openNearbyHelperProfile = (helper: NearbyHelperMapPoint) => {
    setSelectedHelper({
      id: helper.id,
      name: helper.name,
      avatar: helper.avatarUrl ?? avatarUrlForName(helper.name),
      rating: helper.rating ?? 4.5,
      skills: helper.skillIds,
      isOnline: helper.onlineStatus === 'available',
    });
    setSelectedApplicationId(null);
    setProfileContextRequestId(null);
    setShowHelperProfileModal(true);
  };

  const handleProfileMessageClick = async () => {
    const app = profileApp;
    if (!app) {
      showToast(t('helper_profile.chat_locked_hint'), 'info');
      return;
    }

    const unlocked = isChatUnlockedApplication(app);
    const preMatch = !unlocked && (app.status === 'pending' || app.status === 'viewed');

    if (!unlocked && !preMatch) {
      showToast(t('helper_profile.chat_locked_hint'), 'info');
      return;
    }

    if (preMatch && profilePreMatchCount !== null && profilePreMatchCount >= PRE_HIRE_MESSAGE_LIMIT) {
      showToast(t('helper_profile.pre_match_limit_reached'), 'info');
      return;
    }

    try {
      const convId = await ensureConversation({
        requestId: app.jobId,
        clientId: me.id,
        helperId: app.helperId,
        contactUnlocked: unlocked,
      });
      setShowHelperProfileModal(false);
      navigate(`${ROUTES.messages}?c=${convId}`);
    } catch (error) {
      console.error('[LinkHelp] profile message', error);
      showToast(t('helper_profile.chat_error'), 'error');
    }
  };

  const handleAcceptProposal = async (job: Job, app: Application) => {
    if (acceptingApplicationId) return;

    if (
      !canAcceptApplicationForJob({
        jobStatus: job.status,
        application: app,
        applications,
        acceptingApplicationId,
      })
    ) {
      showToast(
        isHireTeamComplete(job.id, applications)
          ? t('client_dashboard.hire_capacity_reached_toast')
          : t('client_dashboard.hire_unavailable_toast'),
        'error',
      );
      return;
    }

    const logContext = {
      requestId: job.id,
      applicationId: app.id,
      helperId: app.helperId,
      proposedAmount: app.proposedAmount ?? null,
    };
    console.log('[Accept proposal] requestId', logContext.requestId);
    console.log('[Accept proposal] applicationId', logContext.applicationId);
    console.log('[Accept proposal] helperId', logContext.helperId);
    console.log('[Accept proposal] proposedAmount', logContext.proposedAmount);

    setAcceptingApplicationId(app.id);

    const payload: OfficialHirePayload = {
      requestId: job.id,
      applicationId: app.id,
      helperId: app.helperId,
      proposedAmount: app.proposedAmount ?? null,
    };

    try {
      const conversationId = await appDataActionsRef.current.officiallyHireHelper(payload, '');
      showToast(t('client_dashboard.helper_hired_success_toast'), 'success');
      if (conversationId) {
        navigate(`${ROUTES.messages}?c=${conversationId}`);
      }
    } catch (error) {
      logAcceptProposalError(logContext, error);
      showToast(formatHireError(error, t), 'error');
    } finally {
      setAcceptingApplicationId(null);
    }
  };

  const handleOfficialHire = async () => {
    if (!profileApplicationId || !selectedHelper) {
      showToast(t('helper_profile.hire_no_application'), 'error');
      return;
    }
    const targetApp = applications.find((a) => a.id === profileApplicationId);
    if (!targetApp) {
      showToast(t('helper_profile.hire_no_application'), 'error');
      return;
    }
    try {
      const conversationId = await appDataActionsRef.current.officiallyHireHelper(
        {
          requestId: targetApp.jobId,
          applicationId: targetApp.id,
          helperId: targetApp.helperId,
          proposedAmount: targetApp.proposedAmount ?? null,
        },
        inviteMessage,
      );
      setShowHireModal(false);
      setInviteMessage('');
      setShowHelperProfileModal(false);
      showToast(t('hire_modal.success_hired_toast'), 'success');
      if (conversationId) {
        navigate(`${ROUTES.messages}?c=${conversationId}`);
      } else {
        navigate(ROUTES.messages);
      }
    } catch (error) {
      logAcceptProposalError(
        {
          requestId: targetApp.jobId,
          applicationId: targetApp.id,
          helperId: targetApp.helperId,
          proposedAmount: targetApp.proposedAmount ?? null,
        },
        error,
      );
      showToast(formatHireError(error, t), 'error');
    }
  };

  const openCreateModal = (categoryId = '', subcategoryId = '') => {
    setCreateInitialCategory(categoryId);
    setCreateInitialSubcategory(subcategoryId);
    setShowCreateModal(true);
  };

  const handleClientOnboardingComplete = async (action: 'explore' | 'createRequest') => {
    try {
      const result = await completeClientOnboarding(action);
      if (result?.granted) {
        showToast(t('client_onboarding.success_toast', { amount: CLIENT_WELCOME_30_LC }), 'success');
      }
      if (action === 'createRequest') {
        openCreateModal();
      }
    } catch (error) {
      showToast(extractErrorMessage(error), 'error');
    }
  };

  return (
    <div className="relative w-full min-w-0" data-lh-dashboard-mounted="client">
      <ClientAwaitingCompletionBridge clientId={me.id} onAwaitingIds={handleAwaitingCompletionIds} />
      {activeSidebarTab === 'dashboard' ? (
        <div className="pointer-events-none absolute right-3 top-3 z-[2] sm:right-5 sm:top-4">
          <div className="pointer-events-auto hidden">
            <ClientCreditsWalletBadge
              balance={clientCreditsBalance}
              loading={creditsLoading}
              t={t}
            />
          </div>
        </div>
      ) : null}

      {/* Hero — fora de qualquer container com padding para ser verdadeiramente full-width.
          Dinâmica: gamification.heroKey é a única fonte da verdade. */}
      {activeSidebarTab === 'dashboard' && (
        <ClientDashboardHeroSlot
          gamification={clientGamification.record}
          gamificationLoading={clientGamification.loading}
          gamificationError={clientGamification.error}
          avatarUrl={me.avatar}
          balance={clientCreditsBalance}
        />
      )}
      {activeSidebarTab === 'dashboard' && (
        <section className="relative z-0 isolate hidden min-h-[410px] overflow-hidden bg-[#F5F7FB] sm:min-h-[440px]">
          <div className="absolute inset-y-0 right-[-4%] w-[85%] overflow-hidden">
            <img
              src={BRAND.clientHomeHero}
              alt=""
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="h-[120%] w-full object-cover object-[center_50%] saturate-[1.08] contrast-[1.02]"
            />
            <div className="absolute inset-y-0 left-0 w-[45%] bg-[linear-gradient(90deg,#F5F7FB_0%,rgba(245,247,251,0.85)_40%,transparent_100%)]" />
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-[linear-gradient(180deg,transparent,#F5F7FB_90%)]" />
          <div className="relative z-[1] flex min-h-[410px] max-w-[58%] flex-col justify-between px-8 py-7 sm:min-h-[440px] sm:max-w-[50%] sm:px-10 sm:py-9">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-xs font-black text-[#2563FF] shadow-[0_10px_26px_rgba(37,99,255,0.13)] ring-1 ring-blue-100/80 backdrop-blur-xl">
                <Icons.Sparkles className="h-3.5 w-3.5" />
                {t('client_dashboard.hero_eyebrow')}
              </span>
              <h2 className="mt-5 max-w-[18rem] text-[33px] font-black leading-[0.96] tracking-tight text-[#0B1220] sm:text-5xl">
                {t('client_dashboard.hero_title')} <span className="text-[#2563FF] drop-shadow-[0_0_18px_rgba(37,99,255,0.24)]">{t('client_dashboard.hero_title_highlight')}</span>
              </h2>
              <p className="mt-4 max-w-[15.5rem] text-[15px] font-semibold leading-7 text-[#0B1220] [text-shadow:0_0_3px_rgba(255,255,255,0.9),0_0_8px_rgba(255,255,255,0.7)]">
                {t('client_dashboard.hero_subtitle')}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-2 text-[11px] font-black text-[#0B4A6F] shadow-sm ring-1 ring-blue-100/80 backdrop-blur-xl">
                  <Icons.ShieldCheck className="h-3.5 w-3.5 text-[#2563FF]" />
                  {t('client_dashboard.hero_badge_safe')}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-2 text-[11px] font-black text-[#0B4A6F] shadow-sm ring-1 ring-blue-100/80 backdrop-blur-xl">
                  <Icons.Clock3 className="h-3.5 w-3.5 text-[#2563FF]" />
                  {t('client_dashboard.hero_badge_fast')}
                </span>
              </div>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="inline-flex min-h-[58px] w-full max-w-[245px] items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#3B82F6_0%,#2563FF_45%,#1D4ED8_100%)] px-5 text-sm font-black text-white shadow-[0_18px_48px_rgba(37,99,255,0.45),inset_0_1px_0_rgba(255,255,255,0.22)] ring-1 ring-blue-400/20 transition hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(37,99,255,0.55)] active:scale-[0.98] sm:text-base"
              >
                <Plus className="h-5 w-5 opacity-80" />
                {t('client_dashboard.hero_cta')}
              </button>
            </div>
          </div>
        </section>
      )}

    <AppPageShell wide className="relative z-10 min-w-0 overflow-x-hidden">
      {/* Toast Notification */}
      {toastNotification.show && (
        <div className="fixed top-20 right-4 z-[100] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className="w-[calc(100vw-2rem)] max-w-80 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg border border-gray-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{toastNotification.message}</p>
              <p className="text-xs text-gray-400">{t('common.check_orders')}</p>
            </div>
            <button onClick={() => setToastNotification({message: '', show: false})} className="text-gray-400 hover:text-white transition-colors">
              <Icons.X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Job detail sheet ─────────────────────────────────────────── */}
      {detailJob && (() => {
        const sheetApps = applications
          .filter((a) => a.jobId === detailJob.id && (a.status === 'pending' || a.status === 'viewed' || a.status === 'accepted'))
          .filter((a) => detailJob.status === 'in_progress' ? a.status === 'accepted' : a.status !== 'rejected')
          .sort((a, b) => a.createdAt - b.createdAt);
        const sheetExclusiveApp = detailJob.exclusiveHelperId
          ? sheetApps.find((a) => a.helperId === detailJob.exclusiveHelperId && a.isExclusive)
          : null;
        const sheetIsExclusive = sheetExclusiveApp != null;
        const sheetDisplayApps = sheetIsExclusive ? [sheetExclusiveApp] : sheetApps.slice(0, 3);
        const sheetBudgetRange = formatClientBudgetRangeLabel(detailJob, t);
        const sheetTheme = getCategoryFeedTheme(detailJob.category);
        const SheetCategoryIcon = getCategoryLucideIcon(detailJob.category) ?? Icons.Briefcase;
        return (
          <div className="fixed inset-0 z-[200] flex flex-col justify-end sm:justify-center sm:items-center">
            {/* backdrop */}
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDetailJob(null)} />
            {/* sheet */}
            <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden">
              {/* handle bar */}
              <div className="shrink-0 flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>
              {/* header */}
              <div className="shrink-0 flex items-start gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
                <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: sheetTheme.iconBg }}>
                  <SheetCategoryIcon className="w-5 h-5" style={{ color: sheetTheme.iconColor }} />
                </div>
                <div className="min-w-0 flex-1">
                  {sheetIsExclusive && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 mb-1">
                      👑 {t('client_dashboard.exclusive_application_badge')}
                    </span>
                  )}
                  <h2 className="font-bold text-slate-950 text-base leading-snug line-clamp-2">
                    {translateJobTitle(detailJob.title, detailJob.category, detailJob.subcategory, t)}
                  </h2>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <Icons.MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{detailJob.address || detailJob.city || detailJob.location}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailJob(null)}
                  className="shrink-0 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                >
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>
              {/* scrollable content */}
              <div className="overflow-y-auto overscroll-contain flex-1 px-5 py-4 space-y-3">
                {sheetDisplayApps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                    <Icons.Users className="w-8 h-8" />
                    <p className="text-sm font-medium">{t('client_dashboard.candidates_count_zero')}</p>
                  </div>
                ) : sheetDisplayApps.map((app) => app && (
                  <div key={app.id} className="space-y-2">
                    <ClientCandidateCard
                      job={detailJob}
                      app={app}
                      t={t}
                      formatMoneyAmount={formatMoneyAmount}
                      profileExpanded={
                        expandedCandidateProfileKey === candidateProfileExpandKey(detailJob.id, app.id)
                      }
                      onToggleProfile={() => toggleCandidateProfile(detailJob.id, app.id)}
                      showAccept={app.status === 'pending' || app.status === 'viewed'}
                      showReject={app.status === 'pending' || app.status === 'viewed'}
                      accepting={acceptingApplicationId === app.id}
                      onAccept={() => void handleAcceptProposal(detailJob, app)}
                      onReject={() => void handleRejectApplication(app.id, app.isExclusive === true)}
                      budgetRangeLabel={sheetBudgetRange}
                    />
                    {app.status !== 'pending' && app.status !== 'viewed' ? (
                      <div className="space-y-1.5">
                        {(app.status === 'accepted' || app.status === 'completed') &&
                        detailJob.status === 'in_progress' ? (
                          <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800">
                            <Icons.CheckCircle2 className="h-3.5 w-3.5" />
                            {t('messages_page.service_confirmed_badge')}
                          </span>
                        ) : null}
                        {app.chatUnlocked ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDetailJob(null);
                              navigate(ROUTES.messages);
                            }}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                          >
                            <Icons.MessageSquare className="h-3.5 w-3.5" />
                            {t('client_dashboard.open_chat_with', { name: app.helperName.split(' ')[0] })}
                          </button>
                        ) : (
                          <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-400 opacity-70">
                            <Icons.MessageSquare className="h-3.5 w-3.5" />
                            {t('client_dashboard.chat_locked_until_accept')}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              {/* sheet footer */}
              <div className="shrink-0 border-t border-slate-100 px-5 py-4 space-y-2">
                {jobsAwaitingServiceConfirm.some((j) => j.id === detailJob.id) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailJob(null);
                        setServiceConfirmJob(detailJob);
                      }}
                      className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                      {t('service_confirm.confirm_completion')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleReportServiceProblem(detailJob);
                        setDetailJob(null);
                      }}
                      className="w-full rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100"
                    >
                      {t('service_confirm.report_problem')}
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => setDetailJob(null)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <CancelRequestModal
        open={cancelTargetJobId != null}
        onClose={() => {
          if (!cancellingJobId) setCancelTargetJobId(null);
        }}
        onConfirm={() => void handleConfirmCancelJob()}
        confirming={cancellingJobId != null}
      />

      <PauseRequestModal
        open={pauseTargetJobId != null}
        onClose={() => {
          if (!pausingJobId) setPauseTargetJobId(null);
        }}
        onConfirm={() => void handleConfirmPauseJob()}
        confirming={pausingJobId != null}
      />

      <ServiceConfirmModal
        open={serviceConfirmJob != null}
        job={serviceConfirmJob}
        busy={serviceConfirmBusy}
        onConfirm={() => void handleConfirmServiceCompleted()}
        onDismiss={() => serviceConfirmJob && dismissServiceConfirm(serviceConfirmJob)}
        onReportProblem={() => serviceConfirmJob && void handleReportServiceProblem(serviceConfirmJob)}
        t={t}
      />

      {/* Credits Modal */}
      {UI_VISIBILITY.clientCredits && showCreditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => !isProcessingPayment && setShowCreditModal(false)}>
          <div className="bg-white rounded-[2rem] w-full max-w-5xl shadow-[0_0_50px_rgba(0,0,0,0.28)] overflow-hidden flex flex-col lg:flex-row relative max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
             <div className="w-full lg:w-[42%] bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-100 p-8 flex flex-col justify-center overflow-y-auto">
               <div className="w-16 h-16 bg-blue-100/60 rounded-2xl flex items-center justify-center mb-6">
                 <Icons.Zap className="w-8 h-8 text-blue-600" />
               </div>
               <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 tracking-tight">{t('link_credits.client_intro_title')}</h3>
               <p className="text-sm text-slate-600 font-medium mb-6 leading-relaxed">{t('link_credits.client_intro_sub')}</p>
               <div className="space-y-4 mb-6">
                 <div className="flex items-center gap-3">
                   <Icons.Star className="w-5 h-5 text-amber-500 shrink-0" />
                   <span className="text-sm font-semibold text-slate-800">{t('link_credits.client_benefit_highlight')}</span>
                 </div>
                 <div className="flex items-center gap-3">
                   <Icons.ArrowUpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                   <span className="text-sm font-semibold text-slate-800">{t('link_credits.client_benefit_feed')}</span>
                 </div>
                 <div className="flex items-center gap-3">
                   <Icons.RefreshCw className="w-5 h-5 text-slate-600 shrink-0" />
                   <span className="text-sm font-semibold text-slate-800">{t('link_credits.client_benefit_repost')}</span>
                 </div>
                 <div className="flex items-center gap-3">
                   <Icons.Heart className="w-5 h-5 text-rose-500 shrink-0" />
                   <span className="text-sm font-semibold text-slate-800">{t('link_credits.client_benefit_tip')}</span>
                 </div>
               </div>
               <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">{t('link_credits.helper_uses_title')}</p>
               <ul className="text-sm text-slate-700 space-y-2 font-medium mb-6">
                 <li className="flex gap-2"><Icons.Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />{t('link_credits.helper_use_boost')}</li>
                 <li className="flex gap-2"><Icons.Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />{t('link_credits.helper_use_spotlight')}</li>
                 <li className="flex gap-2"><Icons.Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />{t('link_credits.helper_use_radar')}</li>
               </ul>
               <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 leading-relaxed">
                 <p className="font-bold text-slate-900 mb-1">{t('link_credits.credits_never_for_title')}</p>
                 <p>{t('link_credits.credits_never_for_body')}</p>
               </div>
               <p className="text-xs text-slate-500 mt-4 leading-relaxed">{t('link_credits.welcome_bonus_helper')}</p>
               <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t('link_credits.welcome_bonus_client')}</p>
             </div>

             <div className="w-full lg:w-[58%] p-4 sm:p-10 bg-white relative overflow-y-auto">
               <button onClick={() => !isProcessingPayment && setShowCreditModal(false)} className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors z-10" disabled={isProcessingPayment}>
                 <Icons.X className="w-5 h-5" />
               </button>
               <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-6 pr-10">{t('link_credits.choose_package')}</h2>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div onClick={() => !isProcessingPayment && setSelectedCreditPackage(1)} className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all ${selectedCreditPackage === 1 ? 'border-blue-500 bg-blue-50/30 shadow-md' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                   <div className="flex justify-between items-start mb-3">
                     <Icons.Coins className="w-8 h-8 text-slate-500" />
                     {selectedCreditPackage === 1 && <Icons.CheckCircle2 className="w-6 h-6 text-blue-500" />}
                   </div>
                   <div className="text-slate-500 font-bold text-sm mb-1">{t('link_credits.credits_count', { count: 10 })}</div>
                   <div className="text-xl sm:text-2xl font-black text-slate-900">{t('link_credits.package_10_price')}</div>
                 </div>
                 <div onClick={() => !isProcessingPayment && setSelectedCreditPackage(2)} className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all ${selectedCreditPackage === 2 ? 'border-blue-600 bg-blue-50/40 shadow-md' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                   <div className="absolute top-0 right-3 rounded-b-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-wide px-3 py-1 shadow-sm">{t('link_credits.popular_badge')}</div>
                   <div className="flex justify-between items-start mb-3 mt-4">
                     <Icons.Coins className="w-8 h-8 text-blue-600" />
                     {selectedCreditPackage === 2 && <Icons.CheckCircle2 className="w-6 h-6 text-blue-600" />}
                   </div>
                   <div className="text-slate-600 font-bold text-sm mb-1">{t('link_credits.credits_count', { count: 50 })}</div>
                   <div className="text-xl sm:text-2xl font-black text-slate-900">{t('link_credits.package_50_price')}</div>
                 </div>
                 <div onClick={() => !isProcessingPayment && setSelectedCreditPackage(3)} className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all ${selectedCreditPackage === 3 ? 'border-violet-500 bg-violet-50/40 shadow-md' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                   <div className="absolute top-0 right-3 rounded-b-lg bg-violet-600 text-white text-[10px] font-black uppercase tracking-wide px-3 py-1 shadow-sm">{t('link_credits.best_value_badge')}</div>
                   <div className="flex justify-between items-start mb-3 mt-4">
                     <Icons.Zap className="w-8 h-8 text-violet-600" />
                     {selectedCreditPackage === 3 && <Icons.CheckCircle2 className="w-6 h-6 text-violet-600" />}
                   </div>
                   <div className="text-slate-600 font-bold text-sm mb-1">{t('link_credits.credits_count', { count: 120 })}</div>
                   <div className="text-xl sm:text-2xl font-black text-slate-900">{t('link_credits.package_120_price')}</div>
                 </div>
               </div>
               <div className="mt-8">
                 <button 
                   onClick={() => processPayment()}
                   disabled={!selectedCreditPackage || isProcessingPayment}
                   className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 min-h-[52px] ${!selectedCreditPackage ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-black text-white shadow-lg'}`}
                 >
                   {isProcessingPayment ? (
                     <><Icons.Loader2 className="w-5 h-5 animate-spin" /> {t('link_credits.processing_payment')}</>
                   ) : (
                     <><Icons.CreditCard className="w-5 h-5" /> {t('link_credits.buy_secure')}</>
                   )}
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div
          role="presentation"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300"
          onClick={dismissSuccessModal}
        >
           <div
             role="dialog"
             aria-modal="true"
             className="bg-gray-900 border border-gray-800 rounded-[2rem] w-full max-w-sm p-10 text-center relative overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.2)] animate-in zoom-in-95 duration-500"
             onClick={(e) => e.stopPropagation()}
           >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none"></div>
              
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-green-500/30 mb-8 relative z-10">
                 <Icons.Check className="w-12 h-12 text-white" strokeWidth={3} />
              </div>
              
              <h2 className="text-3xl font-black text-white mb-3 relative z-10 tracking-tight">{t('client_dashboard.success_modal_title')}</h2>
              <p className="text-gray-400 font-medium relative z-10 leading-relaxed text-sm mb-8">
                 {t('client_dashboard.success_modal_body')}
              </p>
              <button
                type="button"
                onClick={dismissSuccessModal}
                className="relative z-10 w-full py-3.5 rounded-xl font-bold bg-white text-gray-900 hover:bg-gray-100 transition-colors"
              >
                {t('client_dashboard.success_modal_close')}
              </button>
           </div>
        </div>
      )}

      <UserProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        avatarUrl={me.avatar}
      />

      <ClientOnboardingCarousel
        open={showClientOnboarding}
        completing={completingClientOnboarding}
        t={t}
        onComplete={handleClientOnboardingComplete}
      />

      <CreateRequestModal
        open={showCreateModal}
        initialCategory={createInitialCategory}
        initialSubcategory={createInitialSubcategory}
        onClose={() => {
          setShowCreateModal(false);
          setCreateInitialCategory('');
          setCreateInitialSubcategory('');
        }}
        onPublished={() => {
          setToastNotification({ message: t('client_toast.request_created'), show: true });
          setTimeout(() => setToastNotification({ message: '', show: false }), 4000);
        }}
      />

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-[var(--lh-gutter)] justify-center min-w-0 w-full max-w-full px-0 sm:px-4 md:px-0">
        
        {/* Left Sidebar */}
        <aside className="hidden">
          <div className="sticky top-24 space-y-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <button onClick={() => setShowProfileModal(true)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-slate-50">
              <img src={me.avatar} alt="" className="h-11 w-11 rounded-2xl object-cover ring-1 ring-slate-100" />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{me.name}</p>
                <p className="truncate text-xs font-bold text-blue-600">{t('client_shell.view_profile')}</p>
              </div>
            </button>
            <nav className="space-y-1 border-t border-slate-100 pt-3">
              {[
                { id: 'dashboard' as const, label: t('sidebar.dashboard'), icon: Icons.Home, action: () => { navigate(ROUTES.clientDashboard); setActiveSidebarTab('dashboard'); } },
                { id: 'messages' as const, label: t('messages_page.title'), icon: Icons.MessageCircle, action: () => navigate(ROUTES.messages) },
                { id: 'active-services' as const, label: t('sidebar.active_services'), icon: Icons.Briefcase, action: () => { navigate(ROUTES.clientJobs); setActiveSidebarTab('active-services'); } },
                { id: 'profile' as const, label: t('nav.profile_menu_profile'), icon: Icons.UserRound, action: () => navigate(ROUTES.profile) },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeSidebarTab === item.id || (item.id === 'messages' && routerLocation.pathname === ROUTES.messages);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.action}
                    className={`flex min-h-[44px] w-full items-center gap-3 rounded-2xl px-3 text-sm font-black transition-colors ${
                      active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="w-full min-w-0">
          <div className="hidden">
            <div className="flex gap-2 overflow-x-auto md:overflow-visible hide-scrollbar">
              {[
                { id: 'dashboard' as const, label: t('sidebar.dashboard'), icon: Icons.Grid, to: ROUTES.clientDashboard },
                { id: 'my-helpers' as const, label: t('sidebar.my_helpers'), icon: Icons.Users, to: ROUTES.clientDashboard },
                { id: 'active-services' as const, label: t('sidebar.active_services'), icon: Icons.Briefcase, to: ROUTES.clientJobs },
                { id: 'saved' as const, label: t('sidebar.saved'), icon: Icons.Bookmark, to: ROUTES.clientDashboard },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeSidebarTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    aria-label={item.label}
                    onClick={() => {
                      navigate(item.to);
                      setActiveSidebarTab(item.id);
                    }}
                    className={`group relative inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 md:h-12 md:w-12 md:gap-0 md:rounded-2xl md:px-0 ${
                      active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                  >
                    <Icon className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="sr-only">{item.label}</span>
                    <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-white opacity-0 shadow-lg transition-opacity md:block md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
                      {item.label}
                    </span>
                  </button>
                );
              })}
              
            </div>
          </div>

        {/* Main Feed */}
        {activeSidebarTab === 'dashboard' && (
          <div className="mx-auto w-full max-w-[680px] animate-in fade-in duration-300 md:max-w-6xl">
            <section className="relative bg-[#F5F7FB] px-0 pb-24 pt-0 sm:px-0 md:px-0">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_5%,rgba(37,99,255,0.12),transparent_28%),radial-gradient(circle_at_86%_20%,rgba(59,130,246,0.10),transparent_28%)]" />
              <div className="relative space-y-7">
                <AppHomeClientQuickStrip
                  activeJobsCount={activeClientJobs.length}
                  pendingApplicationsCount={pendingApplicationsForClient}
                  upcomingServicesCount={clientUpcomingCount}
                  creditsBalance={clientCreditsBalance}
                  creditsLoading={creditsLoading}
                  onOpenActiveServices={() => setActiveSidebarTab('active-services')}
                  onOpenMessages={() => navigate(ROUTES.messages)}
                  onCreateRequest={() => openCreateModal()}
                />

                <section className="px-4 sm:px-6 md:px-8">
                  <GamificationProgressCard userType="client" />
                </section>

                <section className="px-4 sm:px-6 md:px-8">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-black tracking-tight text-[#0B1220]">
                      {t('app_home.client_active_preview_title')}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveSidebarTab('active-services')}
                      className={clsx('inline-flex items-center gap-1 text-sm font-black', clientDashboardAccent.actionLink)}
                    >
                      {t('app_home.client_active_preview_cta')}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {activeClientJobs.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-500">
                        {t('app_home.client_active_preview_empty')}
                      </p>
                    ) : (
                      activeClientJobs.slice(0, 3).map((job) => (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => {
                            setActiveSidebarTab('active-services');
                            setDetailJob(job);
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left shadow-sm transition hover:border-blue-100"
                        >
                          <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', clientDashboardAccent.activitySoftBg, clientDashboardAccent.activityText)}>
                            <Icons.Briefcase className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate whitespace-nowrap text-sm font-black text-[#0B1220]">
                              {translateJobTitle(job.title, job.category, job.subcategory, t)}
                            </p>
                            <p className="truncate whitespace-nowrap text-xs font-semibold text-slate-500">
                              {formatJobBudgetDisplay(job, t)}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                        </button>
                      ))
                    )}
                  </div>
                </section>

                <section className="relative" style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
                  <div className="mb-4 flex items-center justify-between gap-3 px-4 sm:px-6 md:px-8">
                    <h2 className="text-lg font-black tracking-tight text-[#0B1220]">{t('client_dashboard.popular_categories_title')}</h2>
                    <button type="button" onClick={() => openCreateModal()} className={clsx('inline-flex items-center gap-1 text-sm font-black', clientDashboardAccent.actionLink)}>
                      {t('client_dashboard.view_all_categories')} <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="overflow-x-auto pb-2 [scrollbar-width:none] [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden">
                    <div className="flex min-w-max gap-3 px-4 sm:px-6 md:px-8">
                    {SERVICE_CATEGORIES.slice(0, 8).map((cat, index) => {
                      const IconComponent = getCategoryLucideIcon(cat.icon);
                      const palette = clientDashboardAccent.categoryIcon;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => openCreateModal(cat.id)}
                          className={clsx('group min-h-[132px] w-[128px] shrink-0 rounded-[1.55rem] border border-white bg-white/92 p-4 text-center shadow-[0_12px_32px_rgba(15,23,42,0.055)] ring-1 ring-slate-100/70 backdrop-blur transition hover:-translate-y-0.5 [scroll-snap-align:start] sm:w-[150px]', clientDashboardAccent.categoryHover)}
                        >
                          <span className={clsx('mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] shadow-lg transition group-hover:scale-105', palette)}>
                            <IconComponent className="h-7 w-7" />
                          </span>
                          <span className="mt-3 block text-sm font-black text-[#0B1220]">{t('categories.' + cat.id)}</span>
                          <span className="mt-1 block text-xs font-semibold text-[#64748B]">{t('client_dashboard.category_order_count', { count: 120 - index * 9 })}</span>
                        </button>
                      );
                    })}
                    </div>
                  </div>
                </section>

                <section className="relative mx-4 mt-2 overflow-visible sm:mx-6 md:mx-8">
                  {/* Max Quebec (thumbs-up) à esquerda + dica rápida à direita, atrás da barra */}
                  <div className="relative z-0 mb-[-1.35rem] h-[11.5rem] overflow-visible sm:mb-[-1.6rem] sm:h-[17.5rem]">
                    <div
                      className="pointer-events-none absolute bottom-0 left-0 z-0 flex h-[11.5rem] w-[9.5rem] items-end justify-start overflow-hidden sm:h-[17.5rem] sm:w-[16.75rem]"
                      aria-hidden="true"
                    >
                      <img
                        src="/assets/characters/max-quebec/thumbs-up-bust.png"
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-[11.5rem] w-auto max-w-none select-none object-contain object-bottom sm:h-[17.5rem]"
                      />
                    </div>
                    <div className="absolute bottom-[3.5rem] left-[8.85rem] right-0 z-[1] sm:bottom-[4.25rem] sm:left-[16.1rem]">
                      <div className="relative w-full rounded-[1.75rem] border border-slate-200/90 bg-white px-4 py-3.5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] sm:rounded-[2rem] sm:px-5 sm:py-4">
                        <span
                          className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-slate-200/90 bg-white"
                          aria-hidden="true"
                        />
                        <p className={clsx('text-[10px] font-black uppercase tracking-[0.14em]', clientDashboardAccent.activityText)}>
                          {t('client_dashboard.max_tip_label')}
                        </p>
                        <p className="mt-2 font-display text-[clamp(0.72rem,3.45vw,0.95rem)] font-extrabold leading-[1.4] tracking-tight text-slate-900 sm:text-[1.1rem] sm:leading-[1.4]">
                          {t('client_dashboard.max_tip_body')
                            .split('\n')
                            .map((line) => (
                              <span key={line} className="block whitespace-nowrap">
                                {line}
                              </span>
                            ))}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className={clsx('relative z-10 grid grid-cols-3 overflow-hidden rounded-2xl border', clientDashboardAccent.trustPanel)}>
                    {[
                      { icon: Icons.ShieldCheck, title: t('client_dashboard.trust_safe_title'), body: t('client_dashboard.trust_safe_body') },
                      { icon: Icons.Zap, title: t('client_dashboard.trust_chat_title'), body: t('client_dashboard.trust_chat_body') },
                      { icon: Icons.LockKeyhole, title: t('client_dashboard.trust_quality_title'), body: t('client_dashboard.trust_quality_body') },
                    ].map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <article key={item.title} className={clsx('flex min-w-0 flex-col items-center gap-1 px-1 py-3 text-center sm:py-4', index > 0 && 'border-l', index > 0 && clientDashboardAccent.trustDivider)}>
                          <Icon className={clsx('h-6 w-6 sm:h-7 sm:w-7', clientDashboardAccent.trustIcon)} strokeWidth={2.2} />
                          <span className="mt-0.5 block text-[11px] font-black text-white sm:text-sm">{item.title}</span>
                          <span className="hidden text-[10px] font-medium text-white/55 min-[390px]:block sm:text-xs">{item.body}</span>
                        </article>
                      );
                    })}
                  </div>
                </section>

              </div>
            </section>
          </div>
        )}
        {/* My Helpers Tab */}
        {activeSidebarTab === 'my-helpers' && (
          <div className="w-full max-w-[680px] mx-auto animate-in fade-in duration-300">
            <LhCard className="mb-6 overflow-hidden">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('client_helpers.favorites_title')}</h2>
              <p className="text-gray-500 mb-6">{t('client_helpers.favorites_sub')}</p>
              
              <div className="space-y-4">
                {RECOMMENDED_HELPERS.length === 0 ? (
                  <p className="text-sm text-slate-500 font-medium py-8 text-center border border-dashed border-slate-200 rounded-2xl">
                    {t('client_helpers.favorites_empty')}
                  </p>
                ) : null}
                {RECOMMENDED_HELPERS.slice(0, 3).map((helper, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl hover:border-gray-200 hover:shadow-sm transition-all group">
                    <div className="relative">
                      <img src={helper.avatar} alt="Helper" className="w-14 h-14 rounded-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 flex flex-wrap items-center gap-2">
                        {helper.name} <Icons.CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                      </h4>
                      <p className="text-sm text-gray-500 mb-1">
                        {t('client_helpers.last_service', {
                          skill: skillChip(helper.skills[0]),
                          when: t('client_helpers.days_ago', { count: 2 }),
                        })}
                      </p>
                      <div className="flex items-center gap-1 text-xs font-bold text-yellow-600">
                        <Icons.Star className="w-3.5 h-3.5 fill-yellow-500" /> {helper.rating.toFixed(1)} (24 reviews)
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                       <button
                         onClick={() => {
                           setSelectedHelper(helper);
                           setHireModalKind('hire');
                           setShowHireModal(true);
                         }}
                         className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
                       >
                         {t('client_helpers.hire_again')}
                       </button>
                       <button
                         type="button"
                         onClick={() => {
                           if (isHelperChatUnlocked(helper.id)) {
                             navigate(ROUTES.messages);
                             return;
                           }
                           showToast(t('helper_profile.chat_locked_hint'), 'info');
                         }}
                         className={`px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                           isHelperChatUnlocked(helper.id)
                             ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                             : 'cursor-not-allowed bg-gray-50 text-gray-400 opacity-70'
                         }`}
                       >
                         <Icons.MessageSquare className="w-4 h-4" /> {t('client_helpers.chat')}
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            </LhCard>
          </div>
        )}

        {/* Active Services Tab */}
        {activeSidebarTab === 'active-services' && (
          <div className="w-full animate-in fade-in duration-300">
            {isClientJobsPage ? <DesktopBackButton className="mb-4" /> : null}
            <LhCard className="mb-6 overflow-hidden rounded-[2rem] border border-slate-100 bg-white/95 p-5 shadow-[0_18px_54px_rgba(15,23,42,0.08)] sm:p-7">
              <div className="relative mb-6 px-10 text-center">
                <CloseToHomeButton className="absolute right-0 top-0" />
                <h2 className="flex w-full items-center justify-center gap-2 whitespace-nowrap text-2xl font-black tracking-tight text-slate-950 sm:text-3xl md:text-4xl">
                  {t('mobile_nav.activities')}
                  <Icons.Sparkles className={clsx('h-5 w-5 shrink-0 sm:h-6 sm:w-6', clientDashboardAccent.activityText)} />
                </h2>
                <p className="mt-3 w-full text-center text-[11px] font-medium leading-snug text-slate-500 sm:text-sm md:text-base">
                  {t('client_dashboard.active_services_intro')
                    .split('\n')
                    .map((line) => (
                      <span key={line} className="block whitespace-nowrap sm:inline sm:whitespace-normal">
                        {line}
                        <span className="hidden sm:inline"> </span>
                      </span>
                    ))}
                </p>
              </div>

              {completionReminderJobs.length > 0 ? (
                <div className="mb-4">
                  <CompletionReminderCard
                    title={t('completion_reminder.title')}
                    body={t('completion_reminder.body')}
                    actionLabel={t('completion_reminder.action')}
                    onAction={() => setServiceConfirmJob(completionReminderJobs[0])}
                  />
                </div>
              ) : null}

              {!CLIENT_LINKCREDITS_ENABLED ? (
                <div className={clsx('mb-4 rounded-2xl border px-4 py-3 text-xs font-semibold leading-relaxed text-slate-600', clientDashboardAccent.activitySoftBg, clientDashboardAccent.activitySoftBorder)}>
                  <p>{t('client_linkcredits.launch_promo')}</p>
                  <p className="mt-1 text-slate-500">{t('client_linkcredits.after_promo')}</p>
                </div>
              ) : null}

              <div className="mb-5 grid grid-cols-2 gap-2 rounded-[1.35rem] bg-slate-50 p-1.5 shadow-inner shadow-slate-200/50">
                <button
                  type="button"
                  onClick={() => setJobsListTab('active')}
                  className={clsx(
                    'inline-flex min-h-[54px] items-center justify-center gap-2 rounded-[1rem] px-3 text-sm font-black transition-all',
                    jobsListTab === 'active'
                      ? clsx('text-white shadow-lg', clientDashboardAccent.activityGradient)
                      : 'bg-white text-slate-600 shadow-sm hover:text-slate-900',
                  )}
                >
                  {t('client_jobs.tab_active')}
                  <span className={clsx('inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-black', jobsListTab === 'active' ? clientDashboardAccent.activityTabBadge : 'bg-slate-100 text-slate-500')}>
                    {activeClientJobs.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setJobsListTab('history')}
                  className={clsx(
                    'inline-flex min-h-[54px] items-center justify-center gap-2 rounded-[1rem] px-3 text-sm font-black transition-all',
                    jobsListTab === 'history'
                      ? clsx('text-white shadow-lg', clientDashboardAccent.activityGradient)
                      : 'bg-white text-slate-600 shadow-sm hover:text-slate-900',
                  )}
                >
                  {t('client_jobs.tab_history')}
                  <span className={clsx('inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-black', jobsListTab === 'history' ? clientDashboardAccent.activityTabBadge : 'bg-slate-100 text-slate-500')}>
                    {completedClientJobs.length}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {activityTabJobs.length > 0 ? (
                  progressiveActivityJobs.map((job) => {
                    const isHiredActivity = isHiredActivityJob(job.status);
                    const isPreHireActivity = isPreHireActivityJob(job.status);
                    const candidateApps = isPreHireActivity
                      ? listCandidateApplicationsForJob(job.id, applications)
                      : [];
                    const hiredApplication = isHiredActivity
                      ? findHiredApplicationForJob(job, applications, upcomingJobs)
                      : undefined;
                    const displayCandidateApps = candidateApps.slice(0, 3);
                    const exclusiveApp = job.exclusiveHelperId
                      ? applications.find(
                          (a) =>
                            a.jobId === job.id &&
                            a.helperId === job.exclusiveHelperId &&
                            a.isExclusive &&
                            (a.status === 'pending' || a.status === 'viewed'),
                        )
                      : null;
                    const isExclusiveLocked = exclusiveApp != null;
                    const CategoryIcon = getCategoryLucideIcon(job.category) ?? Icons.Briefcase;
                    const createdAtLabel = new Date(job.createdAt).toLocaleString(undefined, {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const isActivityPanelOpen = expandedActivityPanel?.jobId === job.id;
                    const isApplicationsOpen =
                      isActivityPanelOpen && expandedActivityPanel?.panel === 'applications';
                    const isDescriptionOpen =
                      isActivityPanelOpen && expandedActivityPanel?.panel === 'description';
                    const canLifecyclePauseResume =
                      lifecycleControlsEnabled && (job.status === 'open' || job.status === 'paused');
                    const canLifecycleCancel = lifecycleControlsEnabled;
                    const canCompleteFromMenu =
                      job.status === 'in_progress' &&
                      applications.some((a) => a.jobId === job.id && a.status === 'accepted');
                    const showActivityMenu =
                      jobsListTab === 'active' &&
                      job.status !== 'completed' &&
                      (canLifecyclePauseResume || canLifecycleCancel || canCompleteFromMenu);

                    if (isPreHireActivity) {
                      return (
                        <ClientActivityOpenRequestCard
                          key={job.id}
                          job={job}
                          candidateApps={displayCandidateApps}
                          applications={applications}
                          isExclusiveLocked={isExclusiveLocked}
                          t={t}
                          formatMoneyAmount={formatMoneyAmount}
                          acceptingApplicationId={acceptingApplicationId}
                          onAccept={(app) => void handleAcceptProposal(job, app)}
                          showLifecycleMenu={showActivityMenu}
                          lifecycleControlsEnabled={lifecycleControlsEnabled}
                          activityMenuOpen={activityMenuJobId === job.id}
                          onToggleActivityMenu={() =>
                            setActivityMenuJobId((current) => (current === job.id ? null : job.id))
                          }
                          activityMenuRef={activityMenuJobId === job.id ? activityMenuRef : undefined}
                          onPause={() => {
                            setPauseTargetJobId(job.id);
                            setActivityMenuJobId(null);
                          }}
                          onResume={() => void handleResumeJob(job.id)}
                          onCancel={() => {
                            setCancelTargetJobId(job.id);
                            setActivityMenuJobId(null);
                          }}
                        />
                      );
                    }

                    return (
                      <article
                        key={job.id}
                        className={clsx('group relative min-w-0 overflow-visible rounded-[1.35rem] border border-slate-100 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.07)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_42px_rgba(15,23,42,0.11)] sm:p-4', isActivityPanelOpen ? 'z-30' : 'z-0')}
                      >
                        <div className={clsx('absolute left-0 top-0 h-full w-1.5', clientDashboardAccent.activityAccentBar)} />
                        <div
                          ref={activityMenuJobId === job.id ? activityMenuRef : undefined}
                          className="absolute right-4 top-4 z-20"
                        >
                          {showActivityMenu ? (
                            <>
                          <button
                            type="button"
                            aria-label={t('common.more_options')}
                            aria-expanded={activityMenuJobId === job.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivityMenuJobId((current) => (current === job.id ? null : job.id));
                            }}
                            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                          >
                            <Icons.MoreVertical className="h-5 w-5" />
                          </button>
                          {activityMenuJobId === job.id ? (
                            <div className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
                              {lifecycleControlsEnabled && job.status === 'paused' ? (
                                <button
                                  type="button"
                                  onClick={() => void handleResumeJob(job.id)}
                                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-slate-50"
                                >
                                  <Icons.Play className="h-4 w-4 text-blue-600" />
                                  Retorna
                                </button>
                              ) : lifecycleControlsEnabled && job.status === 'open' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPauseTargetJobId(job.id);
                                    setActivityMenuJobId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-slate-50"
                                >
                                  <Icons.Pause className="h-4 w-4 text-blue-600" />
                                  Pausar
                                </button>
                              ) : null}
                              {job.status === 'in_progress' &&
                              applications.some(
                                (a) => a.jobId === job.id && a.status === 'accepted',
                              ) ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setServiceConfirmJob(job);
                                    setActivityMenuJobId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-bold text-emerald-800 hover:bg-emerald-50"
                                >
                                  <Icons.CircleCheck className="h-4 w-4 text-emerald-600" />
                                  {t('upcoming_jobs.complete_work')}
                                </button>
                              ) : null}
                              {lifecycleControlsEnabled ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelTargetJobId(job.id);
                                    setActivityMenuJobId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-bold text-amber-800 hover:bg-amber-50"
                                >
                                  <Icons.Ban className="h-4 w-4 text-amber-600" />
                                  Cancelar
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                            </>
                          ) : null}
                        </div>

                        <div className={clsx('flex items-start gap-3', showActivityMenu && 'pr-7')}>
                          <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] shadow-lg', clientDashboardAccent.activityIconBubble)}>
                            <CategoryIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              {isExclusiveLocked ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-800">
                                  <Icons.Crown className="h-3.5 w-3.5" />
                                  {t('client_dashboard.exclusive_application_badge')}
                                </span>
                              ) : (
                                <span className={clsx('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black', clientDashboardAccent.activitySoftBg, clientDashboardAccent.activitySoftBorder, clientDashboardAccent.activityText)}>
                                  <Icons.Clock3 className="h-3.5 w-3.5" />
                                  {isJobPaused(job)
                                    ? 'Pausado'
                                    : job.status === 'open'
                                      ? t('client_dashboard.status_waiting_helpers')
                                      : t('client_dashboard.status_in_progress')}
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-black leading-tight text-slate-950 sm:text-lg">
                              {translateJobTitle(job.title, job.category, job.subcategory, t)}
                            </h3>
                          </div>
                        </div>

                        <div className="relative mt-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex min-h-[60px] w-full items-stretch gap-1 rounded-2xl border border-slate-100 bg-slate-50/70 p-1">
                            <button
                              type="button"
                              onClick={() => toggleActivityPanel(job.id, 'applications')}
                              className={clsx(
                                'flex min-w-0 flex-1 items-center gap-3 rounded-[0.9rem] px-2 py-2 text-left transition-all',
                                isApplicationsOpen
                                  ? 'border border-slate-200 bg-white shadow-sm'
                                  : 'hover:bg-white/80',
                              )}
                              aria-expanded={isApplicationsOpen}
                            >
                              <InterestedRing
                                interestedCount={isHiredActivity ? 1 : candidateApps.length}
                                label={isHiredActivity ? 'contratado' : 'candidatos'}
                                size={48}
                                hideLabel
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block whitespace-nowrap text-[11px] font-bold leading-tight text-slate-500">
                                  {isHiredActivity ? 'Contratado' : 'Candidatos'}
                                </span>
                                {isPreHireActivity ? (
                                  <span className="block truncate text-sm font-black text-slate-950">
                                    {activityCandidateCount(candidateApps)}/3
                                  </span>
                                ) : null}
                              </span>
                              <Icons.ChevronDown
                                className={clsx(
                                  'h-4 w-4 shrink-0 transition-transform duration-200',
                                  isApplicationsOpen && 'rotate-180',
                                  clientDashboardAccent.activityText,
                                )}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleActivityPanel(job.id, 'description')}
                              className={clsx(
                                'flex shrink-0 items-center gap-2 rounded-[0.9rem] px-3 py-2 text-sm font-black text-slate-800 transition-all',
                                isDescriptionOpen
                                  ? 'border border-slate-200 bg-white shadow-sm'
                                  : 'hover:bg-white/80',
                              )}
                              aria-expanded={isDescriptionOpen}
                            >
                              Descrição
                              <Icons.ChevronDown
                                className={clsx(
                                  'h-4 w-4 transition-transform duration-200',
                                  isDescriptionOpen && 'rotate-180',
                                  clientDashboardAccent.activityText,
                                )}
                              />
                            </button>
                          </div>

                          {isApplicationsOpen ? (
                            <div
                              className={clsx(
                                'mt-2 animate-in fade-in slide-in-from-top-1 duration-200 rounded-2xl border p-2 shadow-[0_18px_50px_rgba(15,23,42,0.12)]',
                                clientDashboardAccent.activitySoftBg,
                                clientDashboardAccent.activitySoftBorder,
                              )}
                            >
                              {isHiredActivity ? (
                                hiredApplication ? (
                                  <div
                                    className={clsx(
                                      'rounded-2xl border bg-white/95 p-3 shadow-sm',
                                      hiredApplication.isExclusive ? 'border-amber-200' : 'border-slate-100',
                                    )}
                                  >
                                    <div className="flex items-start gap-3">
                                      <button
                                        type="button"
                                        onClick={() => openHelperProfileFromApplication(job, hiredApplication)}
                                        className="relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                      >
                                        <img
                                          src={hiredApplication.helperAvatar}
                                          alt={hiredApplication.helperName}
                                          className="h-11 w-11 rounded-full object-cover ring-2 ring-white"
                                        />
                                      </button>
                                      <div className="min-w-0 flex-1">
                                        <button
                                          type="button"
                                          onClick={() => openHelperProfileFromApplication(job, hiredApplication)}
                                          className="flex max-w-full items-center gap-1.5 text-left"
                                        >
                                          <span className="truncate text-sm font-black text-slate-950">
                                            {hiredApplication.helperName}
                                          </span>
                                        </button>
                                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                                          <Icons.Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                          <span>{hiredApplication.helperRating}</span>
                                          <LinkHelpRankBadgeFromStats
                                            completedCount={hiredApplication.helperJobs}
                                            averageRating={hiredApplication.helperRating}
                                            role="helper"
                                            size="sm"
                                            showLabel={false}
                                            t={t}
                                          />
                                        </p>
                                        {(() => {
                                          const hiredAmount =
                                            hiredApplication.proposedAmount ?? job.acceptedAmount ?? null;
                                          return hiredAmount != null ? (
                                            <p className="mt-1 text-xs font-black text-slate-900">
                                              {t('client_dashboard.helper_proposal_amount', {
                                                amount: formatMoneyAmount(
                                                  hiredAmount,
                                                  job.currency || 'CAD',
                                                ),
                                              })}
                                            </p>
                                          ) : (
                                            <p className="mt-1 text-xs font-semibold text-slate-600">
                                              {t('client_dashboard.helper_proposal_negotiable')}
                                            </p>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="rounded-2xl border border-white/80 bg-white/95 px-3 py-6 text-center text-xs font-semibold text-slate-500">
                                    Helper contratado
                                  </div>
                                )
                              ) : displayCandidateApps.length === 0 ? (
                                <div className="rounded-2xl border border-white/80 bg-white/95 px-3 py-6 text-center text-xs font-semibold text-slate-500">
                                  Nenhum candidato ainda
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {displayCandidateApps.map((app) => (
                                    <ClientCandidateCard
                                      key={app.id}
                                      job={job}
                                      app={app}
                                      t={t}
                                      formatMoneyAmount={formatMoneyAmount}
                                      profileExpanded={
                                        expandedCandidateProfileKey ===
                                        candidateProfileExpandKey(job.id, app.id)
                                      }
                                      onToggleProfile={() => toggleCandidateProfile(job.id, app.id)}
                                      showAccept={
                                        (app.status === 'pending' || app.status === 'viewed') &&
                                        isPreHireActivity
                                      }
                                      accepting={acceptingApplicationId === app.id}
                                      onAccept={() => void handleAcceptProposal(job, app)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : null}

                          {isDescriptionOpen ? (
                            <div
                              className={clsx(
                                'mt-2 animate-in fade-in slide-in-from-top-1 duration-200 rounded-2xl border p-2 shadow-[0_18px_50px_rgba(15,23,42,0.12)]',
                                clientDashboardAccent.activitySoftBg,
                                clientDashboardAccent.activitySoftBorder,
                              )}
                            >
                              <div className="rounded-2xl border border-white/80 bg-white/95 px-2.5 py-2.5 text-xs font-semibold leading-snug text-slate-700 shadow-sm backdrop-blur">
                                <div className="mb-2 grid grid-cols-1 gap-1.5 text-[11px] sm:grid-cols-2">
                                  <div className="rounded-xl bg-slate-50 px-2.5 py-1.5">
                                    <span className="block font-black uppercase tracking-[0.06em] text-slate-400">Orçamento</span>
                                    <span className="block font-bold text-slate-800">{formatJobBudgetDisplay(job, t)}</span>
                                  </div>
                                  <div className="rounded-xl bg-slate-50 px-2.5 py-1.5">
                                    <span className="block font-black uppercase tracking-[0.06em] text-slate-400">Criado em</span>
                                    <span className="block font-bold text-slate-800">{createdAtLabel}</span>
                                  </div>
                                  <div className="rounded-xl bg-slate-50 px-2.5 py-1.5">
                                    <span className="block font-black uppercase tracking-[0.06em] text-slate-400">
                                      {t('client_dashboard.activity_modality')}
                                    </span>
                                    <span className="block font-bold text-slate-800">
                                      {job.serviceMode === 'remote'
                                        ? t('create_modal.service_mode_remote')
                                        : job.serviceMode === 'in_person'
                                          ? t('create_modal.service_mode_in_person')
                                          : t('common.unknown')}
                                    </span>
                                  </div>
                                  <div className="rounded-xl bg-slate-50 px-2.5 py-1.5 sm:col-span-2">
                                    <span className="block font-black uppercase tracking-[0.06em] text-slate-400">Endereço</span>
                                    <span className="block font-bold text-slate-800">{job.address || job.city || job.location}</span>
                                  </div>
                                </div>
                                <p className="whitespace-pre-line text-[12px] leading-snug">
                                  {job.description || 'Sem descrição adicional.'}
                                </p>
                              </div>

                              {jobsListTab === 'history' && job.status === 'completed' && pendingServiceReviews.some((p) => p.requestId === job.id) ? (
                                <button
                                  type="button"
                                  onClick={() => openReviewByRequestId(job.id)}
                                  className="mt-2 inline-flex min-h-[38px] w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-900 hover:bg-amber-100"
                                >
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                  {t('service_review.rate_now')}
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-6 py-14 text-center xl:col-span-2">
                    <div className={clsx('mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl', clientDashboardAccent.activitySoftBg, clientDashboardAccent.activityText)}>
                      <Icons.Briefcase className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900">
                      {jobsListTab === 'active'
                        ? t('client_jobs.empty_open_title')
                        : t('client_jobs.empty_completed_title')}
                    </h3>
                    <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">
                      {jobsListTab === 'active'
                        ? t('client_jobs.empty_open_body')
                        : t('client_jobs.empty_completed_body')}
                    </p>
                    {jobsListTab === 'active' ? (
                      <button
                        type="button"
                        onClick={() => openCreateModal()}
                        className={clsx('mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold text-white shadow-lg', clientDashboardAccent.activityGradient)}
                      >
                        <Plus className="h-4 w-4" />
                        {t('client_dashboard.hero_cta')}
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              <div className={clsx('mt-6 flex items-center gap-4 rounded-[1.5rem] border p-4', clientDashboardAccent.activityTipPanel)}>
                <div className={clsx('flex h-14 w-14 shrink-0 items-center justify-center rounded-full', clientDashboardAccent.activitySoftBg, clientDashboardAccent.activityText)}>
                  <Icons.Crown className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={clsx('text-sm font-black', clientDashboardAccent.activityText)}>Dica de destaque</h3>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
                    Pedidos com informações completas recebem respostas melhores e ajudam os helpers a entenderem exatamente o que você precisa.
                  </p>
                </div>
              </div>
            </LhCard>
          </div>
        )}
        {/* Saved Tab */}
        {activeSidebarTab === 'saved' && (
          <div className="w-full max-w-[680px] mx-auto animate-in fade-in duration-300">
            <LhCard className="mb-6 overflow-hidden text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icons.Bookmark className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('client_dashboard.saved_empty_title')}</h2>
              <p className="text-gray-500 max-w-sm mx-auto">{t('client_dashboard.saved_empty_body')}</p>
            </LhCard>
          </div>
        )}
        </main>

        {/* Right Sidebar */}
        <ClientDashboardMapSidebar
          t={t}
          clientId={me.id}
          jobs={jobs}
          applications={applications}
          nearbyHelpers={nearbyHelpers}
          nearbyHelpersLoading={nearbyHelpersLoading}
          onViewProfile={openNearbyHelperProfile}
        />

      </div>

      {showHelperProfileModal && selectedHelper && (
        <PublicProfileSheetFrame
          open
          mobileAlign="bottom"
          onClose={() => {
            setShowHelperProfileModal(false);
            setProfileContextRequestId(null);
          }}
          panelClassName="h-full max-h-full rounded-t-[1.75rem] bg-transparent shadow-2xl transition-opacity duration-200 ease-out sm:rounded-3xl md:max-w-2xl"
        >
                      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div
                {...{ [PUBLIC_PROFILE_SCROLL_ATTR]: '' }}
                className="ios-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2 pt-1 sm:px-5 sm:pt-2"
              >
                <HelperPublicProfileView
                  helper={{
                    id: String(selectedHelper.id),
                    name: selectedHelper.name,
                    avatar: selectedHelper.avatar,
                    rating: profileApp?.helperRating ?? selectedHelper.rating,
                    jobsCompleted:
                      profileApp?.helperJobs ??
                      selectedHelper.jobsCompleted ??
                      applications.find((a) => a.helperId === String(selectedHelper.id))?.helperJobs ??
                      0,
                    // Bio/city/languages come from profiles via usePublicProfileExtras — never application message.
                    categories: selectedHelper.skills?.length ? [...selectedHelper.skills] : [],
                  }}
                  onClose={() => {
                    setShowHelperProfileModal(false);
                    setProfileContextRequestId(null);
                  }}
                  closeLabel={t('common.close')}
                />
              </div>
              <div className="shrink-0 flex flex-col gap-2 border-t border-gray-100 bg-white px-4 pb-3 pt-3 sm:px-6">
                {(() => {
                  const isHiredHelper =
                    profileChatUnlocked ||
                    profileApp?.status === 'accepted' ||
                    profileApp?.status === 'completed';
                  const msgsRemaining = profilePreMatchEligible
                    ? Math.max(0, PRE_HIRE_MESSAGE_LIMIT - (profilePreMatchCount ?? 0))
                    : null;
                  const chatEnabled =
                    profileChatUnlocked || (profilePreMatchEligible && (msgsRemaining ?? 1) > 0);

                  if (isHiredHelper) {
                    return (
                      <>
                        <span className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
                          <Icons.CheckCircle2 className="h-4 w-4" />
                          {t('messages_page.service_confirmed_badge')}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleProfileMessageClick()}
                          className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white text-sm font-bold text-slate-800 hover:border-blue-200 hover:bg-blue-50"
                        >
                          <Icons.MessageSquare className="w-5 h-5 text-blue-600" />
                          {t('helper_profile.cta_chat')}
                        </button>
                      </>
                    );
                  }

                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleProfileMessageClick()}
                        disabled={!chatEnabled}
                        className={`w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl border-2 text-sm font-bold transition-colors ${
                          chatEnabled
                            ? 'border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50'
                            : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400 opacity-60'
                        }`}
                      >
                        <Icons.MessageSquare className={`w-5 h-5 ${chatEnabled ? 'text-blue-600' : 'text-slate-400'}`} />
                        {t('helper_profile.cta_chat')}
                        {msgsRemaining !== null && (
                          <span className="ml-1 text-xs font-medium opacity-60">· {msgsRemaining}/{PRE_HIRE_MESSAGE_LIMIT}</span>
                        )}
                      </button>
                      {profilePreMatchEligible && msgsRemaining !== null && msgsRemaining <= 0 ? (
                        <p className="text-center text-xs font-semibold text-amber-600 px-2">
                          {t('helper_profile.pre_match_limit_reached')}
                        </p>
                      ) : profilePreMatchEligible ? (
                        <p className="text-center text-xs text-slate-400 px-2">
                          {t('helper_profile.pre_match_hint', { count: msgsRemaining ?? PRE_HIRE_MESSAGE_LIMIT })}
                        </p>
                      ) : !profileChatUnlocked ? (
                        <p className="text-center text-xs font-semibold text-slate-500 px-2">
                          {t('helper_profile.chat_locked_hint')}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setShowHelperProfileModal(false);
                          setHireModalKind('hire');
                          setShowHireModal(true);
                        }}
                        className="w-full min-h-[48px] rounded-2xl bg-blue-600 text-white text-sm font-black"
                      >
                        {t('helper_profile.cta_hire')}
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
        </PublicProfileSheetFrame>
      )}

      {showHireModal && selectedHelper && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col relative animation-bounce-in">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50 to-white opacity-50" />

            <div className="p-6 relative z-10">
              <button
                type="button"
                onClick={() => setShowHireModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors"
                aria-label={t('common.close')}
              >
                <Icons.X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center mt-4">
                <img
                  src={selectedHelper.avatar}
                  alt=""
                  className="w-20 h-20 rounded-full border-4 border-white shadow-lg ring-1 ring-black/5 bg-white object-cover mb-4"
                />
                <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                  {hireModalKind === 'proposal'
                    ? t('hire_modal.title_proposal', { name: selectedHelper.name.split(' ')[0] })
                    : t('hire_modal.title', { name: selectedHelper.name.split(' ')[0] })}
                </h2>
                <p className="text-gray-500 mt-2 font-medium text-sm">
                  {hireModalKind === 'proposal' ? t('hire_modal.subtitle_proposal') : t('hire_modal.subtitle')}
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {hireModalKind === 'proposal' ? t('hire_modal.invite_label_proposal') : t('hire_modal.invite_label')}
                  </label>
                  <textarea
                    className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-blue-500 focus:ring-0 resize-none transition-colors duration-200"
                    rows={4}
                    placeholder={
                      hireModalKind === 'proposal'
                        ? t('hire_modal.invite_placeholder_proposal', { name: selectedHelper.name.split(' ')[0] })
                        : t('hire_modal.invite_placeholder', { name: selectedHelper.name.split(' ')[0] })
                    }
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                  />
                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex gap-3 text-orange-800">
                  <Icons.Info className="w-5 h-5 shrink-0 text-orange-500" />
                  <p className="text-xs font-semibold leading-relaxed">
                    {hireModalKind === 'proposal' ? t('hire_modal.info_note_proposal') : t('hire_modal.info_note')}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowHireModal(false)}
                  className="flex-1 min-h-[44px] py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleOfficialHire()}
                  className="flex-1 min-h-[44px] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Icons.Send className="w-5 h-5" />{' '}
                  {hireModalKind === 'proposal' ? t('hire_modal.send_proposal') : t('helper_profile.cta_hire')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </AppPageShell>
    </div>
  );
}
