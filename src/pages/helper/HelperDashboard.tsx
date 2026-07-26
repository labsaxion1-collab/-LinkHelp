import React, { useState, useEffect, useMemo } from 'react';
import { Briefcase, Clock, MapPin, X, CheckCircle2, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import * as Icons from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { useAuth } from '@/context/AuthContext';
import { uploadAvatarImage } from '@/lib/storageUpload';
import { logMediaPicker } from '@/utils/mediaPickerDebug';
import { fetchHelperSkills } from '@/services/supabase/helperSkillsRemote';
import { parseSkillKey, skillSubLabelKey } from '@/data/helperSkillsCatalog';
import { useLanguage } from '@/context/LanguageContext';
import { resolveLanguageLabel } from '@/services/translationService';
import { useAppDataCore, useAppDataActionsRef, type UpcomingJob } from '@/context/AppDataContext';
import { useToast } from '@/context/ToastContext';
import { useCredits } from '@/context/CreditContext';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { UpcomingJobsSidebar } from '@/components/helpers/UpcomingJobsSidebar';
import { UpcomingJobDetailModal } from '@/components/modals/UpcomingJobDetailModal';
import {
  isJobInterestFull,
  isRequestExclusiveLockedForViewer,
} from '@/utils/applicationInterest';
import { resolveCategoryId, translateCategory, translateJobTitle } from '@/utils/translateCategory';
import { formatJobScheduleDisplay } from '@/utils/jobDisplay';
import { BRAND } from '@/utils/brandAssets';
import { ROUTES } from '@/utils/constants';
import type { Job } from '@/types/job';
import { HelperProfileCompletionBar } from '@/components/helpers/portfolio/HelperProfileCompletionBar';
import { HelperCreditsWalletCard } from '@/components/helpers/HelperCreditsWalletCard';
import { HelperStatsStrip, type HelperStatsStripModel } from '@/components/helpers/HelperStatsStrip';
import { HelperOpportunityCard } from '@/components/opportunities/HelperOpportunityCard';
import { HelperCategoryDropdown } from '@/components/helper/HelperCategoryDropdown';
import { HelperInsufficientCreditsModal } from '@/components/modals/HelperInsufficientCreditsModal';
import { getApplicationChargeLc } from '@/config/helperCreditCharge';
import { getExclusiveApplicationChargeLc } from '@/utils/helperCreditDisplay';
import { InsufficientCreditsError, leadCostsForJob } from '@/services/helperLeadCredits';
import { recordMarketSignal } from '@/services/marketSignals';
import { persistLocalDismissedRequest } from '@/services/supabase/helperDismissedRemote';
import { useHelperDismissedRequests } from '@/hooks/useHelperDismissedRequests';
import { recordProposalAnalytics, type ProposalAnalyticsSource } from '@/services/proposalAnalytics';
import { getBrowserTimezone } from '@/utils/browserTimezone';
import { hapticSuccess } from '@/utils/haptic';
import { buildReviewCountByUserId } from '@/utils/reviewCounts';
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
  distanceFromExactHelperBaseToJobKm,
  helperBaseCoordinates,
  helperHasBaseAddress,
  helperHasExactBaseCoordinates,
} from '@/utils/helperBaseLocation';
import { isJobCancelled } from '@/utils/jobVisibility';
import {
  filterToPreferredCategoriesIfPossible,
  getHelperCategoryPreferences,
  getJobServiceCategoryId,
  sortJobsByHelperCategoryPreference,
} from '@/utils/helperCategoryPreferences';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { CreditsUsageDashboard } from '@/components/features/CreditsUsageDashboard';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { LhCard } from '@/components/design-system/LhCard';
import { HelperDashboardHeroSlot } from '@/components/helper/HelperDashboardHeroSlot';
import { GamificationProgressCard } from '@/gamification/components/GamificationProgressCard';
import { useGamification } from '@/gamification/hooks/useGamification';
import { useMarkHomeDashboardSurfaceReady } from '@/components/home/HomeDashboardShellContext';
import { useDevRenderCount } from '@/utils/devRenderCount';
import { useProgressiveReveal } from '@/hooks/useProgressiveReveal';
import { appPerfMark } from '@/utils/appPerf';

type HelperHomeInfoSlide = {
  id: string;
  icon: React.ReactNode;
  message: string;
};

const CATEGORY_THUMBNAILS: Record<string, string> = {
  cleaning: 'from-sky-100 via-white to-blue-100',
  sanitization: 'from-cyan-100 via-white to-emerald-100',
  moving: 'from-indigo-100 via-white to-sky-100',
  assembly: 'from-amber-100 via-white to-blue-100',
  automotive: 'from-slate-100 via-white to-blue-100',
  translation: 'from-violet-100 via-white to-blue-100',
  beauty: 'from-pink-100 via-white to-blue-100',
  renovation: 'from-orange-100 via-white to-blue-100',
  outdoor: 'from-emerald-100 via-white to-blue-100',
  pet: 'from-lime-100 via-white to-blue-100',
  tech: 'from-blue-100 via-white to-indigo-100',
  other: 'from-slate-100 via-white to-blue-100',
};

