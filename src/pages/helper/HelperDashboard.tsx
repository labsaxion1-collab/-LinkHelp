import React, { useState, useEffect, useMemo } from 'react';
import { Briefcase, Clock, MapPin, X, CheckCircle2, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import * as Icons from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { useAuth } from '@/context/AuthContext';
import { uploadAvatarImage } from '@/lib/storageUpload';
import { logMediaPicker } from '@/utils/mediaPickerDebug';
import { fetchHelperSkills, syncHelperSkills } from '@/services/supabase/helperSkillsRemote';
import {
  filterValidSkillKeys,
  parseSkillKey,
  skillSubLabelKey,
} from '@/data/helperSkillsCatalog';
import { useLanguage } from '@/context/LanguageContext';
import { useAppData, type UpcomingJob } from '@/context/AppDataContext';
import { useToast } from '@/context/ToastContext';
import { useCredits } from '@/context/CreditContext';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { UpcomingJobsSidebar } from '@/components/helpers/UpcomingJobsSidebar';
import { UpcomingJobDetailModal } from '@/components/modals/UpcomingJobDetailModal';
import { SERVICE_CATEGORIES, type ServiceCategoryId } from '@/data/serviceCategories';
import { resolveCategoryId, translateCategory, translateJobTitle } from '@/utils/translateCategory';
import { formatJobScheduleDisplay } from '@/utils/jobDisplay';
import { ROUTES } from '@/utils/constants';
import type { HelperSubscriptionTier } from '@/types/helperSubscription';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import {
  HelperSubscriptionPlanModal,
  type HelperPlanModalView,
} from '@/components/helpers/HelperSubscriptionPlanModal';
import { HelperProfileCompletionBar } from '@/components/helpers/portfolio/HelperProfileCompletionBar';
import { HelperCreditsWalletCard } from '@/components/helpers/HelperCreditsWalletCard';
import { HelperStatsStrip, type HelperStatsStripModel } from '@/components/helpers/HelperStatsStrip';
import { HelperOpportunityCard } from '@/components/opportunities/HelperOpportunityCard';
import { HelperRadialCategoryMenu } from '@/components/helper/HelperRadialCategoryMenu';
import { HelperOpportunityDetailModal } from '@/components/opportunities/HelperOpportunityDetailModal';
import { HelperProposalModal } from '@/components/modals/HelperProposalModal';
import { HelperInsufficientCreditsModal } from '@/components/modals/HelperInsufficientCreditsModal';
import { InsufficientCreditsError, leadCostsForJob } from '@/services/helperLeadCredits';
import { recordMarketSignal } from '@/services/marketSignals';
import { recordProposalAnalytics, type ProposalAnalyticsSource } from '@/services/proposalAnalytics';
import { checkSwipeInterestRateLimit } from '@/utils/swipeRateLimit';
import { getBrowserTimezone } from '@/utils/browserTimezone';
import { hapticSuccess } from '@/utils/haptic';
import { buildReviewCountByUserId } from '@/utils/reviewCounts';
import { HelperCategoriesManager } from '@/components/helper/HelperCategoriesManager';
import {
  SimpleAvatarUploadModal,
  type AvatarUploadDraft,
} from '@/components/helpers/profile-setup/SimpleAvatarUploadModal';
import {
  loadHelperProfileSettings,
  saveHelperProfileSettings,
  type HelperProfileSettings,
} from '@/utils/helperProfileSettings';
import type { CompletionRowKey } from '@/utils/helperProfileCompletion';
import { computeHelperProfileCompletion } from '@/utils/helperProfileCompletion';
import { helperProfileSuggestionKeys } from '@/utils/helperProfileSuggestions';
import { UserProfileModal } from '@/components/profile/UserProfileModal';
import { HelperProfileSkillsSection } from '@/components/helpers/profile/HelperProfileSkillsSection';
import { distanceToJobKm, sortOpportunitiesForHelper } from '@/utils/locationMatching';
import {
  helperBaseCoordinates,
  helperHasBaseAddress,
} from '@/utils/helperBaseLocation';
import { isJobCancelled } from '@/utils/jobVisibility';
import {
  filterToPreferredCategoriesIfPossible,
  deriveHelperCategoriesFromSkillKeys,
  getHelperCategoryPreferences,
  getJobServiceCategoryId,
  sortJobsByHelperCategoryPreference,
} from '@/utils/helperCategoryPreferences';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { HelperScorePanel } from '@/components/features/HelperScorePanel';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { LhCard } from '@/components/design-system/LhCard';

function formatSubscriptionBillingDate(iso: string | undefined, language: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  const loc = language === 'fr' ? 'fr-CA' : language === 'pt' ? 'pt-BR' : 'en-CA';
  return d.toLocaleDateString(loc, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function HelperDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [postText, setPostText] = useState('');
  const [activeTab, setActiveTab] = useState<'match' | 'recentes' | 'emergencia' | 'candidaturas'>('match');
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const isSubmittingApplyRef = React.useRef(false);
  const [proposalJob, setProposalJob] = useState<Job | null>(null);
  const [dismissedJobIds, setDismissedJobIds] = useState<Set<string>>(() => new Set());
  const [exitingJobIds, setExitingJobIds] = useState<Set<string>>(() => new Set());
  const [toastNotification, setToastNotification] = useState<{message: string, show: boolean}>({message: '', show: false});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [radialFilterOpen, setRadialFilterOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Application | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [insufficientCreditsLc, setInsufficientCreditsLc] = useState<number | null>(null);

  // Modals state
  const [planModal, setPlanModal] = useState<HelperPlanModalView | null>(null);
  const [profileSettings, setProfileSettings] = useState<HelperProfileSettings>(() => loadHelperProfileSettings());
  type ProfileSetupModal = null | 'avatar' | 'skills';
  const [profileSetupModal, setProfileSetupModal] = useState<ProfileSetupModal>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState<AvatarUploadDraft | null>(null);

  const { t, language } = useLanguage();
  const me = useSessionViewer();
  const { session, profile, isConfigured, updateProfile, refreshProfile } = useAuth();
  const [helperPrimaryCategory, setHelperPrimaryCategory] = useState<ServiceCategoryId>('cleaning');
  const [helperSecondaryCategories, setHelperSecondaryCategories] = useState<ServiceCategoryId[]>([]);

  useEffect(() => {
    const st = location.state as { openUpgrade?: boolean } | null;
    if (st?.openUpgrade) {
      setPlanModal('choose');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    const st = location.state as { openTab?: string } | null;
    if (st?.openTab === 'candidaturas') {
      setActiveTab('candidaturas');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    const st = location.state as { openProfile?: boolean } | null;
    if (st?.openProfile) {
      setShowProfileModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    saveHelperProfileSettings(profileSettings);
  }, [profileSettings]);

  const storageUserId = session?.user?.id ?? profile?.id ?? null;
  const helperAvatarUrl = profile?.avatar_url?.trim() || profileSettings.avatarDataUrl?.trim() || null;
  const categoryPrefs = useMemo(
    () => getHelperCategoryPreferences(profile, profileSettings.skillIds),
    [profile, profileSettings.skillIds],
  );
  const helperBaseCoords = useMemo(() => helperBaseCoordinates(profile), [profile]);
  const hasHelperBaseAddress = useMemo(() => helperHasBaseAddress(profile), [profile]);
  const baseDistanceToJobKm = React.useCallback(
    (job: Job) => distanceToJobKm(helperBaseCoords, job),
    [helperBaseCoords],
  );

  useEffect(() => {
    setHelperPrimaryCategory(categoryPrefs.primaryCategory);
    setHelperSecondaryCategories(categoryPrefs.secondaryCategories);
  }, [categoryPrefs.primaryCategory, categoryPrefs.secondaryCategories]);
  const visibleServiceCategories = useMemo(
    () =>
      categoryPrefs.visibleCategories.length
        ? SERVICE_CATEGORIES.filter((cat) => categoryPrefs.visibleCategories.includes(cat.id))
        : SERVICE_CATEGORIES,
    [categoryPrefs],
  );
  useEffect(() => {
    if (!isConfigured || !storageUserId) return;
    let cancelled = false;
    void (async () => {
      const remote = await fetchHelperSkills(storageUserId);
      if (cancelled) return;
      if (remote.length > 0) {
        setProfileSettings((prev) => ({ ...prev, skillIds: remote }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isConfigured, storageUserId]);

  const completionBreakdown = React.useMemo(
    () => computeHelperProfileCompletion(profileSettings, helperAvatarUrl),
    [profileSettings, helperAvatarUrl],
  );

  const completionSuggestions = React.useMemo(() => {
    const keys = helperProfileSuggestionKeys(completionBreakdown);
    return keys.map((k) => t(k));
  }, [completionBreakdown, t]);

  const pushToast = React.useCallback((message: string) => {
    setToastNotification({ message, show: true });
    setTimeout(() => setToastNotification({ message: '', show: false }), 4500);
  }, []);

  const handleSkillsSave = React.useCallback(
    async (
      ids: string[],
      categoryOverride?: { primary: ServiceCategoryId; secondary: ServiceCategoryId[] },
    ) => {
      const valid = filterValidSkillKeys(ids);
      setProfileSettings((p) => ({ ...p, skillIds: valid }));
      const { primary, secondary } =
        categoryOverride ?? deriveHelperCategoriesFromSkillKeys(valid, helperPrimaryCategory);
      setHelperPrimaryCategory(primary);
      setHelperSecondaryCategories(secondary);
      if (!isConfigured || !storageUserId) {
        if (valid.length > 0) showToast(t('helper_categories.saved_ok'), 'success');
        return;
      }
      try {
        await syncHelperSkills(storageUserId, valid);
        const err = await updateProfile({
          primary_category: primary,
          secondary_categories: secondary,
        });
        if (err) throw new Error(t(err.messageKey, err.vars));
        await refreshProfile();
        const synced = await fetchHelperSkills(storageUserId);
        setProfileSettings((p) => ({ ...p, skillIds: synced }));
        const syncedCats = deriveHelperCategoriesFromSkillKeys(synced, primary);
        setHelperPrimaryCategory(syncedCats.primary);
        setHelperSecondaryCategories(syncedCats.secondary);
        showToast(t('helper_categories.saved_ok'), 'success');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        showToast(msg || t('helper_categories.save_error'), 'error');
        throw e;
      }
    },
    [
      isConfigured,
      storageUserId,
      helperPrimaryCategory,
      updateProfile,
      refreshProfile,
      showToast,
      t,
    ],
  );

  const handleAvatarSave = React.useCallback(
    async (file: File) => {
      if (!isConfigured || !session?.user?.id) {
        setProfileSettings((p) => ({ ...p, avatarDataUrl: URL.createObjectURL(file) }));
        return;
      }
      try {
        const { publicUrl } = await uploadAvatarImage(session.user.id, file);
        logMediaPicker('UPLOAD SUCCESS', publicUrl);
        const err = await updateProfile({ avatar_url: publicUrl });
        if (err) {
          pushToast(t(err.messageKey, err.vars));
          throw err;
        }
        await refreshProfile();
        setProfileSettings((p) => ({ ...p, avatarDataUrl: publicUrl }));
        logMediaPicker('PROFILE UPDATED', publicUrl);
        pushToast(t('profile_setup.avatar_uploaded_ok'));
      } catch (e) {
        const isAuthErr = Boolean(e && typeof e === 'object' && 'messageKey' in e);
        if (!isAuthErr) pushToast(t('profile_setup.avatar_save_error'));
        throw e;
      }
    },
    [isConfigured, session?.user?.id, updateProfile, refreshProfile, pushToast, t],
  );

  const onCompletionRowClick = React.useCallback((key: CompletionRowKey) => {
    if (key === 'profilePhoto') {
      console.log('[avatar-state] open avatar modal (SimpleAvatarUploadModal)');
      setProfileSetupModal('avatar');
    }
    else if (key === 'skillsSelected') setProfileSetupModal('skills');
  }, []);

  const [showIdeaModal, setShowIdeaModal] = useState(false);

  const helperTier: HelperSubscriptionTier = me.subscriptionTier ?? 'BASIC';
  const planNextBillingLabel =
    helperTier === 'BASIC'
      ? null
      : formatSubscriptionBillingDate(me.nextBillingDate, language);

  const sidebarSkillLines = React.useMemo(
    () =>
      profileSettings.skillIds
        .map((key) => {
          const parsed = parseSkillKey(key);
          if (!parsed) return null;
          return { key, label: t(skillSubLabelKey(parsed.primary, parsed.sub)) };
        })
        .filter((row): row is { key: string; label: string } => row !== null),
    [profileSettings.skillIds, t],
  );

  useEffect(() => {
    if (location.pathname === ROUTES.helperOpportunities) {
      setActiveTab('match');
      setSelectedCategoryFilter('');
    } else if (location.pathname === ROUTES.helperDashboard) {
      setActiveTab('match');
      setSelectedCategoryFilter('');
    }
  }, [location.pathname]);

  const { jobs, applications, applyForJob, getHelperApplications, upcomingJobs, updateUpcomingWorkflow, updateApplicationStatus, dataLoading, reviews } = useAppData();
  const reviewCountByUserId = useMemo(() => buildReviewCountByUserId(reviews), [reviews]);
  const { showToast } = useToast();
  const {
    wallet,
    displayBalance,
    applyOptimisticDebit,
    refreshCredits,
    transactions: creditTransactions,
    unlocks,
    loading: creditsLoading,
  } = useCredits();

  const [upcomingModalJob, setUpcomingModalJob] = useState<UpcomingJob | null>(null);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [clientProfileJob, setClientProfileJob] = useState<Job | null>(null);
  const [detailOpportunity, setDetailOpportunity] = useState<Job | null>(null);
  const helperUserId = session?.user?.id ?? me.id;

  const helperUpcomingList = React.useMemo(
    () =>
      upcomingJobs
        .filter((u) => {
          if (u.helperId !== helperUserId) return false;
          if (u.workflowStatus !== 'scheduled' && u.workflowStatus !== 'in_progress') return false;
          const request = jobs.find((j) => j.id === u.jobId);
          return !request || !isJobCancelled(request);
        })
        .sort((a, b) => a.scheduledAt - b.scheduledAt),
    [upcomingJobs, helperUserId, jobs],
  );

  const upcomingModalJobFresh = React.useMemo(
    () =>
      upcomingModalJob
        ? helperUpcomingList.find((j) => j.id === upcomingModalJob.id) ??
          upcomingJobs.find((j) => j.id === upcomingModalJob.id) ??
          upcomingModalJob
        : null,
    [upcomingModalJob, helperUpcomingList, upcomingJobs],
  );

  const upcomingLocale = language === 'fr' ? 'fr-CA' : language === 'pt' ? 'pt-BR' : 'en-CA';
  const helperApplications = getHelperApplications(helperUserId);
  const helperApplicationsVisible = React.useMemo(
    () =>
      helperApplications.filter((app) => {
        if (app.status === 'cancelled') return false;
        const request = jobs.find((j) => j.id === app.jobId);
        return !request || !isJobCancelled(request);
      }),
    [helperApplications, jobs],
  );
  const appliedJobIds = new Set(
    helperApplications.filter((a) => a.status !== 'cancelled').map((a) => a.jobId),
  );
  const creditBalance = displayBalance ?? wallet?.balance ?? null;
  const [swipeCooldownUntil, setSwipeCooldownUntil] = useState(0);
  const proposalOpenedAtRef = React.useRef<number | null>(null);
  const proposalSourceRef = React.useRef<ProposalAnalyticsSource>('modal');
  const goToCredits = React.useCallback(() => navigate(ROUTES.helperCredits), [navigate]);
  const creditsUsedThisMonth = React.useMemo(() => {
    const now = new Date();
    return creditTransactions
      .filter((tx) => {
        const d = new Date(tx.createdAt);
        return (
          (tx.type === 'OPPORTUNITY_UNLOCK' ||
            tx.type === 'APPLICATION_INTEREST' ||
            tx.type === 'APPLICATION_SELECTED') &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  }, [creditTransactions]);

  const helperMvpStats = React.useMemo((): HelperStatsStripModel => {
    const apps = helperApplications.filter((a) => a.status !== 'cancelled');
    const sent = apps.length;
    const accepted = apps.filter((a) => a.status === 'accepted').length;
    const completed = apps.filter((a) => a.status === 'completed').length;
    const withClientUpdate = apps.filter((a) => a.status !== 'pending').length;
    const responseRatePct = sent > 0 ? Math.round((withClientUpdate / sent) * 100) : null;
    const parseHint = (v: string) => {
      const n = Number.parseFloat(String(v).replace(/[^0-9.]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };
    let earnings = 0;
    for (const a of apps) {
      if (a.status !== 'accepted' && a.status !== 'completed') continue;
      const job = jobs.find((j) => j.id === a.jobId);
      if (job) earnings += parseHint(job.value);
    }
    const estimatedEarnings = earnings > 0 ? `$${Math.round(earnings).toLocaleString()}` : '—';
    const reputation = Math.min(100, completed * 8 + accepted * 5 + Math.round(me.rating * 8));
    const hash = me.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const matchScore = Math.min(99, 72 + (hash % 18) + Math.min(8, accepted * 2));
    return {
      sent,
      accepted,
      completed,
      responseRatePct,
      avgRating: me.rating,
      estimatedEarnings,
      reputation,
      matchScore,
    };
  }, [helperApplications, jobs, me.id, me.rating]);

  const needsStatusUpdate = helperUpcomingList.some(
    (job) =>
      job.scheduledAt < Date.now() &&
      job.workflowStatus !== 'completed' &&
      job.workflowStatus !== 'cancelled' &&
      job.workflowStatus !== 'awaiting_client_confirmation',
  );

  const dismissJobWithAnimation = React.useCallback((jobId: string) => {
    setExitingJobIds((prev) => new Set(prev).add(jobId));
    window.setTimeout(() => {
      setDismissedJobIds((prev) => new Set(prev).add(jobId));
      setExitingJobIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }, 520);
  }, []);

  const logProposalAnalytics = React.useCallback(
    (event: 'opened' | 'closed' | 'cancelled' | 'submitted', job: Job, extra?: { proposedAmount?: number | null }) => {
      const openedAt = proposalOpenedAtRef.current;
      const durationMs = openedAt ? Date.now() - openedAt : null;
      recordProposalAnalytics({
        requestId: job.id,
        helperId: helperUserId,
        event,
        source: proposalSourceRef.current,
        proposedAmount: extra?.proposedAmount ?? null,
        budgetMin: job.budgetMin ?? null,
        budgetMax: job.budgetMax ?? null,
        durationMs,
        timezone: getBrowserTimezone(),
      });
    },
    [helperUserId],
  );

  const openProposalForJob = React.useCallback(
    (job: Job, source: ProposalAnalyticsSource) => {
      if (appliedJobIds.has(job.id)) {
        pushToast(t('helper_dashboard.already_interested'));
        return;
      }
      proposalSourceRef.current = source;
      proposalOpenedAtRef.current = Date.now();
      recordMarketSignal({
        requestId: job.id,
        helperId: helperUserId,
        event: 'opened',
        category: job.category,
        city: job.city ?? null,
        province: job.region ?? null,
        budgetMin: job.budgetMin ?? null,
        budgetMax: job.budgetMax ?? null,
        distanceKm: baseDistanceToJobKm(job),
        source,
      });
      logProposalAnalytics('opened', job);
      setProposalJob(job);
    },
    [appliedJobIds, helperUserId, baseDistanceToJobKm, logProposalAnalytics, pushToast, t],
  );

  const submitApply = async (job: Job, proposedAmount: number | null, proposalMessage?: string | null) => {
    if (appliedJobIds.has(job.id) || isSubmittingApplyRef.current) return;
    const distanceKm = baseDistanceToJobKm(job);
    const interestCost = leadCostsForJob(job, { distanceKm }).interestCost;
    if (creditBalance != null && creditBalance < interestCost) {
      setInsufficientCreditsLc(interestCost);
      return;
    }
    isSubmittingApplyRef.current = true;
    setApplyingJobId(job.id);
    const rollbackOptimistic = applyOptimisticDebit(interestCost);
    try {
      await applyForJob(job.id, helperUserId, proposedAmount, {
        distanceKm,
        message: proposalMessage ?? null,
      });
      await refreshCredits();
      recordMarketSignal({
        requestId: job.id,
        helperId: helperUserId,
        event: 'proposal_sent',
        category: job.category,
        city: job.city ?? null,
        province: job.region ?? null,
        budgetMin: job.budgetMin ?? null,
        budgetMax: job.budgetMax ?? null,
        distanceKm,
        source: proposalSourceRef.current,
      });
      logProposalAnalytics('submitted', job, { proposedAmount });
      hapticSuccess();
      setProposalJob(null);
      proposalOpenedAtRef.current = null;
      dismissJobWithAnimation(job.id);
      setToastNotification({ message: t('helper_dashboard.toast_apply_success'), show: true });
      setTimeout(() => setToastNotification({ message: '', show: false }), 4000);
    } catch (err: unknown) {
      rollbackOptimistic();
      if (err instanceof InsufficientCreditsError) {
        setInsufficientCreditsLc(err.requiredLc);
        return;
      }
      const msg =
        err instanceof Error
          ? err.message
          : err && typeof err === 'object' && 'message' in err
            ? String((err as { message?: unknown }).message ?? '')
            : '';
      if (msg === 'ALREADY_APPLIED') {
        logProposalAnalytics('closed', job);
        setProposalJob(null);
        proposalOpenedAtRef.current = null;
        pushToast(t('helper_dashboard.already_interested'));
        return;
      }
      showToast(msg || 'Erro', 'error');
    } finally {
      setApplyingJobId(null);
      isSubmittingApplyRef.current = false;
    }
  };

  const requestApply = (job: Job) => {
    if (isSubmittingApplyRef.current) return;
    openProposalForJob(job, 'modal');
  };

  const handleProposalClose = () => {
    if (applyingJobId || !proposalJob) return;
    logProposalAnalytics('cancelled', proposalJob);
    setProposalJob(null);
    proposalOpenedAtRef.current = null;
  };

  const handleSwipeInterest = (job: Job) => {
    if (appliedJobIds.has(job.id) || isSubmittingApplyRef.current) return;
    if (Date.now() < swipeCooldownUntil) {
      pushToast(t('helper_dashboard.swipe_rate_limit'));
      return;
    }
    const rate = checkSwipeInterestRateLimit();
    if (!rate.allowed) {
      setSwipeCooldownUntil(Date.now() + rate.retryAfterMs);
      pushToast(t('helper_dashboard.swipe_rate_limit'));
      return;
    }
    const distanceKm = baseDistanceToJobKm(job);
    recordMarketSignal({
      requestId: job.id,
      helperId: helperUserId,
      event: 'interested',
      category: job.category,
      city: job.city ?? null,
      province: job.region ?? null,
      budgetMin: job.budgetMin ?? null,
      budgetMax: job.budgetMax ?? null,
      distanceKm,
      source: 'swipe',
    });
    openProposalForJob(job, 'swipe');
  };

  const handleSwipeDismiss = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      recordMarketSignal({
        requestId: job.id,
        helperId: helperUserId,
        event: 'not_interested',
        category: job.category,
        city: job.city ?? null,
        province: job.region ?? null,
        budgetMin: job.budgetMin ?? null,
        budgetMax: job.budgetMax ?? null,
        distanceKm: baseDistanceToJobKm(job),
        source: 'swipe',
      });
    }
    dismissJobWithAnimation(jobId);
  };

  const swipeRateLimited = Date.now() < swipeCooldownUntil;

  const confirmCancelApplication = async () => {
    if (!cancelTarget) return;
    setCancelBusy(true);
    try {
      await updateApplicationStatus(cancelTarget.id, 'cancelled');
      showToast(t('helper_dashboard.toast_application_cancelled'), 'success');
      setCancelTarget(null);
    } catch (e) {
      console.error('[LinkHelp] cancel application', e);
      const backendMsg =
        e instanceof Error && e.message && e.message !== 'NOT_FOUND' ? e.message : null;
      showToast(backendMsg ?? t('helper_dashboard.toast_application_cancel_err'), 'error');
    } finally {
      setCancelBusy(false);
    }
  };

  const applicationCountsByJobId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of applications) {
      if (a.status === 'cancelled') continue;
      counts.set(a.jobId, (counts.get(a.jobId) ?? 0) + 1);
    }
    return counts;
  }, [applications]);

  const displayedJobs = useMemo(() => {
    let list = jobs.filter(
      (j) => j.status === 'open' && !isJobCancelled(j) && j.clientId !== me.id && getJobServiceCategoryId(j),
    );
    if (selectedCategoryFilter) {
      list = list.filter((j) => {
        const id = resolveCategoryId(j.category) || j.category;
        return id === selectedCategoryFilter;
      });
    }
    if (activeTab === 'emergencia') {
      list = list.filter((j) => j.urgency === 'high');
    } else if (activeTab === 'recentes') {
      list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    } else if (activeTab === 'match') {
      list = sortOpportunitiesForHelper(list, {
        origin: helperBaseCoords,
        helperSkillIds: profileSettings.skillIds,
        helperPlanTier: me.subscriptionTier,
      });
    } else if (activeTab === 'candidaturas') {
      list = [];
    }
    if (!selectedCategoryFilter && activeTab !== 'candidaturas') {
      list = filterToPreferredCategoriesIfPossible(
        sortJobsByHelperCategoryPreference(list, categoryPrefs),
        categoryPrefs,
      );
    }
    return list.filter((j) => !dismissedJobIds.has(j.id));
  }, [
    jobs,
    selectedCategoryFilter,
    activeTab,
    helperBaseCoords,
    profileSettings.skillIds,
    me.subscriptionTier,
    categoryPrefs,
    dismissedJobIds,
    me.id,
  ]);

  const feedActiveTab =
    activeTab === 'match' || activeTab === 'recentes' || activeTab === 'emergencia' ? activeTab : 'match';

  const radarJobs = filterToPreferredCategoriesIfPossible(
    jobs.filter((j) => j.status === 'open' && !isJobCancelled(j) && j.clientId !== me.id && getJobServiceCategoryId(j)),
    categoryPrefs,
  )
    .map((job) => ({ job, distanceKm: baseDistanceToJobKm(job) }))
    .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
    .slice(0, 3);
  const isPerformancePage = location.pathname === ROUTES.helperPerformance;
  const showDesktopBack =
    location.pathname === ROUTES.helperPerformance ||
    location.pathname === ROUTES.helperOpportunities;

  return (
    <AppPageShell wide className="min-w-0 overflow-x-hidden">
      {/* Toast Notification */}
      {toastNotification.show && (
        <div className="fixed top-20 right-4 z-[100] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg border border-gray-800 flex items-center gap-3 w-80">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{toastNotification.message}</p>
              <p className="text-xs text-gray-400">{t('helper_dashboard.toast_check_applications')}</p>
            </div>
            <button onClick={() => setToastNotification({message: '', show: false})} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-app-title"
          onClick={() => !cancelBusy && setCancelTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="cancel-app-title" className="text-lg font-black text-gray-900">
              {t('helper_dashboard.cancel_application_title')}
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-gray-600">{t('helper_dashboard.cancel_application_body')}</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={cancelBusy}
                onClick={() => setCancelTarget(null)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={cancelBusy}
                onClick={() => void confirmCancelApplication()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {cancelBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icons.XCircle className="h-4 w-4" />}
                {t('helper_dashboard.cancel_application_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}


      {planModal ? (
        <HelperSubscriptionPlanModal
          view={planModal}
          currentTier={helperTier}
          nextBillingLabel={planNextBillingLabel}
          onClose={() => setPlanModal(null)}
          onComparePlans={() => setPlanModal('choose')}
        />
      ) : null}

      <UserProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        avatarUrl={helperAvatarUrl ?? ''}
        titleKey="helper_dashboard.profile_modal_title"
        onChangePhoto={() => {
          setShowProfileModal(false);
          setProfileSetupModal('avatar');
        }}
        footer={
          <div className="space-y-4">
            {completionBreakdown.percent < 100 ? (
              <HelperProfileCompletionBar
                breakdown={completionBreakdown}
                onRowClick={onCompletionRowClick}
                suggestions={completionSuggestions}
              />
            ) : null}
            {profile?.spoken_languages?.length ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <h4 className="text-sm font-bold text-gray-900">{t('helper_dashboard.languages_label')}</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.spoken_languages.map((id) => (
                    <span key={id} className="rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-black text-blue-800">
                      {id === 'pt' ? 'Português' : id === 'en' ? 'English' : id === 'fr' ? 'Français' : id === 'es' ? 'Español' : id}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <HelperProfileSkillsSection
              t={t}
              skills={sidebarSkillLines}
              onEdit={() => {
                setShowProfileModal(false);
                setProfileSetupModal('skills');
              }}
            />
          </div>
        }
      />

      {profileSetupModal === 'avatar' && (
        <SimpleAvatarUploadModal
          draft={avatarDraft}
          onDraftChange={(next) => {
            setAvatarDraft((prev) => {
              if (prev?.previewUrl && prev.previewUrl !== next?.previewUrl) {
                URL.revokeObjectURL(prev.previewUrl);
              }
              console.log('[avatar-state] parent onDraftChange', {
                from: prev?.file?.name ?? null,
                to: next?.file?.name ?? null,
              });
              return next;
            });
          }}
          onClose={() => {
            setAvatarDraft((d) => {
              if (d?.previewUrl) URL.revokeObjectURL(d.previewUrl);
              return null;
            });
            setProfileSetupModal(null);
          }}
          initialPreview={helperAvatarUrl}
          onSave={handleAvatarSave}
          t={t}
          onToast={pushToast}
        />
      )}
      {profileSetupModal === 'skills' ? (
        <div className="fixed inset-0 z-[110] flex items-end justify-center" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm"
            aria-label={t('common.close')}
            onClick={() => setProfileSetupModal(null)}
          />
          <div className="relative z-10 flex max-h-[min(88dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-200" />
            <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <h3 className="text-lg font-black text-slate-950">{t('helper_categories.title')}</h3>
              <button
                type="button"
                onClick={() => setProfileSetupModal(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-600"
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <HelperCategoriesManager
                t={t}
                skillIds={profileSettings.skillIds}
                primaryCategory={helperPrimaryCategory}
                secondaryCategories={helperSecondaryCategories}
                onSkillsChange={(ids) => setProfileSettings((p) => ({ ...p, skillIds: filterValidSkillKeys(ids) }))}
                onCategoriesChange={(primary, secondary) => {
                  setHelperPrimaryCategory(primary);
                  setHelperSecondaryCategories(secondary);
                }}
                onSaveAsync={handleSkillsSave}
              />
            </div>
          </div>
        </div>
      ) : null}
      {/* Idea Modal */}
      {UI_VISIBILITY.ideas && showIdeaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowIdeaModal(false)}>
           <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-[60px] pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none"></div>
              
              <div className="p-6 border-b border-gray-800 flex justify-between items-center relative z-10">
                 <div>
                   <h3 className="text-xl font-black text-white flex items-center gap-2"><Icons.Lightbulb className="w-5 h-5 text-yellow-400" /> {t('helper_dashboard.idea_modal_title')}</h3>
                   <p className="text-sm text-gray-400 font-medium tracking-tight">{t('helper_dashboard.idea_modal_subtitle')}</p>
                 </div>
                 <button onClick={() => setShowIdeaModal(false)} className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full transition-colors">
                   <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="p-6 relative z-10 flex-1 overflow-y-auto">
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-bold text-gray-300 mb-2 pl-1">{t('helper_dashboard.idea_field_title')}</label>
                     <input type="text" placeholder={t('helper_dashboard.idea_placeholder_title')} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all font-medium" />
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-gray-300 mb-2 pl-1">{t('helper_dashboard.idea_field_help')}</label>
                     <textarea rows={4} placeholder={t('helper_dashboard.idea_placeholder_body')} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all font-medium resize-none"></textarea>
                   </div>
                   
                   <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3 text-yellow-200 mt-2">
                     <Icons.Gift className="w-5 h-5 shrink-0 text-yellow-500 mt-0.5" />
                     <p className="text-xs font-medium leading-relaxed">{t('helper_dashboard.idea_reward_note')}</p>
                   </div>
                 </div>

                 <div className="mt-8">
                   <button onClick={() => {
                     setShowIdeaModal(false);
                     setToastNotification({ message: t('helper_dashboard.idea_toast_success'), show: true });
                     setTimeout(() => setToastNotification({ message: '', show: false }), 4000);
                   }} className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-black tracking-wide uppercase text-sm rounded-xl transition-all hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2">
                     <Icons.Send className="w-4 h-4" /> {t('helper_dashboard.idea_submit')}
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-[var(--lh-gutter)] justify-center min-w-0 w-full max-w-full px-0 sm:px-4 md:px-0">
        <aside className="hidden">
          <div className="sticky top-24 space-y-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <button onClick={() => setShowProfileModal(true)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-slate-50">
              <img src={helperAvatarUrl ?? me.avatar} alt="" className="h-11 w-11 rounded-2xl object-cover ring-1 ring-slate-100" />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{me.name}</p>
                <p className="truncate text-xs font-bold text-blue-600">{t('nav.profile_menu_profile')}</p>
              </div>
            </button>
            <nav className="space-y-1 border-t border-slate-100 pt-3">
              {[
                { id: 'home', label: t('helper_dashboard.nav_home'), icon: Icons.Home, active: location.pathname === ROUTES.helperDashboard, action: () => { navigate(ROUTES.helperDashboard); setActiveTab('match'); } },
                { id: 'performance', label: t('helper_dashboard.nav_performance'), icon: Icons.Activity, active: isPerformancePage, action: () => navigate(ROUTES.helperPerformance) },
                { id: 'profile', label: t('nav.profile_menu_profile'), icon: Icons.UserRound, active: false, action: () => setShowProfileModal(true) },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.action}
                    className={`flex min-h-[44px] w-full items-center gap-3 rounded-2xl px-3 text-sm font-black transition-colors ${
                      item.active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
              <div className="rounded-2xl bg-slate-50 p-2">
                <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
                  {t('helper_dashboard.nav_active_services')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    navigate(ROUTES.helperDashboard);
                    setActiveTab('candidaturas');
                  }}
                  className={`flex min-h-[38px] w-full items-center gap-2 rounded-xl px-2 text-xs font-black ${
                    activeTab === 'candidaturas' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <Icons.ClipboardList className="h-4 w-4" />
                  {t('helper_dashboard.nav_applications')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.helperJobs)}
                  className={`mt-1 flex min-h-[38px] w-full items-center gap-2 rounded-xl px-2 text-xs font-black ${
                    location.pathname === ROUTES.helperJobs ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <Icons.Briefcase className="h-4 w-4" />
                  {t('helper_dashboard.nav_active_services')}
                </button>
              </div>
            </nav>
          </div>
        </aside>
        <main className="w-full min-w-0 pb-2">
          {showDesktopBack ? <DesktopBackButton className="mb-4" /> : null}

          {isPerformancePage ? (
            <div className="space-y-4">
              <HelperStatsStrip dataLoading={dataLoading} stats={helperMvpStats} t={t} />
              <HelperScorePanel />
              {UI_VISIBILITY.helperCredits ? <CreditsUsageDashboard /> : null}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">{t('helper_dashboard.stats_strip_title')}</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">{t('helper_dashboard.score_section_performance')}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t('helper_dashboard.nav_applications')}</p>
                    <p className="mt-1 text-2xl font-black text-slate-950">{helperMvpStats.sent}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t('helper_dashboard.score_metric_response_rate')}</p>
                    <p className="mt-1 text-2xl font-black text-slate-950">
                      {helperMvpStats.responseRatePct == null ? '—' : `${helperMvpStats.responseRatePct}%`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {!isPerformancePage ? (
          <>
          {needsStatusUpdate ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 shadow-sm">
              <div className="flex items-start gap-2">
                <Icons.Activity className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>Atualize o status deste trabalho para manter seu score saudável.</span>
              </div>
            </div>
          ) : null}

          <div className="mb-3 flex items-start justify-between gap-2">
            {activeTab === 'candidaturas' ? (
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-950">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Icons.ClipboardList className="h-4 w-4" />
                </span>
                {t('helper_dashboard.filter_apps_title')}
              </h3>
            ) : (
              <HelperRadialCategoryMenu
                open={radialFilterOpen}
                onToggle={() => setRadialFilterOpen((v) => !v)}
                categories={visibleServiceCategories}
                primaryCategoryId={categoryPrefs.primaryCategory}
                selectedId={selectedCategoryFilter}
                onSelect={setSelectedCategoryFilter}
                t={t}
              />
            )}
            {!isPerformancePage && UI_VISIBILITY.helperCredits ? (
              <HelperCreditsWalletCard
                balance={creditBalance}
                usedThisMonth={creditsUsedThisMonth}
                unlocksCount={unlocks.length}
                loading={creditsLoading && creditBalance == null}
                compact
                t={t}
                onBuyCredits={goToCredits}
              />
            ) : null}
          </div>

          {activeTab !== 'candidaturas' ? (
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('match')}
                className={`min-h-[34px] flex-1 rounded-xl px-2 text-[11px] font-black ${activeTab === 'match' ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
              >
                {t('helper_dashboard.tab_match')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('recentes')}
                className={`min-h-[34px] flex-1 rounded-xl px-2 text-[11px] font-black ${activeTab === 'recentes' ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
              >
                {t('helper_dashboard.tab_recent')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('candidaturas')}
                className="min-h-[34px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600"
              >
                {t('helper_dashboard.nav_applications')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('match')}
              className="mb-3 text-xs font-bold text-blue-700"
            >
              {t('helper_dashboard.back_to_feed')}
            </button>
          )}

          {activeTab !== 'candidaturas' && !categoryPrefs.hasExplicitPreference ? (
            <div className="mb-3 rounded-2xl border border-blue-100 bg-white/80 px-4 py-3 text-xs font-bold text-slate-600 shadow-sm">
              <div className="flex items-start gap-2">
                <Icons.Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <span>{t('helper_categories.feed_no_categories_hint')}</span>
              </div>
            </div>
          ) : null}

          {activeTab !== 'candidaturas' && !hasHelperBaseAddress ? (
            <div className="mb-3 rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-xs font-bold text-slate-700 shadow-sm">
              <div className="flex items-start gap-2">
                <Icons.MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                <span>{t('helper_dashboard.base_address_banner')}</span>
              </div>
            </div>
          ) : null}

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{activeTab === 'candidaturas' ? t('helper_dashboard.feed_title_apps') : t('helper_dashboard.feed_title_jobs')}</h2>
          </div>

          {/* Posts (Feed) */}
          <div className="space-y-4">
            {activeTab === 'candidaturas' ? (
              helperApplicationsVisible.length > 0 ? (
                helperApplicationsVisible.map(app => {
                  const statusColors: Record<string, string> = {
                    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                    viewed: 'bg-blue-50 text-blue-700 border-blue-200',
                    accepted: 'bg-green-50 text-green-700 border-green-200',
                    rejected: 'bg-red-50 text-red-700 border-red-200',
                    completed: 'bg-purple-50 text-purple-700 border-purple-200',
                    cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
                  };
                  const statusTexts: Record<string, string> = {
                    pending: t('helper_dashboard.app_pending'),
                    viewed: t('helper_dashboard.app_viewed'),
                    accepted: t('helper_dashboard.app_accepted'),
                    rejected: t('helper_dashboard.app_rejected'),
                    completed: t('helper_dashboard.app_completed'),
                    cancelled: t('helper_dashboard.app_cancelled'),
                  };
                  const job = jobs.find(j => j.id === app.jobId);
                  if (!job) return null;

                  return (
                    <LhCard key={app.id} padding="none" className="overflow-hidden transition-shadow duration-200 hover:shadow-md">
                      <div className="p-4 flex items-center justify-between border-b border-gray-50 bg-gray-50/50">
                        <div className="flex items-center gap-2">
                           <Icons.Clock className="w-4 h-4 text-gray-500" />
                           <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{new Date(app.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg border ${statusColors[app.status] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                           {statusTexts[app.status] ?? app.status}
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <img src={job.clientAvatar} alt="Client" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                          <div>
                            <h3 className="font-bold text-gray-900 leading-tight">{job.clientName}</h3>
                            <p className="text-xs text-gray-400 font-medium">{translateCategory(job.category, t)}</p>
                          </div>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-3 leading-tight">{translateJobTitle(job.title, job.category, job.subcategory, t)}</h4>
                        <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-2">
                          <span className="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-gray-600"><Clock className="w-3.5 h-3.5 text-gray-400" /> {formatJobScheduleDisplay(job, t)}</span>
                          <span className="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-gray-600"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {job.location}</span>
                          <span className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-slate-700">
                            <Icons.Handshake className="w-3.5 h-3.5 text-slate-500 shrink-0" /> {t('helper_dashboard.compensation_neutral')}
                          </span>
                        </div>
                        {(app.status === 'pending' || app.status === 'viewed') && (
                          <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">
                            <button
                              type="button"
                              onClick={() => setCancelTarget(app)}
                              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                            >
                              <Icons.XCircle className="h-4 w-4" />
                              {t('helper_dashboard.cancel_application')}
                            </button>
                          </div>
                        )}
                      </div>
                    </LhCard>
                  );
                })
              ) : (
                <LhCard className="text-center py-12 border-dashed" padding="lg">
                  <Icons.ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">{t('helper_dashboard.empty_applications')}</p>
                </LhCard>
              )
            ) : displayedJobs.length > 0 ? (
              <div
                className={clsx(
                  'grid w-full max-w-full min-w-0 grid-cols-1 gap-3 md:gap-4 md:grid-cols-2 2xl:grid-cols-3 transition-[filter,opacity] duration-300',
                  proposalJob && 'pointer-events-none brightness-[0.92] md:brightness-[0.88]',
                )}
              >
              {displayedJobs.map((job) => (
                    <div
                      key={job.id}
                      className={clsx(
                        'min-w-0 transition-[margin,opacity,transform] duration-[420ms] ease-[cubic-bezier(0.34,1.15,0.64,1)]',
                        exitingJobIds.has(job.id) &&
                          'pointer-events-none -mt-3 scale-[0.92] opacity-0 -translate-x-6 rotate-[-2deg]',
                      )}
                    >
                      <HelperOpportunityCard
                        job={job}
                        activeTab={feedActiveTab}
                        hasApplied={appliedJobIds.has(job.id)}
                        isApplying={applyingJobId === job.id}
                        isExiting={exitingJobIds.has(job.id)}
                        interactionLocked={Boolean(applyingJobId) || swipeRateLimited}
                        proposalOpen={proposalJob?.id === job.id}
                        swipeRateLimited={swipeRateLimited}
                        distanceKm={baseDistanceToJobKm(job)}
                        distanceFromBase={hasHelperBaseAddress}
                        needsBaseAddress={!hasHelperBaseAddress}
                        applicationsCount={applicationCountsByJobId.get(job.id) ?? 0}
                        clientReviewCount={reviewCountByUserId.get(job.clientId) ?? 0}
                        onApply={requestApply}
                        onSwipeInterest={handleSwipeInterest}
                        onDismiss={handleSwipeDismiss}
                        onViewClientProfile={setClientProfileJob}
                        onViewDetails={setDetailOpportunity}
                        t={t}
                        translateCategory={translateCategory}
                        formatJobSchedule={formatJobScheduleDisplay}
                      />
                    </div>
              ))}
              </div>
            ) : (
              <LhCard className="text-center py-12 border-dashed" padding="lg">
                <Icons.SearchX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">{t('helper_dashboard.empty_feed')}</p>
              </LhCard>
            )}
          </div>
          </>
          ) : null}
        </main>

        {/* Right Sidebar */}
        <div className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-120px)] space-y-4">
          
          {/* Live Opportunity Radar */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden hover:shadow-md transition-shadow duration-200">
             <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Icons.Crosshair className="w-4 h-4 text-blue-600" />
                   <h3 className="font-bold text-gray-900 text-sm">{t('helper_dashboard.radar_title')}</h3>
                </div>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">{t('helper_dashboard.radar_badge_neutral')}</span>
             </div>
             <div className="space-y-2 p-3">
               {radarJobs.length ? radarJobs.map(({ job, distanceKm }) => (
                 <button
                   key={job.id}
                   type="button"
                   onClick={() => {
                     setSelectedCategoryFilter(resolveCategoryId(job.category) || job.category);
                     setActiveTab(job.urgency === 'high' ? 'emergencia' : 'match');
                     navigate(ROUTES.helperOpportunities);
                   }}
                   className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50"
                 >
                   <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 ring-1 ring-slate-200">
                     <Icons.MapPin className="h-4 w-4" />
                   </span>
                   <span className="min-w-0 flex-1">
                     <span className="block truncate text-sm font-black text-slate-900">{translateJobTitle(job.title, job.category, job.subcategory, t)}</span>
                     <span className="block truncate text-xs font-bold text-slate-500">
                       {!hasHelperBaseAddress
                         ? t('helper_dashboard.base_address_missing_short')
                         : distanceKm != null
                           ? t('helper_dashboard.distance_from_base_km', { km: distanceKm.toFixed(1) })
                           : job.city || job.location}
                     </span>
                   </span>
                   <span className={`rounded-full px-2 py-1 text-[10px] font-black ${job.urgency === 'high' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>
                     {job.value}
                   </span>
                 </button>
               )) : (
                 <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs font-bold text-slate-500">
                   {t('helper_dashboard.empty_feed')}
                 </p>
               )}
             </div>
             <Link to={ROUTES.map} className="p-2 border-t border-gray-50 bg-gray-50 text-center hover:bg-gray-100 transition-colors cursor-pointer block">
                 <span className="text-xs font-semibold text-blue-600">{t('helper_dashboard.radar_expand_map')}</span>
             </Link>
          </div>

          <UpcomingJobsSidebar
            helperId={me.id}
            jobs={helperUpcomingList}
            locale={upcomingLocale}
            t={t}
            translateCategory={translateCategory}
            onSelectJob={(job) => {
              setUpcomingModalJob(job);
              setShowUpcomingModal(true);
            }}
            onQuickReject={(job) => updateUpcomingWorkflow(job.id, 'cancelled')}
          />
          
          <div className="border-t border-gray-200 pt-4 flex-1">
             <div className="mb-3 px-1">
               <h3 className="text-gray-500 font-semibold text-xs tracking-wider uppercase">{t('helper_dashboard.messages_recent')}</h3>
               <p className="text-[11px] text-gray-500 mt-1 leading-snug">{t('helper_dashboard.messages_sub')}</p>
             </div>
             
             <Link
               to={ROUTES.messages}
               className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-white border border-gray-200 text-sm font-bold text-blue-700 hover:bg-blue-50 hover:border-blue-200 transition-colors shadow-sm"
             >
               <Icons.MessageCircle className="w-4 h-4 shrink-0" />
               {t('helper_dashboard.messages_cta')}
             </Link>
          </div>
        </div>
      </div>

      <UpcomingJobDetailModal
        job={upcomingModalJobFresh}
        open={showUpcomingModal}
        onClose={() => {
          setShowUpcomingModal(false);
          setUpcomingModalJob(null);
        }}
        t={t}
        translateCategory={translateCategory}
        locale={upcomingLocale}
        onUpdateWorkflow={updateUpcomingWorkflow}
      />

      <HelperProposalModal
        open={Boolean(proposalJob)}
        job={proposalJob}
        submitting={proposalJob ? applyingJobId === proposalJob.id : false}
        creditBalance={creditBalance}
        onClose={handleProposalClose}
        onSubmit={(amount, message) => proposalJob && void submitApply(proposalJob, amount, message)}
        t={t}
        language={language}
        distanceKm={proposalJob ? baseDistanceToJobKm(proposalJob) : null}
      />

      <HelperInsufficientCreditsModal
        open={insufficientCreditsLc != null}
        requiredLc={insufficientCreditsLc ?? 0}
        onClose={() => setInsufficientCreditsLc(null)}
        t={t}
        language={language}
      />

      <HelperOpportunityDetailModal
        job={detailOpportunity}
        open={Boolean(detailOpportunity)}
        onClose={() => setDetailOpportunity(null)}
        hasApplied={detailOpportunity ? appliedJobIds.has(detailOpportunity.id) : false}
        isApplying={detailOpportunity ? applyingJobId === detailOpportunity.id : false}
        onApply={requestApply}
        clientReviewCount={
          detailOpportunity ? reviewCountByUserId.get(detailOpportunity.clientId) ?? 0 : 0
        }
        t={t}
        translateCategory={translateCategory}
        formatJobSchedule={formatJobScheduleDisplay}
        distanceKm={detailOpportunity ? baseDistanceToJobKm(detailOpportunity) : null}
        distanceFromBase={hasHelperBaseAddress}
        needsBaseAddress={!hasHelperBaseAddress}
      />

      {clientProfileJob ? (
        <div className="fixed inset-0 z-[85] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            aria-label={t('common.close')}
            onClick={() => setClientProfileJob(null)}
          />
          <section className="relative w-full max-w-md rounded-t-3xl border border-slate-100 bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={clientProfileJob.clientAvatar}
                  alt=""
                  className="h-16 w-16 rounded-2xl border-2 border-white object-cover shadow-md ring-1 ring-slate-100"
                />
                <div className="min-w-0">
                  <p className="truncate text-xl font-black text-slate-950">{clientProfileJob.clientName}</p>
                  {clientProfileJob.clientRating != null && clientProfileJob.clientRating > 0 ? (
                    <p className="mt-0.5 flex items-center gap-1 text-sm font-bold text-amber-600">
                      <Icons.Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {t('helper_public.avg_rating', { rating: clientProfileJob.clientRating.toFixed(1) })}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">{t('service_review.no_rating_yet')}</p>
                  )}
                  <p className="truncate text-sm font-bold text-slate-500">
                    {[clientProfileJob.city, clientProfileJob.region].filter(Boolean).join(', ') ||
                      clientProfileJob.location ||
                      'Quebec'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClientProfileJob(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Perfil público do cliente</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-emerald-950">
                Cliente responsivo. Dados sensíveis ficam protegidos até haver conversa dentro do app.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ['Score', '92%'],
                ['Pedidos anteriores', jobs.filter((job) => job.clientId === clientProfileJob.clientId).length],
                ['Taxa de resposta', 'Alta'],
                ['Avaliações', 'Positivas'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-sm font-black text-slate-950">Avaliações recebidas de helpers</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
                Bom alinhamento antes do serviço e respostas claras no chat interno.
              </p>
            </div>
          </section>
        </div>
      ) : null}

    </AppPageShell>
  );
}