export default function HelperDashboard() {
  useMarkHomeDashboardSurfaceReady();
  const location = useLocation();
  const navigate = useNavigate();
  const [postText, setPostText] = useState('');
  const [activeTab, setActiveTab] = useState<'match' | 'recentes' | 'emergencia'>('match');
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const isSubmittingApplyRef = React.useRef(false);
  const [exitingJobIds, setExitingJobIds] = useState<Set<string>>(() => new Set());
  const [toastNotification, setToastNotification] = useState<{message: string, show: boolean}>({message: '', show: false});
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<string[]>([]);
  const [insufficientCreditsLc, setInsufficientCreditsLc] = useState<number | null>(null);
  const [activeInfoSlide, setActiveInfoSlide] = useState(0);
  const [heroParallaxOffset, setHeroParallaxOffset] = useState(0);
  const feedTabsRef = React.useRef<HTMLDivElement | null>(null);
  const helperGamification = useGamification('helper');

  // Modals state
  const [profileSettings, setProfileSettings] = useState<HelperProfileSettings>(() => loadHelperProfileSettings());
  const [skillsLoaded, setSkillsLoaded] = useState(false);
  type ProfileSetupModal = null | 'avatar';
  const [profileSetupModal, setProfileSetupModal] = useState<ProfileSetupModal>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState<AvatarUploadDraft | null>(null);

  const { t, language } = useLanguage();
  const me = useSessionViewer();
  const { session, profile, isConfigured, updateProfile, refreshProfile } = useAuth();
  const { dismissedIds: dismissedJobIds, dismissJob: persistDismissJob, markDismissedInState } =
    useHelperDismissedRequests(session?.user?.id);
  const { showToast } = useToast();
  const {
    jobs,
    applications,
    upcomingJobs,
    dataLoading,
    reviews,
  } = useAppDataCore();
  const appDataActionsRef = useAppDataActionsRef();
  useDevRenderCount('HelperDashboard');
  const reviewCountByUserId = useMemo(() => buildReviewCountByUserId(reviews), [reviews]);
  const { refreshCredits, transactions: creditTransactions, unlocks } = useCredits();
  const { balance: walletBalance, loading: walletLoading } = useWalletBalance();
  const selectFeedTab = React.useCallback(
    (tab: 'match' | 'recentes' | 'emergencia') => {
      const previousTop = feedTabsRef.current?.getBoundingClientRect().top;
      setActiveTab(tab);

      if (previousTop == null) return;

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const nextTop = feedTabsRef.current?.getBoundingClientRect().top;
          if (nextTop == null) return;
          window.scrollBy({ top: nextTop - previousTop, left: 0, behavior: 'auto' });
        });
      });
    },
    [],
  );

  useEffect(() => {
    const st = location.state as { openUpgrade?: boolean } | null;
    if (st?.openUpgrade) {
      navigate(ROUTES.helperLinkCredits, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    const st = location.state as { openTab?: string } | null;
    if (st?.openTab === 'candidaturas') {
      navigate(ROUTES.helperJobs, { replace: true, state: { tasksTab: 'applications' } });
    }
  }, [location.state, navigate]);

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
  const hasCategories = profileSettings.skillIds.length > 0;
  const helperBaseCoords = useMemo(() => helperBaseCoordinates(profile), [profile]);
  const hasHelperBaseAddress = useMemo(() => helperHasBaseAddress(profile), [profile]);
  const hasExactBaseCoords = useMemo(() => helperHasExactBaseCoordinates(profile), [profile]);
  const baseAddressPendingCoords = hasHelperBaseAddress && !hasExactBaseCoords;
  const baseDistanceToJobKm = React.useCallback(
    (job: Job) => distanceFromExactHelperBaseToJobKm(profile, job),
    [profile],
  );
  const homeInfoSlides = useMemo<HelperHomeInfoSlide[]>(() => {
    const slides: HelperHomeInfoSlide[] = [
      {
        id: 'nearby-opportunities',
        icon: <Icons.Sparkles className="h-4 w-4" />,
        message: t('helper_dashboard.banner_nearby_opportunities'),
      },
    ];

    if (categoryPrefs.hasExplicitPreference) {
      slides.push({
        id: 'category-preferences',
        icon: <Icons.Sparkles className="h-4 w-4" />,
        message: t('helper_dashboard.banner_category_focus'),
      });
    }

    slides.push({
      id: 'base-address',
      icon: <Icons.MapPinned className="h-4 w-4" />,
      message: hasHelperBaseAddress
        ? t('helper_dashboard.banner_base_address_active')
        : t('helper_dashboard.base_address_banner'),
    });

    return slides;
  }, [categoryPrefs.hasExplicitPreference, hasHelperBaseAddress, t]);

  useEffect(() => {
    if (activeInfoSlide >= homeInfoSlides.length) {
      setActiveInfoSlide(0);
    }
  }, [activeInfoSlide, homeInfoSlides.length]);

  useEffect(() => {
    if (homeInfoSlides.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveInfoSlide((current) => (current + 1) % homeInfoSlides.length);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [homeInfoSlides.length]);

  useEffect(() => {
    let frameId = 0;

    const updateHeroParallax = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        setHeroParallaxOffset(Math.min(window.scrollY * 0.18, 42));
      });
    };

    updateHeroParallax();
    window.addEventListener('scroll', updateHeroParallax, { passive: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', updateHeroParallax);
    };
  }, []);

  useEffect(() => {
    if (!isConfigured || !storageUserId) return;
    let cancelled = false;
    void (async () => {
      const remote = await fetchHelperSkills(storageUserId);
      if (cancelled) return;
      setProfileSettings((prev) => ({ ...prev, skillIds: remote }));
      setSkillsLoaded(true);
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
    const keys = helperProfileSuggestionKeys(completionBreakdown).filter(
      (k) => k !== 'helper_profile_completion.suggest_skills',
    );
    return keys.map((k) => t(k));
  }, [completionBreakdown, t]);

  const pushToast = React.useCallback((message: string) => {
    setToastNotification({ message, show: true });
    setTimeout(() => setToastNotification({ message: '', show: false }), 4500);
  }, []);

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
  }, []);

  const [showIdeaModal, setShowIdeaModal] = useState(false);

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
      setSelectedCategoryFilters([]);
    } else if (location.pathname === ROUTES.helperDashboard) {
      setActiveTab('match');
      setSelectedCategoryFilters([]);
    }
  }, [location.pathname]);

  const [upcomingModalJob, setUpcomingModalJob] = useState<UpcomingJob | null>(null);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [applyExpandedJobId, setApplyExpandedJobId] = useState<string | null>(null);

  useEffect(() => {
    const openJobId = (location.state as { openJobId?: string } | null)?.openJobId;
    if (!openJobId) return;
    const job = jobs.find((j) => j.id === openJobId);
    if (job) setApplyExpandedJobId(job.id);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, jobs, navigate, location.pathname]);
  const helperUserId = session?.user?.id ?? profile?.id ?? (me?.id && me.id !== 'guest' && me.id !== '…' ? me.id : null);

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
  const helperApplications = useMemo(
    () => appDataActionsRef.current.getHelperApplications(helperUserId ?? ''),
    [applications, helperUserId, appDataActionsRef],
  );
  const helperEngagedJobIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const app of helperApplications) {
      if (app.status === 'cancelled') continue;
      ids.add(app.jobId);
    }
    for (const upcoming of upcomingJobs) {
      if (upcoming.helperId === (helperUserId ?? me?.id ?? '')) {
        ids.add(upcoming.jobId);
      }
    }
    return ids;
  }, [helperApplications, upcomingJobs, helperUserId, me?.id]);
  const appliedJobIds = new Set(
    helperApplications.filter((a) => a.status !== 'cancelled').map((a) => a.jobId),
  );
  const interestCostForJob = React.useCallback(
    (job: Job) =>
      getApplicationChargeLc(leadCostsForJob(job, { distanceKm: baseDistanceToJobKm(job) })),
    [baseDistanceToJobKm],
  );

  const openInsufficientCreditsModal = React.useCallback((job: Job, requiredLc?: number) => {
    setInsufficientCreditsLc(requiredLc ?? interestCostForJob(job));
  }, [interestCostForJob]);

  const hasInterestCredits = React.useCallback(
    (job: Job): boolean => {
      if (walletLoading && walletBalance == null) {
        pushToast(t('common.loading'));
        return false;
      }
      const required = interestCostForJob(job);
      if (walletBalance == null) {
        pushToast(t('helper_credits.insufficient_balance_unknown'));
        return false;
      }
      if (walletBalance < required) {
        openInsufficientCreditsModal(job);
        return false;
      }
      return true;
    },
    [walletLoading, walletBalance, interestCostForJob, openInsufficientCreditsModal, pushToast, t],
  );
  const proposalSourceRef = React.useRef<ProposalAnalyticsSource>('card');
  const goToCredits = React.useCallback(() => navigate(ROUTES.helperLinkCredits), [navigate]);
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
    if (!helperUserId) {
      return {
        sent: 0,
        accepted: 0,
        completed: 0,
        responseRatePct: null,
        avgRating: me?.rating ?? 0,
        estimatedEarnings: '—',
        reputation: 0,
        matchScore: 0,
      };
    }
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
    const reputation = Math.min(100, completed * 8 + accepted * 5 + Math.round((me?.rating ?? 0) * 8));
    const hash = (helperUserId ?? '0').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const matchScore = Math.min(99, 72 + (hash % 18) + Math.min(8, accepted * 2));
    return {
      sent,
      accepted,
      completed,
      responseRatePct,
      avgRating: me?.rating ?? 0,
      estimatedEarnings,
      reputation,
      matchScore,
    };
  }, [helperApplications, helperUserId, jobs, me?.rating]);

  const needsStatusUpdate = helperUpcomingList.some(
    (job) =>
      job.scheduledAt < Date.now() &&
      job.workflowStatus !== 'completed' &&
      job.workflowStatus !== 'cancelled' &&
      job.workflowStatus !== 'awaiting_client_confirmation' &&
      job.workflowStatus !== 'completion_requested',
  );

  const dismissJobWithAnimation = React.useCallback(
    (jobId: string, job?: Job) => {
      if (job) {
        persistDismissJob(
          job,
          {
            distanceKm: baseDistanceToJobKm(job),
            source: 'recommendation',
          },
          { updateState: false },
        );
      } else {
        const found = jobs.find((j) => j.id === jobId);
        if (found) {
          persistDismissJob(
            found,
            {
              distanceKm: baseDistanceToJobKm(found),
              source: 'recommendation',
            },
            { updateState: false },
          );
        } else if (helperUserId) {
          persistLocalDismissedRequest(helperUserId, jobId);
        }
      }
      setExitingJobIds((prev) => new Set(prev).add(jobId));
      window.setTimeout(() => {
        markDismissedInState(jobId);
        setExitingJobIds((prev) => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      }, 520);
    },
    [persistDismissJob, markDismissedInState, jobs, baseDistanceToJobKm, helperUserId],
  );

  const logProposalAnalytics = React.useCallback(
    (event: 'submitted', job: Job, extra?: { proposedAmount?: number | null }) => {
      recordProposalAnalytics({
        requestId: job.id,
        helperId: helperUserId,
        event,
        source: proposalSourceRef.current,
        proposedAmount: extra?.proposedAmount ?? null,
        budgetMin: job.budgetMin ?? null,
        budgetMax: job.budgetMax ?? null,
        durationMs: null,
        timezone: getBrowserTimezone(),
      });
    },
    [helperUserId],
  );

  const submitApply = async (
    job: Job,
    proposedAmount: number | null,
    proposalMessage?: string | null,
    proposalOptions?: { isExclusive?: boolean },
  ) => {
    if (appliedJobIds.has(job.id) || isSubmittingApplyRef.current) return;
    if (!helperUserId) {
      showToast(t('auth.errors.not_signed_in'), 'error');
      return;
    }
    const distanceKm = baseDistanceToJobKm(job);
    const isExclusive = proposalOptions?.isExclusive === true;
    const requiredCredits = isExclusive
      ? getExclusiveApplicationChargeLc(leadCostsForJob(job, { distanceKm }))
      : interestCostForJob(job);
    if (walletLoading && walletBalance == null) {
      showToast(t('common.loading'), 'error');
      return;
    }
    if (walletBalance == null || walletBalance < requiredCredits) {
      if (isExclusive) {
        showToast(
          t('helper_credits.insufficient_interest_body', { required: requiredCredits }),
          'error',
        );
      } else {
        openInsufficientCreditsModal(job);
      }
      return;
    }

    isSubmittingApplyRef.current = true;
    setApplyingJobId(job.id);
    try {
      await appDataActionsRef.current.applyForJob(job.id, helperUserId, proposedAmount, {
        distanceKm,
        message: proposalMessage ?? null,
        isExclusive: proposalOptions?.isExclusive === true,
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
      dismissJobWithAnimation(job.id);
      setToastNotification({ message: t('helper_dashboard.toast_apply_success'), show: true });
      setTimeout(() => setToastNotification({ message: '', show: false }), 4000);
    } catch (err: unknown) {
      if (err instanceof InsufficientCreditsError) {
        openInsufficientCreditsModal(job);
        return;
      }
      const msg =
        err instanceof Error
          ? err.message
          : err && typeof err === 'object' && 'message' in err
            ? String((err as { message?: unknown }).message ?? '')
            : '';
      if (msg === 'ALREADY_APPLIED') {
        showToast(t('helper_dashboard.already_interested'), 'error');
        return;
      }
      if (msg === 'APPLICATION_LIMIT_REACHED') {
        showToast(t('helper_dashboard.application_limit_reached'), 'error');
        return;
      }
      if (msg === 'EXCLUSIVE_APPLICATION_LOCKED') {
        showToast(t('helper_dashboard.exclusive_application_locked'), 'error');
        return;
      }
      const friendlyMsg =
        msg === 'APPLICATION_BACKEND_NOT_READY' ||
        msg.includes('helper_debit_application_interest') ||
        msg.includes('schema cache') ||
        msg.includes('APPLICATION_INSERT_FAILED')
          ? t('helper_dashboard.toast_apply_error')
          : msg || t('helper_dashboard.toast_apply_error');
      showToast(friendlyMsg, 'error');
    } finally {
      setApplyingJobId(null);
      isSubmittingApplyRef.current = false;
    }
  };

  const handleCardSubmitApply = React.useCallback(
    (job: Job, proposedAmount: number, options: { isExclusive: boolean }) => {
      if (appliedJobIds.has(job.id) || isSubmittingApplyRef.current) return;
      if (!helperUserId) {
        showToast(t('auth.errors.not_signed_in'), 'error');
        return;
      }
      const distanceKm = baseDistanceToJobKm(job);
      const isExclusive = options.isExclusive === true;
      const requiredCredits = isExclusive
        ? getExclusiveApplicationChargeLc(leadCostsForJob(job, { distanceKm }))
        : interestCostForJob(job);
      if (walletLoading && walletBalance == null) {
        showToast(t('common.loading'), 'error');
        return;
      }
      if (walletBalance == null || walletBalance < requiredCredits) {
        if (isExclusive) {
          showToast(
            t('helper_credits.insufficient_interest_body', { required: requiredCredits }),
            'error',
          );
        } else {
          openInsufficientCreditsModal(job, requiredCredits);
        }
        return;
      }
      proposalSourceRef.current = 'card';
      void submitApply(job, proposedAmount, null, options);
    },
    [
      appliedJobIds,
      helperUserId,
      baseDistanceToJobKm,
      interestCostForJob,
      walletLoading,
      walletBalance,
      openInsufficientCreditsModal,
      showToast,
      submitApply,
      t,
    ],
  );

  const displayedJobs = useMemo(() => {
    if (profileSettings.skillIds.length === 0) return [];
    const viewerId = helperUserId ?? me?.id ?? '';
    let list = jobs.filter(
      (j) => j.status === 'open' && !isJobCancelled(j) && j.clientId !== viewerId,
    );
    if (activeTab === 'emergencia') {
      list = list.filter((j) => j.urgency === 'high');
    } else if (activeTab === 'recentes') {
      list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    } else if (activeTab === 'match') {
      list = sortOpportunitiesForHelper(list, {
        origin: helperBaseCoords,
        helperSkillIds: profileSettings.skillIds,
      });
    }
    list = filterToPreferredCategoriesIfPossible(
      sortJobsByHelperCategoryPreference(list, categoryPrefs),
      categoryPrefs,
    );
    if (selectedCategoryFilters.length) {
      list = list.filter((j) => {
        const id = resolveCategoryId(j.category) || j.category;
        return selectedCategoryFilters.includes(id);
      });
    }
    return list.filter((j) => {
      if (dismissedJobIds.has(j.id) || helperEngagedJobIds.has(j.id)) return false;
      if (isRequestExclusiveLockedForViewer(j, applications, viewerId)) return false;
      return !isJobInterestFull(j.applicantCount ?? 0);
    });
  }, [
    jobs,
    applications,
    selectedCategoryFilters,
    activeTab,
    helperBaseCoords,
    profileSettings.skillIds,
    helperUserId,
    categoryPrefs,
    dismissedJobIds,
    me?.id,
    helperEngagedJobIds,
  ]);

  const progressiveFeedJobs = useProgressiveReveal(displayedJobs, 3, 700);

  useEffect(() => {
    appPerfMark('helper-home-structure');
  }, []);

  const feedActiveTab =
    activeTab === 'match' || activeTab === 'recentes' || activeTab === 'emergencia' ? activeTab : 'match';

  const radarJobs = filterToPreferredCategoriesIfPossible<Job>(
    jobs.filter(
      (j) =>
        j.status === 'open' &&
        !isJobCancelled(j) &&
        j.clientId !== (helperUserId ?? me?.id ?? '') &&
        !helperEngagedJobIds.has(j.id) &&
        !isRequestExclusiveLockedForViewer(j, applications, helperUserId ?? me?.id ?? '') &&
        !isJobInterestFull(j.applicantCount ?? 0),
    ),
    categoryPrefs,
  )
    .map((job) => ({ job, distanceKm: baseDistanceToJobKm(job) }))
    .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
    .slice(0, 3);
  const helperFirstName = (me?.name || profile?.name || t('helper_dashboard.fallback_helper_name')).split(' ')[0] || t('helper_dashboard.fallback_helper_name');
  const isPerformancePage = location.pathname === ROUTES.helperPerformance;
  const showDesktopBack =
    location.pathname === ROUTES.helperPerformance ||
    location.pathname === ROUTES.helperOpportunities;

  return (
    <div data-lh-dashboard-mounted="helper" className="min-w-0 w-full">
    <AppPageShell wide className="min-w-0 overflow-x-hidden pt-0 sm:pt-0">
      {/* Toast Notification */}
      {toastNotification.show && (
        <div className="fixed top-20 right-4 z-[100] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className="w-[calc(100vw-2rem)] max-w-80 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg border border-gray-800 flex items-center gap-3">
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
          <div className="space-y-3">
            {completionBreakdown.percent < 100 && !completionBreakdown.profilePhoto ? (
              <HelperProfileCompletionBar
                breakdown={completionBreakdown}
                onRowClick={onCompletionRowClick}
                suggestions={completionSuggestions}
                hideSkillsRow
              />
            ) : null}
            {profile?.spoken_languages?.length ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <h4 className="text-sm font-bold text-gray-900">{t('helper_dashboard.languages_label')}</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.spoken_languages.map((id) => (
                    <span key={id} className="rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-black text-blue-800">
                      {resolveLanguageLabel(id, t)}
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
                navigate(ROUTES.profilePublicEdit);
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
      {/* Idea Modal */}
      {UI_VISIBILITY.ideas && showIdeaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowIdeaModal(false)}>
           <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-[60px] pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none"></div>
              
              <div className="p-4 sm:p-6 border-b border-gray-800 flex items-start justify-between gap-3 relative z-10">
                 <div>
                   <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2"><Icons.Lightbulb className="w-5 h-5 shrink-0 text-yellow-400" /> {t('helper_dashboard.idea_modal_title')}</h3>
                   <p className="text-sm text-gray-400 font-medium tracking-tight">{t('helper_dashboard.idea_modal_subtitle')}</p>
                 </div>
                 <button onClick={() => setShowIdeaModal(false)} className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full transition-colors">
                   <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="p-6 relative z-10 flex-1 overflow-y-auto">
                 <div className="space-y-3">
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
                  onClick={() => navigate(ROUTES.helperJobs, { state: { tasksTab: 'applications' } })}
                  className={`flex min-h-[38px] w-full items-center gap-2 rounded-xl px-2 text-xs font-black ${
                    location.pathname === ROUTES.helperJobs ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-white'
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
        <main className="min-w-0 w-full max-w-full pb-2">
          {showDesktopBack ? <DesktopBackButton className="mb-4" /> : null}

          {isPerformancePage ? (
            <div className="space-y-3">
              <HelperStatsStrip dataLoading={dataLoading} stats={helperMvpStats} t={t} />
              <GamificationProgressCard userType="helper" />
              {UI_VISIBILITY.helperCredits ? (
                <CreditsUsageDashboard unlocks={unlocks} transactions={creditTransactions} />
              ) : null}
              <div className="lh-medal-card-active rounded-xl border bg-white p-4 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">{t('helper_dashboard.stats_strip_title')}</h2>
                <p className="lh-medal-text mt-1 text-sm font-medium">{t('helper_dashboard.score_section_performance')}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border lh-medal-border lh-medal-light-bg p-4">
                    <p className="lh-medal-text text-xs font-black uppercase tracking-wide">{t('helper_dashboard.nav_applications')}</p>
                    <p className="mt-1 text-xl sm:text-2xl font-black text-slate-950">{helperMvpStats.sent}</p>
                  </div>
                  <div className="rounded-xl border lh-medal-border lh-medal-light-bg p-4">
                    <p className="lh-medal-text text-xs font-black uppercase tracking-wide">{t('helper_dashboard.score_metric_response_rate')}</p>
                    <p className="mt-1 text-xl sm:text-2xl font-black text-slate-950">
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
                <span>{t('helper_dashboard.status_update_banner')}</span>
              </div>
            </div>
          ) : null}

          {/* Hero dinâmica: gamification.heroKey é a única fonte da verdade */}
          <HelperDashboardHeroSlot
            gamification={helperGamification.record}
            gamificationLoading={helperGamification.loading}
            gamificationError={helperGamification.error}
            avatarUrl={helperAvatarUrl ?? me.avatar}
            balance={walletBalance}
            completedServices={helperMvpStats.completed}
            satisfactionRate={helperMvpStats.responseRatePct}
            rating={helperMvpStats.avgRating}
            connectedProfessionals={helperMvpStats.accepted}
          />
          <section
              className="relative isolate hidden mb-8 w-screen min-w-[100vw] max-w-none overflow-hidden pb-8 pt-0"
              style={{ marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)' }}
            >
              <img
                src={BRAND.heroTools}
                alt=""
                aria-hidden="true"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[62%_top] opacity-100 transition-transform duration-200 ease-out"
                style={{ transform: `translate3d(0, ${-heroParallaxOffset}px, 0)` }}
              />
              <img
                src={BRAND.helperHeroRibbon}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="pointer-events-none absolute left-1/2 top-[12.8rem] h-28 w-[130vw] max-w-none -translate-x-1/2 object-cover object-center opacity-45 mix-blend-screen blur-[0.2px] sm:top-[13.5rem] sm:h-32"
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.92)_34%,rgba(255,255,255,0.42)_61%,rgba(255,255,255,0.18)_100%)]" />
              <div className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-28 bg-gradient-to-b from-transparent via-white/80 to-[#F7F9FD]" />
              <div className="pointer-events-none absolute left-0 top-0 h-full w-[55vw] bg-[radial-gradient(circle_at_16%_26%,rgba(37,99,255,0.11),transparent_42%)]" />
              <header className="relative z-[1] mb-3 flex min-h-[40px] items-start justify-between gap-3 px-6 pr-[calc(9.75rem+1.5rem)] sm:px-7 sm:pr-[calc(9.75rem+1.75rem)]">
                <div className="min-w-0">
                  <p className="bg-gradient-to-r from-[#0B1220] via-[#123D85] to-[#2563FF] bg-clip-text text-2xl font-black leading-none tracking-tight text-transparent">
                    {t('helper_dashboard.brand_label')}
                  </p>
                  <span className="mt-2 block h-1 w-14 rounded-full bg-gradient-to-r from-[#2563FF] to-[#33B6FF] shadow-[0_8px_18px_rgba(37,99,255,0.24)]" />
                </div>
                {!isPerformancePage && UI_VISIBILITY.helperCredits ? (
                  <div className="absolute right-6 top-0 sm:right-7">
                    <HelperCreditsWalletCard
                      balance={walletBalance}
                      usedThisMonth={creditsUsedThisMonth}
                      unlocksCount={unlocks.length}
                      loading={walletLoading && walletBalance == null}
                      compact
                      t={t}
                      onBuyCredits={goToCredits}
                    />
                  </div>
                ) : null}
              </header>

              <div className="relative z-[1] min-h-[23.4rem] px-6 py-3 sm:px-7">
                <div className="pointer-events-none absolute right-0 top-1 h-20 w-56 rotate-[-12deg] rounded-full bg-[linear-gradient(100deg,transparent,rgba(37,99,255,0.14),transparent)] blur-[1px]" />
                <p className="relative flex items-center gap-2 text-sm font-black text-[#2563FF] drop-shadow-[0_1px_10px_rgba(255,255,255,0.55)]">
                  <span className="text-base" aria-hidden>{t('helper_dashboard.hero_greeting')}</span>
                  {helperFirstName}
                  <span aria-hidden>👋</span>
                </p>
                <h1 className="relative mt-3 max-w-[18rem] text-[2.35rem] font-black leading-[1.02] tracking-tight text-[#071633] drop-shadow-[0_2px_18px_rgba(255,255,255,0.68)] sm:max-w-sm sm:text-5xl">
                  {t('helper_dashboard.hero_title')}{' '}
                  <span className="text-[#2563FF]">{t('helper_dashboard.hero_title_highlight')}</span>
                </h1>
                <span className="relative mt-3 block h-1.5 w-28 rounded-full bg-[#2563FF] shadow-[0_10px_22px_rgba(37,99,255,0.25)]" aria-hidden />
                <p className="relative mt-5 max-w-[15.8rem] text-[13px] font-bold leading-relaxed text-[#42526B] drop-shadow-[0_1px_12px_rgba(255,255,255,0.70)] sm:max-w-xs sm:text-sm">
                  {t('helper_dashboard.hero_sub')}
                </p>
                <div className="relative mt-7 flex max-w-[18.2rem] items-center gap-3 text-[11px] font-black text-[#10234A] sm:max-w-sm">
                  <span className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white/78 text-[#2563FF] shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-white/70">
                      <Icons.ShieldCheck className="h-4 w-4" />
                    </span>
                    {t('helper_dashboard.hero_badge_verified')}
                  </span>
                  <span className="h-8 w-px bg-slate-300/70" aria-hidden />
                  <span className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white/78 text-[#2563FF] shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-white/70">
                      <Icons.Star className="h-4 w-4" />
                    </span>
                    {t('helper_dashboard.hero_badge_active_clients')}
                  </span>
                </div>

                {homeInfoSlides.length > 0 ? (() => {
                  const slide = homeInfoSlides[activeInfoSlide] ?? homeInfoSlides[0];

                  return (
                    <div className="relative mt-8 flex h-[7.2rem] max-w-md flex-col items-center justify-center overflow-hidden rounded-[1.65rem] border border-white/45 bg-[#071D48]/94 px-4 py-3 text-center text-xs font-bold text-white shadow-[0_18px_42px_rgba(8,31,84,0.20)] backdrop-blur-xl" aria-live="polite">
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(51,182,255,0.36),transparent_36%),linear-gradient(135deg,rgba(37,99,255,0.34),transparent_54%)]" />
                      <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-sky-300/20 blur-2xl" />
                      <div key={slide.id} className="relative flex w-full flex-col items-center justify-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/14 text-white shadow-[0_10px_22px_rgba(37,99,255,0.22)] ring-1 ring-white/18">
                          {slide.icon}
                        </span>
                        <span className="mx-auto line-clamp-2 max-w-[19rem] leading-relaxed text-white/95">{slide.message}</span>
                      </div>
                      <div className="relative mt-2.5 flex items-center justify-center gap-1.5" aria-hidden>
                        {homeInfoSlides.map((item, index) => (
                          <span
                            key={item.id}
                            className={clsx(
                              'h-1.5 rounded-full transition-all duration-300',
                              index === activeInfoSlide ? 'w-5 bg-white' : 'w-1.5 bg-white/35',
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })() : null}
              </div>

          </section>

          <section className="relative mb-8">
              <div className="relative mb-3 flex items-center justify-between px-1 sm:px-2">
                <h2 className="text-base font-black tracking-tight text-[#0B1220]">{t('helper_dashboard.categories_heading')}</h2>
                {selectedCategoryFilters.length ? (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-[#2563FF]">
                    {t(
                      selectedCategoryFilters.length === 1
                        ? 'helper_dashboard.categories_selected_one'
                        : 'helper_dashboard.categories_selected_other',
                      { count: selectedCategoryFilters.length },
                    )}
                  </span>
                ) : null}
              </div>

              <HelperCategoryDropdown
                open
                onToggle={() => undefined}
                selectedIds={selectedCategoryFilters}
                onToggleCategory={(categoryId) => {
                  setSelectedCategoryFilters((current) =>
                    current.includes(categoryId)
                      ? current.filter((id) => id !== categoryId)
                      : [...current, categoryId],
                  );
                  setActiveTab('match');
                }}
                onClear={() => setSelectedCategoryFilters([])}
                t={t}
                inline
                className="relative mt-0"
              />
            </section>

          <div ref={feedTabsRef} className="relative mb-5 overflow-hidden rounded-[1.55rem] border border-white/45 bg-[#071D48]/92 p-1.5 shadow-[0_18px_42px_rgba(8,31,84,0.18)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(51,182,255,0.26),transparent_34%),linear-gradient(135deg,rgba(37,99,255,0.22),transparent_48%)]" />
            <div className="relative grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => selectFeedTab('match')}
                className={`min-h-[46px] rounded-[1.15rem] px-2 text-[10px] font-black leading-tight transition-all duration-300 sm:text-[11px] ${activeTab === 'match' ? 'bg-white text-[#2563FF] shadow-[0_10px_22px_rgba(37,99,255,0.22)]' : 'text-white/78 hover:bg-white/10 hover:text-white'}`}
              >
                <span className="mx-auto flex w-fit flex-col items-center gap-1">
                  {t('helper_dashboard.tab_match')}
                  <span className={`h-1 rounded-full transition-all duration-300 ${activeTab === 'match' ? 'w-5 bg-[#2563FF]' : 'w-1 bg-white/35'}`} />
                </span>
              </button>
              <button
                type="button"
                onClick={() => selectFeedTab('recentes')}
                className={`min-h-[46px] rounded-[1.15rem] px-2 text-[10px] font-black leading-tight transition-all duration-300 sm:text-[11px] ${activeTab === 'recentes' ? 'bg-white text-[#2563FF] shadow-[0_10px_22px_rgba(37,99,255,0.22)]' : 'text-white/78 hover:bg-white/10 hover:text-white'}`}
              >
                <span className="mx-auto flex w-fit flex-col items-center gap-1">
                  {t('helper_dashboard.tab_recent')}
                  <span className={`h-1 rounded-full transition-all duration-300 ${activeTab === 'recentes' ? 'w-5 bg-[#2563FF]' : 'w-1 bg-white/35'}`} />
                </span>
              </button>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xl font-black tracking-tight text-[#0B1220]">{t('helper_dashboard.feed_title_jobs')}</h2>
            {displayedJobs.length > 0 && (
              <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[11px] font-black text-[#2563FF]">
                {displayedJobs.length}
              </span>
            )}
          </div>

          {/* Posts (Feed) */}
          <div className="space-y-3">
            {displayedJobs.length > 0 ? (
              <div
                className={clsx(
                  'grid w-full max-w-full min-w-0 grid-cols-1 gap-5 transition-[filter,opacity] duration-300',
                  applyingJobId && 'pointer-events-none brightness-[0.92] md:brightness-[0.88]',
                )}
              >
              {progressiveFeedJobs.map((job, idx) => (
                    <div
                      key={job.id}
                      className={clsx(
                        'lh-feed-card-enter min-w-0 transition-[margin,opacity,transform] duration-[420ms] ease-[cubic-bezier(0.34,1.15,0.64,1)]',
                        exitingJobIds.has(job.id) &&
                          'pointer-events-none -mt-3 scale-[0.92] opacity-0 -translate-x-6 rotate-[-2deg]',
                      )}
                      style={{ '--card-idx': idx } as React.CSSProperties}
                    >
                      <HelperOpportunityCard
                        job={job}
                        activeTab={feedActiveTab}
                        hasApplied={appliedJobIds.has(job.id)}
                        isApplying={applyingJobId === job.id}
                        isExiting={exitingJobIds.has(job.id)}
                        interactionLocked={Boolean(applyingJobId)}
                        proposalOpen={applyingJobId === job.id}
                        distanceKm={baseDistanceToJobKm(job)}
                        distanceFromBase={hasExactBaseCoords}
                        needsBaseAddress={!hasHelperBaseAddress}
                        baseAddressPendingCoords={baseAddressPendingCoords}
                        applicationsCount={job.applicantCount ?? 0}
                        clientReviewCount={reviewCountByUserId.get(job.clientId) ?? 0}
                        onSubmitApply={handleCardSubmitApply}
                        exclusiveLocked={
                          helperUserId
                            ? isRequestExclusiveLockedForViewer(job, helperApplications, helperUserId)
                            : false
                        }
                        descriptionExpanded={applyExpandedJobId === job.id}
                        onDescriptionExpandedChange={(expanded) => {
                          if (expanded) setApplyExpandedJobId(job.id);
                          else if (applyExpandedJobId === job.id) setApplyExpandedJobId(null);
                        }}
                        walletBalance={walletBalance}
                        language={language}
                        t={t}
                        translateCategory={translateCategory}
                        formatJobSchedule={formatJobScheduleDisplay}
                      />
                    </div>
              ))}
              </div>
            ) : skillsLoaded && !hasCategories ? (
              <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-[rgba(37,99,255,0.16)] bg-gradient-to-br from-white to-[#f4f7ff] px-6 py-14 text-center shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
                <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 shadow-[0_8px_24px_rgba(37,99,255,0.12)]">
                  <Icons.Briefcase className="h-8 w-8 text-[#2563FF]" strokeWidth={1.75} />
                </span>
                <p className="text-[15px] font-bold text-[#0B1220]">{t('helper_dashboard.no_categories_title')}</p>
                <p className="mt-2 max-w-[18rem] text-[13px] font-medium text-[#94A3B8]">{t('helper_dashboard.empty_feed_no_categories')}</p>
                <button
                  type="button"
                  onClick={() => navigate(`${ROUTES.profilePublicEdit}#helper-categories`)}
                  className="mt-5 rounded-2xl bg-[#2563FF] px-5 py-2.5 text-[13px] font-black text-white shadow-[0_4px_14px_rgba(37,99,255,0.30)] transition-opacity hover:opacity-90 active:opacity-80"
                >
                  {t('helper_dashboard.add_categories_cta')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-[rgba(37,99,255,0.16)] bg-gradient-to-br from-white to-[#f4f7ff] px-6 py-14 text-center shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
                <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 shadow-[0_8px_24px_rgba(37,99,255,0.12)]">
                  <Icons.SearchX className="h-8 w-8 text-[#2563FF]" strokeWidth={1.75} />
                </span>
                <p className="text-[15px] font-bold text-[#0B1220]">{t('helper_dashboard.empty_feed')}</p>
                <p className="mt-1 text-[13px] font-medium text-[#94A3B8]">{t('helper_dashboard.empty_feed_sub')}</p>
              </div>
            )}
          </div>
          </>
          ) : null}
        </main>

        {/* Right Sidebar */}
        <div className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-120px)] space-y-4">
          
          {/* Live Opportunity Radar */}
          <div className="overflow-hidden rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_2px_12px_rgba(15,23,42,0.05),0_6px_28px_rgba(15,23,42,0.05)] transition-shadow duration-200 hover:shadow-[0_8px_32px_rgba(15,23,42,0.08)]">
             <div className="flex items-center justify-between border-b border-[rgba(15,23,42,0.05)] p-4">
                <div className="flex items-center gap-2">
                   <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
                     <Icons.Crosshair className="h-3.5 w-3.5 text-[#2563FF]" />
                   </span>
                   <h3 className="text-sm font-black text-[#0B1220]">{t('helper_dashboard.radar_title')}</h3>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">{t('helper_dashboard.radar_badge_neutral')}</span>
             </div>
             <div className="space-y-1.5 p-3">
               {radarJobs.length ? radarJobs.map(({ job, distanceKm }) => (
                 <button
                   key={job.id}
                   type="button"
                   onClick={() => {
                     setSelectedCategoryFilters([resolveCategoryId(job.category) || job.category]);
                     setActiveTab(job.urgency === 'high' ? 'emergencia' : 'match');
                     navigate(ROUTES.helperOpportunities);
                   }}
                   className="flex w-full items-center gap-3 rounded-[14px] border border-[rgba(15,23,42,0.06)] bg-[#f7f8fc] p-3 text-left transition-all duration-200 hover:border-blue-200 hover:bg-blue-50 hover:shadow-[0_4px_14px_rgba(37,99,255,0.08)]"
                 >
                   <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white shadow-[0_2px_8px_rgba(37,99,255,0.08)]">
                     <Icons.MapPin className="h-4 w-4 text-[#2563FF]" />
                   </span>
                   <span className="min-w-0 flex-1">
                     <span className="block truncate text-[13px] font-black text-[#0B1220]">{translateJobTitle(job.title, job.category, job.subcategory, t)}</span>
                     <span className="block truncate text-[11px] font-bold text-[#94A3B8]">
                       {!hasHelperBaseAddress
                         ? t('helper_dashboard.base_address_missing_short')
                         : baseAddressPendingCoords
                           ? t('helper_dashboard.base_address_saved_pending_coords')
                           : distanceKm != null
                             ? t('helper_dashboard.distance_from_base_km', { km: distanceKm.toFixed(1) })
                             : job.city || job.location}
                     </span>
                   </span>
                   <span className={`rounded-full px-2 py-1 text-[10px] font-black ${job.urgency === 'high' ? 'border border-rose-100 bg-rose-50 text-rose-600' : 'border border-blue-100 bg-blue-50 text-[#2563FF]'}`}>
                     {job.value}
                   </span>
                 </button>
               )) : (
                 <p className="rounded-[14px] border border-dashed border-[rgba(37,99,255,0.15)] p-4 text-center text-[12px] font-bold text-[#94A3B8]">
                   {t('helper_dashboard.empty_feed')}
                 </p>
               )}
             </div>
             <Link to={ROUTES.map} className="flex items-center justify-center gap-1.5 border-t border-[rgba(15,23,42,0.05)] bg-[#f7f8fc] p-2.5 text-center transition-colors hover:bg-blue-50">
                 <Icons.Map className="h-3.5 w-3.5 text-[#2563FF]" />
                 <span className="text-[12px] font-bold text-[#2563FF]">{t('helper_dashboard.radar_expand_map')}</span>
             </Link>
          </div>

          <UpcomingJobsSidebar
            helperId={helperUserId ?? me?.id ?? ''}
            jobs={helperUpcomingList}
            locale={upcomingLocale}
            t={t}
            translateCategory={translateCategory}
            onSelectJob={(job) => {
              setUpcomingModalJob(job);
              setShowUpcomingModal(true);
            }}
            onQuickReject={(job) => appDataActionsRef.current.updateUpcomingWorkflow(job.id, 'cancelled')}
          />
          
          <div className="overflow-hidden rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.05)]">
             <div className="mb-3">
               <h3 className="text-[11px] font-black uppercase tracking-wider text-[#94A3B8]">{t('helper_dashboard.messages_recent')}</h3>
               <p className="mt-1 text-[12px] font-medium leading-snug text-[#6B7280]">{t('helper_dashboard.messages_sub')}</p>
             </div>
             <Link
               to={ROUTES.messages}
               className="flex items-center justify-center gap-2 w-full rounded-[14px] bg-gradient-to-br from-[#2563FF] to-[#1D55E8] px-3 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_22px_rgba(37,99,255,0.22)] transition-all hover:shadow-[0_12px_28px_rgba(37,99,255,0.30)] hover:-translate-y-0.5"
             >
               <Icons.MessageCircle className="h-4 w-4 shrink-0" />
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
        onUpdateWorkflow={(id, status) => appDataActionsRef.current.updateUpcomingWorkflow(id, status)}
      />

      <HelperInsufficientCreditsModal
        open={insufficientCreditsLc != null}
        requiredLc={insufficientCreditsLc ?? 0}
        currentBalance={walletBalance}
        onClose={() => setInsufficientCreditsLc(null)}
        t={t}
        language={language}
      />

    </AppPageShell>
    </div>
  );
}
