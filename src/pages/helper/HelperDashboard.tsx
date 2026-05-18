import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Star, Briefcase, Clock, MapPin, Check, X, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { useAuth } from '@/context/AuthContext';
import { uploadAvatarImage } from '@/lib/storageUpload';
import { logMediaPicker } from '@/utils/mediaPickerDebug';
import { fetchHelperSkills, syncHelperSkills } from '@/services/supabase/helperSkillsRemote';
import { initialsForName } from '@/utils/avatarUrl';
import { filterValidSkillKeys, parseSkillKey, skillSubLabelKey } from '@/data/helperSkillsCatalog';
import { useLanguage } from '@/context/LanguageContext';
import { useAppMode } from '@/context/AppModeContext';
import { useAppData, type UpcomingJob } from '@/context/AppDataContext';
import { useToast } from '@/context/ToastContext';
import { UpcomingJobsSidebar } from '@/components/helpers/UpcomingJobsSidebar';
import { UpcomingJobDetailModal } from '@/components/modals/UpcomingJobDetailModal';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import { resolveCategoryId, translateCategory } from '@/utils/translateCategory';
import { formatJobSchedule } from '@/utils/jobDisplay';
import { ROUTES } from '@/utils/constants';
import { isSupabaseConfigured } from '@/lib/supabase';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import type { HelperSubscriptionTier } from '@/types/helperSubscription';
import type { Application } from '@/types/application';
import { HelperPlanBadge } from '@/components/helpers/HelperPlanBadge';
import {
  HelperSubscriptionPlanModal,
  type HelperPlanModalView,
} from '@/components/helpers/HelperSubscriptionPlanModal';
import { HelperProfileCompletionBar } from '@/components/helpers/portfolio/HelperProfileCompletionBar';
import { HelperSidebarDisclosure } from '@/components/helpers/HelperSidebarDisclosure';
import { HelperStatsStrip, type HelperStatsStripModel } from '@/components/helpers/HelperStatsStrip';
import { HelperOpportunityCard } from '@/components/opportunities/HelperOpportunityCard';
import { SkillsProfileModal } from '@/components/helpers/profile-setup/ProfileSetupModals';
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

function formatSubscriptionBillingDate(iso: string | undefined, language: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  const loc = language === 'fr' ? 'fr-CA' : language === 'pt' ? 'pt-BR' : 'en-CA';
  return d.toLocaleDateString(loc, { month: 'long', day: 'numeric', year: 'numeric' });
}

function sidebarBenefitsForTier(
  tier: HelperSubscriptionTier,
  t: (key: string, options?: Record<string, string | number>) => string,
): string[] {
  switch (tier) {
    case 'BASIC':
      return [1, 2, 3, 4, 5, 6].map((n) => t(`helper_dashboard.subscription_basic_${n}`));
    case 'ELITE':
      return [1, 2, 3, 4, 5, 6, 7, 8].map((n) => t(`helper_dashboard.subscription_elite_${n}`));
    case 'PRO_HELP':
      return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => t(`helper_dashboard.subscription_pro_help_${n}`));
    default:
      return [];
  }
}

export default function HelperDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [postText, setPostText] = useState('');
  const [activeTab, setActiveTab] = useState<'match' | 'recentes' | 'emergencia' | 'candidaturas'>('match');
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<{message: string, show: boolean}>({message: '', show: false});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Application | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  // Modals state
  const [planModal, setPlanModal] = useState<HelperPlanModalView | null>(null);
  const [profileSettings, setProfileSettings] = useState<HelperProfileSettings>(() => loadHelperProfileSettings());
  type ProfileSetupModal = null | 'avatar' | 'skills';
  const [profileSetupModal, setProfileSetupModal] = useState<ProfileSetupModal>(null);
  const [avatarDraft, setAvatarDraft] = useState<AvatarUploadDraft | null>(null);

  const { t, language } = useLanguage();
  const me = useSessionViewer();
  const { session, profile, isConfigured, updateProfile, refreshProfile } = useAuth();
  const { switchToClient } = useAppMode();

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
    setMobileWorkspaceOpen(false);
  }, [location.pathname, activeTab]);

  useEffect(() => {
    saveHelperProfileSettings(profileSettings);
  }, [profileSettings]);

  const storageUserId = session?.user?.id ?? profile?.id ?? null;
  const helperAvatarUrl = profile?.avatar_url?.trim() || profileSettings.avatarDataUrl?.trim() || null;
  const helperInitials = initialsForName(me.name);

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
    async (ids: string[]) => {
      const valid = filterValidSkillKeys(ids);
      setProfileSettings((p) => ({ ...p, skillIds: valid }));
      if (!isConfigured || !storageUserId) return;
      try {
        await syncHelperSkills(storageUserId, valid);
        pushToast(t('profile_setup.skills_saved_ok'));
      } catch {
        pushToast(t('profile_setup.skills_save_error'));
        throw new Error('SKILLS_SYNC');
      }
    },
    [isConfigured, storageUserId, pushToast, t],
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

  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);

  const helperTier: HelperSubscriptionTier = me.subscriptionTier ?? 'BASIC';
  const subscriptionBenefitLines = React.useMemo(
    () => sidebarBenefitsForTier(helperTier, t),
    [helperTier, t],
  );
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

  const insights = React.useMemo(() => {
    const base: {
      title: string;
      desc: string;
      icon: React.ReactNode;
      colors: { bgOuter: string; border: string; bgInner: string; text: string };
    }[] = [
      {
        title: t('helper_dashboard.insight_0_title'),
        desc: t('helper_dashboard.insight_0_desc'),
        icon: <Icons.Flame className="w-3.5 h-3.5 text-orange-500" />,
        colors: { bgOuter: 'from-orange-50 to-white', border: 'border-orange-100/50', bgInner: 'bg-orange-200/40', text: 'text-orange-900' },
      },
      {
        title: t('helper_dashboard.insight_1_title'),
        desc: t('helper_dashboard.insight_1_desc'),
        icon: <Icons.TrendingUp className="w-3.5 h-3.5 text-blue-500" />,
        colors: { bgOuter: 'from-blue-50 to-white', border: 'border-blue-100/50', bgInner: 'bg-blue-200/40', text: 'text-blue-900' },
      },
      {
        title: t('helper_dashboard.insight_2_title'),
        desc: t('helper_dashboard.insight_2_desc'),
        icon: <Icons.Star className="w-3.5 h-3.5 text-yellow-500" />,
        colors: { bgOuter: 'from-yellow-50 to-white', border: 'border-yellow-100/50', bgInner: 'bg-yellow-200/40', text: 'text-yellow-900' },
      },
    ];
    return base;
  }, [t]);

  useEffect(() => {
    setCurrentInsightIndex((i) => i % Math.max(insights.length, 1));
  }, [insights.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentInsightIndex((prev) => (prev + 1) % insights.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [insights.length]);

  useEffect(() => {
    if (location.pathname === ROUTES.helperOpportunities) {
      setActiveTab('match');
      setSelectedCategoryFilter('');
    }
  }, [location.pathname]);

  const { jobs, applyForJob, getHelperApplications, upcomingJobs, updateUpcomingWorkflow, updateApplicationStatus, dataLoading } = useAppData();
  const { showToast } = useToast();

  const [upcomingModalJob, setUpcomingModalJob] = useState<UpcomingJob | null>(null);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);

  const helperUpcomingList = React.useMemo(
    () =>
      upcomingJobs
        .filter((u) => u.helperId === me.id)
        .sort((a, b) => a.scheduledAt - b.scheduledAt),
    [upcomingJobs],
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
  const helperApplications = getHelperApplications(me.id);
  const appliedJobIds = new Set(
    helperApplications.filter((a) => a.status !== 'cancelled').map((a) => a.jobId),
  );

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

  const handleApply = async (jobId: string) => {
    if (appliedJobIds.has(jobId)) return;
    setApplyingJobId(jobId);
    try {
      await applyForJob(jobId, me.id);
      setToastNotification({ message: t('helper_dashboard.toast_apply_success'), show: true });
      setTimeout(() => setToastNotification({ message: '', show: false }), 4000);
      if (isSupabaseConfigured()) {
        showToast(t('helper_dashboard.apply_chat_unlock_hint'), 'info');
      }
      navigate(ROUTES.messages, {
        state: { composeDraft: t('helper_dashboard.apply_compose_seed') },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'ALREADY_APPLIED') {
        setToastNotification({ message: t('helper_dashboard.apply_duplicate'), show: true });
        setTimeout(() => setToastNotification({ message: '', show: false }), 4000);
      } else {
        alert(msg || 'Error');
      }
    } finally {
      setApplyingJobId(null);
    }
  };

  const confirmCancelApplication = async () => {
    if (!cancelTarget) return;
    const job = jobs.find((j) => j.id === cancelTarget.jobId);
    if (!job) {
      setCancelTarget(null);
      return;
    }
    setCancelBusy(true);
    try {
      await updateApplicationStatus(cancelTarget.id, 'cancelled');
      showToast(t('helper_dashboard.toast_application_cancelled'), 'success');
      setCancelTarget(null);
    } catch (e) {
      console.error(e);
      showToast(t('helper_dashboard.toast_application_cancel_err'), 'error');
    } finally {
      setCancelBusy(false);
    }
  };

  // Filter jobs based on activeTab
  let displayedJobs = jobs.filter(j => j.status === 'open');
  if (selectedCategoryFilter) {
    displayedJobs = displayedJobs.filter((j) => {
      const id = resolveCategoryId(j.category) || j.category;
      return id === selectedCategoryFilter;
    });
  }
  
  if (activeTab === 'emergencia') {
    displayedJobs = displayedJobs.filter(j => j.urgency === 'high');
  } else if (activeTab === 'recentes') {
    displayedJobs = [...displayedJobs].sort((a, b) => b.createdAt - a.createdAt);
  } else if (activeTab === 'candidaturas') {
    displayedJobs = []; // handled separately
  }

  return (
    <div className="bg-[#f0f2f5] min-h-[calc(100vh-64px)] py-4 sm:py-6 -mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
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

      {/* Score Modal */}
      {showScoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowScoreModal(false)}>
           <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <div>
                   <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Star className="w-6 h-6 text-yellow-500 fill-yellow-500" /> {t('helper_dashboard.score_modal_title')}</h3>
                   <p className="text-sm text-gray-500 font-medium">{t('helper_dashboard.score_modal_subtitle')}</p>
                 </div>
                 <button onClick={() => setShowScoreModal(false)} className="p-2 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 rounded-full text-gray-500 transition-colors">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-6 overflow-y-auto hide-scrollbar">
                 <div className="flex flex-col md:flex-row items-center gap-6 mb-8 p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="w-32 h-32 relative flex items-center justify-center shrink-0">
                       <svg className="w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 36 36">
                          <path className="text-white/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"/>
                          <path className="text-yellow-400" strokeDasharray="75, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-black">75</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">{t('helper_dashboard.score_points_label')}</span>
                       </div>
                    </div>
                    <div className="flex-1 text-center md:text-left z-10">
                       <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-white text-xs font-bold uppercase tracking-wider mb-2 border border-white/20">
                          <ShieldCheck className="w-3.5 h-3.5" /> {t('helper_dashboard.trusted_level_score')}
                       </div>
                       <h2 className="text-2xl font-bold mb-1">{t('helper_dashboard.score_encourage_title', { name: me.name.split(' ')[0] || me.name })}</h2>
                       <p className="text-blue-100 text-sm font-medium leading-relaxed">
                          {t('helper_dashboard.score_encourage_line1')}{' '}
                          <strong className="text-white">{t('helper_badges.pro_helper')}</strong>
                          {t('helper_dashboard.score_encourage_line2')}
                       </p>
                    </div>
                 </div>

                 <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Icons.Activity className="w-4 h-4 text-gray-400" /> {t('helper_dashboard.score_section_performance')}</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                       <div className="flex justify-between items-center mb-2">
                         <span className="text-sm font-bold text-gray-700">{t('helper_dashboard.score_metric_reviews')}</span>
                         <span className="text-sm font-black text-gray-900">98%</span>
                       </div>
                       <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '98%' }}></div>
                       </div>
                    </div>
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                       <div className="flex justify-between items-center mb-2">
                         <span className="text-sm font-bold text-gray-700">{t('helper_dashboard.score_metric_response_rate')}</span>
                         <span className="text-sm font-black text-gray-900">100%</span>
                       </div>
                       <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                       </div>
                    </div>
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                       <div className="flex justify-between items-center mb-2">
                         <span className="text-sm font-bold text-gray-700">{t('helper_dashboard.score_metric_reliability')}</span>
                         <span className="text-sm font-black text-gray-900">95%</span>
                       </div>
                       <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: '95%' }}></div>
                       </div>
                    </div>
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                       <div className="flex justify-between items-center mb-2">
                         <span className="text-sm font-bold text-gray-700">{t('helper_dashboard.score_metric_response_time')}</span>
                         <span className="text-sm font-black text-gray-900">&lt; 5 min</span>
                       </div>
                       <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '90%' }}></div>
                       </div>
                    </div>
                 </div>

                 <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Icons.Award className="w-4 h-4 text-gray-400" /> {t('helper_dashboard.score_badges_title')}</h4>
                 <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 text-yellow-800 px-3 py-2 rounded-xl text-sm font-bold shadow-sm">
                       <Icons.Zap className="w-4 h-4 text-yellow-500" /> {t('helper_dashboard.badge_quick_reply')}
                    </div>
                    <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 text-purple-800 px-3 py-2 rounded-xl text-sm font-bold shadow-sm">
                       <Icons.TrendingUp className="w-4 h-4 text-purple-500" /> {t('helper_dashboard.badge_trending')}
                    </div>
                    <div className="flex items-center gap-2 bg-green-50 border border-green-100 text-green-800 px-3 py-2 rounded-xl text-sm font-bold shadow-sm">
                       <Icons.CheckCircle2 className="w-4 h-4 text-green-500" /> {t('helper_dashboard.badge_super_reliable')}
                    </div>
                 </div>

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
      <SkillsProfileModal
        open={profileSetupModal === 'skills'}
        onClose={() => setProfileSetupModal(null)}
        skillIds={profileSettings.skillIds}
        onSave={(ids) => setProfileSettings((p) => ({ ...p, skillIds: filterValidSkillKeys(ids) }))}
        onSaveAsync={handleSkillsSave}
        t={t}
      />
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

      <button
        type="button"
        aria-label={t('common.close')}
        className={clsx(
          'fixed inset-0 z-[37] bg-slate-900/20 backdrop-blur-[1px] transition-opacity duration-300 md:hidden',
          mobileWorkspaceOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setMobileWorkspaceOpen(false)}
      />

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr_320px] gap-[var(--lh-gutter)] justify-center min-w-0 px-3 sm:px-4 md:px-0">
        {/* Left Sidebar */}
        <aside
          className={clsx(
            'flex flex-col space-y-3 pr-0 md:pr-2 pb-2 min-h-0 overflow-y-auto hide-scrollbar w-full max-w-[280px]',
            'max-md:fixed max-md:left-0 max-md:top-[4.75rem] max-md:z-[38] max-md:h-[calc(100dvh-4.75rem)] max-md:bg-white/[0.98] max-md:backdrop-blur-md max-md:border-r max-md:border-slate-200/90 max-md:shadow-2xl max-md:pl-3 max-md:pt-3 max-md:transition-transform max-md:duration-300 max-md:ease-out',
            mobileWorkspaceOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full max-md:pointer-events-none',
            'md:pointer-events-auto md:static md:z-auto md:h-[calc(100vh-120px)] md:translate-x-0 md:max-w-none md:shadow-none md:border-0 md:bg-transparent md:pl-0 md:pt-0',
            'md:sticky md:top-24',
          )}
        >
          
          {/* User profile & mode — fixed */}
          <div className="shrink-0 rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100/60 overflow-hidden">
            <Link
              to={ROUTES.settings}
              className="flex items-center gap-2.5 p-2.5 hover:bg-slate-50/90 transition-colors group w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200/80"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[avatar-state] open avatar modal (SimpleAvatarUploadModal)');
                  setProfileSetupModal('avatar');
                }}
                className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-label={t('profile_setup.avatar_title')}
              >
                {helperAvatarUrl ? (
                  <img
                    src={helperAvatarUrl}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-slate-200/40"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-slate-200 to-slate-300 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200/40">
                    {helperInitials}
                  </span>
                )}
              </button>
              <div className="flex-1 min-w-0 pr-0.5">
                <span className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors block truncate text-[15px] leading-tight">
                  {me.name}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <HelperPlanBadge tier={helperTier} size="sm" />
                  <span className="text-[10px] text-sky-700 font-bold truncate uppercase tracking-wide">
                    {t('helper_dashboard.mode_helper')}
                  </span>
                </div>
              </div>
              <Icons.ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
            </Link>
            <button
              type="button"
              onClick={() => switchToClient()}
              className="flex items-center justify-center gap-2 w-full p-2 bg-slate-50/90 border-t border-slate-100/90 text-slate-800 hover:bg-slate-100 text-[13px] font-semibold transition-colors focus:ring-2 focus:ring-slate-200 focus:outline-none min-w-0"
            >
              <Icons.RefreshCw className="w-4 h-4 shrink-0 text-slate-500" />
              <span className="truncate">{t('sidebar.switch_client')}</span>
            </button>
          </div>

          {/* Main navigation — fixed */}
          <nav className="space-y-0.5 shrink-0 rounded-xl border border-slate-200/70 bg-slate-50/50 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('match')}
              className={`flex justify-between items-center w-full px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300 min-w-0 ${
                activeTab === 'match' || activeTab === 'recentes' || activeTab === 'emergencia'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'hover:bg-white text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icons.Target
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'match' || activeTab === 'recentes' || activeTab === 'emergencia' ? 'text-sky-400' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{t('helper_dashboard.nav_opportunities')}</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('candidaturas')}
              className={`flex justify-between items-center w-full px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300 min-w-0 ${
                activeTab === 'candidaturas' ? 'bg-slate-900 text-white shadow-sm' : 'hover:bg-white text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icons.ClipboardList
                  className={`w-4 h-4 shrink-0 ${activeTab === 'candidaturas' ? 'text-sky-400' : 'text-slate-400'}`}
                />
                <span className="truncate">{t('helper_dashboard.nav_applications')}</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => navigate(ROUTES.helperJobs)}
              className="flex justify-between items-center w-full px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-sm font-semibold hover:bg-white text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 min-w-0"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-1">
                <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{t('helper_dashboard.nav_active_services')}</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => navigate(ROUTES.settings)}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg transition-colors cursor-pointer text-sm font-semibold hover:bg-white text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 min-w-0"
            >
              <Icons.Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{t('helper_dashboard.nav_availability')}</span>
            </button>
          </nav>

          <div className="space-y-2 shrink-0 min-h-0 pb-1">
            <HelperSidebarDisclosure
              storageKey="profile"
              title={t('helper_dashboard.sidebar_acc_profile')}
              badge={`${completionBreakdown.percent}%`}
              defaultOpen={completionBreakdown.percent < 100}
            >
              <div className="space-y-3">
                <HelperProfileCompletionBar
                  breakdown={completionBreakdown}
                  onRowClick={onCompletionRowClick}
                  suggestions={completionSuggestions}
                />
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {t('helper_dashboard.achievements_title')}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    <div
                      className="flex items-center gap-1 bg-amber-50 text-amber-900 px-2 py-1 rounded-lg text-[11px] font-semibold border border-amber-100/80 cursor-default"
                      title={t('helper_dashboard.tooltip_streak')}
                    >
                      <Icons.Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                      <span className="truncate max-w-[5.5rem]">{t('helper_dashboard.streak_badge')}</span>
                    </div>
                    <div
                      className="flex items-center gap-1 bg-violet-50 text-violet-900 px-2 py-1 rounded-lg text-[11px] font-semibold border border-violet-100/80 cursor-default"
                      title={t('helper_dashboard.tooltip_expert')}
                    >
                      <Icons.Trophy className="w-3 h-3 text-violet-600 shrink-0" />
                      <span className="truncate max-w-[5.5rem]">{t('helper_dashboard.expert_badge')}</span>
                    </div>
                    <div
                      className="flex items-center gap-1 bg-sky-50 text-sky-900 px-2 py-1 rounded-lg text-[11px] font-semibold border border-sky-100/80 cursor-default"
                      title={t('helper_dashboard.tooltip_active')}
                    >
                      <Icons.Zap className="w-3 h-3 text-sky-600 shrink-0" />
                      <span className="truncate max-w-[5.5rem]">{t('helper_dashboard.active_badge')}</span>
                    </div>
                  </div>
                </div>
                <div
                  className={`rounded-lg border bg-gradient-to-r ${insights[currentInsightIndex].colors.bgOuter} ${insights[currentInsightIndex].colors.border} p-2.5 flex items-start gap-2 shadow-sm relative overflow-hidden min-h-[56px]`}
                >
                  <div className="p-1 bg-white/90 rounded-full shadow-sm shrink-0 mt-0.5">
                    <div key={currentInsightIndex} className="flex items-center justify-center">
                      {insights[currentInsightIndex].icon}
                    </div>
                  </div>
                  <p
                    key={currentInsightIndex}
                    className={`text-[11px] leading-snug ${insights[currentInsightIndex].colors.text} font-medium line-clamp-3`}
                  >
                    <strong className="font-semibold">{insights[currentInsightIndex].title}</strong> {insights[currentInsightIndex].desc}
                  </p>
                </div>
              </div>
            </HelperSidebarDisclosure>

            <HelperSidebarDisclosure storageKey="plan" title={t('helper_dashboard.sidebar_acc_plan')}>
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200/90 bg-white p-3 shadow-sm space-y-2.5">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      {t('helper_dashboard.plan_current')}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 leading-tight">
                        {t(`helper_dashboard.subscription_plan_name_${helperTier}`)}
                      </span>
                      <HelperPlanBadge tier={helperTier} size="sm" />
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-600 leading-snug">
                    <span className="font-semibold text-slate-500">{t('helper_dashboard.subscription_next_billing')}</span>{' '}
                    {helperTier === 'BASIC' ? (
                      <span className="font-medium text-slate-800">{t('helper_dashboard.subscription_no_billing')}</span>
                    ) : (
                      <span className="font-medium text-slate-800">
                        {formatSubscriptionBillingDate(me.nextBillingDate, language)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {t('helper_dashboard.subscription_benefits_heading')}
                    </div>
                    <ul className="space-y-1 text-[11px] text-slate-700 font-medium leading-snug max-h-[6.5rem] overflow-y-auto hide-scrollbar">
                      {subscriptionBenefitLines.map((line, i) => (
                        <li key={i} className="flex gap-2">
                          <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setPlanModal('current')}
                      className="w-full py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-[11px] font-bold text-center hover:bg-slate-50 transition-colors"
                    >
                      {t('helper_dashboard.subscription_manage')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlanModal('choose')}
                      className="w-full py-2 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-black transition-colors"
                    >
                      {t('helper_dashboard.subscription_upgrade')}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowScoreModal(true)}
                  className="relative w-full overflow-hidden bg-white p-3 border border-slate-100 rounded-lg shadow-sm hover:border-sky-200 hover:shadow transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="p-1 bg-sky-50 rounded-md text-sky-600">
                      <Star className="w-3.5 h-3.5 fill-sky-500 text-sky-500" />
                    </div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide truncate">
                      {t('helper_dashboard.stat_score_label')}
                    </span>
                  </div>
                  <HelperPlanBadge tier={helperTier} size="sm" />
                  <div className="w-full bg-slate-100 rounded-full h-1 mt-1 relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-full bg-sky-500 rounded-full w-3/4" />
                  </div>
                  <span className="text-[9px] text-slate-500 font-medium block mt-1 line-clamp-2">
                    {t('helper_dashboard.mvp_score_cta')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlanModal('choose')}
                  className="w-full p-3 rounded-lg border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/50 hover:border-indigo-300 transition-colors cursor-pointer text-left relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-200 shadow-sm"
                >
                  <div className="flex items-start gap-2.5 mb-2 relative z-10 w-full min-w-0">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-2 rounded-lg shrink-0 text-white shadow-sm">
                      <Icons.Crown className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-indigo-950 text-xs tracking-tight block leading-tight">
                        {t('helper_dashboard.membership_promo_title')}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-700 mt-0.5 block">
                        {t('helper_dashboard.membership_promo_price')}
                      </span>
                    </div>
                  </div>
                  <ul className="relative z-10 space-y-1 text-[10px] text-indigo-900/90 font-medium leading-snug mb-2">
                    {[1, 2, 3].map((n) => (
                      <li key={n} className="flex gap-1.5 items-start">
                        <Icons.Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" strokeWidth={3} />
                        <span>{t(`helper_dashboard.membership_promo_f${n}`)}</span>
                      </li>
                    ))}
                  </ul>
                  <span className="relative z-10 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 text-white text-[11px] font-bold py-2 hover:bg-indigo-700 transition-colors">
                    {t('helper_dashboard.membership_promo_cta')}
                  </span>
                </button>
              </div>
            </HelperSidebarDisclosure>

            <HelperSidebarDisclosure storageKey="skills" title={t('helper_dashboard.sidebar_acc_skills')}>
              <div className="space-y-1.5">
                {sidebarSkillLines.length === 0 ? (
                  <p className="text-[11px] text-slate-500 font-medium px-1 py-2 leading-snug">
                    {t('helper_dashboard.skills_empty')}
                  </p>
                ) : (
                  sidebarSkillLines.map((skill) => (
                    <div
                      key={skill.key}
                      className="bg-white border border-slate-200 p-2 rounded-lg shadow-sm max-w-full overflow-hidden"
                    >
                      <span className="font-semibold text-slate-900 text-xs truncate block">{skill.label}</span>
                    </div>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => setProfileSetupModal('skills')}
                  className="bg-white border border-slate-200 border-dashed p-2.5 rounded-lg hover:border-sky-300 hover:bg-sky-50/50 cursor-pointer transition-colors flex items-center justify-center gap-1.5 w-full min-h-[44px] min-w-0"
                >
                  <Icons.PlusCircle className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="font-bold text-[10px] text-sky-700 uppercase tracking-wide truncate">{t('helper_dashboard.add_skill_cta')}</span>
                </button>
              </div>
            </HelperSidebarDisclosure>

            {UI_VISIBILITY.ideas ? (
            <HelperSidebarDisclosure storageKey="ideas" title={t('helper_dashboard.sidebar_acc_ideas')}>
              <div className="rounded-xl bg-slate-900 p-3 border border-slate-800 shadow-sm">
                <div className="flex gap-2 mb-2">
                  <div className="flex items-center justify-center shrink-0 w-9 h-9 bg-white/10 rounded-lg border border-white/10">
                    <Icons.Lightbulb className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h4 className="font-semibold text-white text-xs leading-tight">{t('sidebar.ideas')}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">{t('sidebar.ideas_subtitle')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-300 bg-white/5 p-2 rounded-md border border-white/5 mb-2">
                  <Icons.CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{t('helper_dashboard.ideas_sidebar_status_neutral')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIdeaModal(true)}
                  className="w-full py-2.5 min-h-[44px] bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold rounded-lg text-xs transition-colors text-center"
                >
                  {t('ideas.suggest')}
                </button>
              </div>
            </HelperSidebarDisclosure>
            ) : null}
          </div>
        </aside>

        <button
          type="button"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom)+0.75rem)] left-4 z-[39] flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-800 shadow-[var(--lh-shadow-md)] transition-transform active:scale-95 md:hidden"
          onClick={() => setMobileWorkspaceOpen(true)}
          aria-label={t('helper_dashboard.workspace_menu_aria')}
        >
          <Icons.PanelLeft className="w-5 h-5" />
        </button>

        {/* Main Feed */}
        <div className="w-full max-w-[680px] mx-auto">
          <div className="md:hidden mb-4">
            <HelperProfileCompletionBar
              breakdown={completionBreakdown}
              onRowClick={onCompletionRowClick}
              suggestions={completionSuggestions}
            />
          </div>

          <HelperStatsStrip dataLoading={dataLoading} stats={helperMvpStats} t={t} />

          {/* Job Categories Filter & Tabs */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              {activeTab === 'candidaturas' ? (
                <><Icons.ClipboardList className="w-5 h-5 text-blue-600" /> {t('helper_dashboard.filter_apps_title')}</>
              ) : (
                <><Icons.Target className="w-5 h-5 text-blue-600" /> {t('helper_dashboard.filter_find_title')}</>
              )}
            </h3>
            
            <div className="flex gap-2 overflow-x-auto pb-3 mb-3 border-b border-gray-100 hide-scrollbar">
              <button 
                onClick={() => setSelectedCategoryFilter('')} 
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${!selectedCategoryFilter ? 'bg-blue-50 text-blue-700 border-2 border-blue-200' : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'}`}
              >
                <Icons.Layers className="w-4 h-4" /> {t('helper_dashboard.all_categories')}
              </button>
              {SERVICE_CATEGORIES.map((cat) => {
                const IconComponent = (Icons as any)[cat.icon] || Icons.HelpCircle;
                const isSelected = selectedCategoryFilter === cat.id;
                return (
                  <button 
                    key={cat.id}
                    onClick={() => setSelectedCategoryFilter(cat.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${isSelected ? 'bg-blue-50 text-blue-700 border-2 border-blue-200 shadow-sm' : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'}`}
                  >
                    <IconComponent className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} /> {t(`categories.${cat.id}`)}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              <button onClick={() => setActiveTab('match')} className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'match' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{t('helper_dashboard.tab_match')}</button>
              <button onClick={() => setActiveTab('recentes')} className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'recentes' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{t('helper_dashboard.tab_recent')}</button>
              <button onClick={() => setActiveTab('emergencia')} className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'emergencia' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{t('helper_dashboard.tab_emergency')}</button>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{activeTab === 'candidaturas' ? t('helper_dashboard.feed_title_apps') : t('helper_dashboard.feed_title_jobs')}</h2>
          </div>

          {/* Posts (Feed) */}
          <div className="space-y-4">
            {activeTab === 'candidaturas' ? (
              helperApplications.length > 0 ? (
                helperApplications.map(app => {
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
                    <div key={app.id} className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden hover:shadow-md transition-shadow duration-200">
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
                        <h4 className="text-lg font-bold text-gray-900 mb-3 leading-tight">{job.title}</h4>
                        <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-2">
                          <span className="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-gray-600"><Clock className="w-3.5 h-3.5 text-gray-400" /> {formatJobSchedule(job.date, t)}</span>
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
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 border-dashed">
                  <Icons.ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">{t('helper_dashboard.empty_applications')}</p>
                </div>
              )
            ) : displayedJobs.length > 0 ? (
              displayedJobs.map((job) => {
                const hasApplied = appliedJobIds.has(job.id);
                const isApplying = applyingJobId === job.id;
                return (
                  <React.Fragment key={job.id}>
                    <HelperOpportunityCard
                      job={job}
                      activeTab={activeTab === 'match' || activeTab === 'recentes' || activeTab === 'emergencia' ? activeTab : 'match'}
                      hasApplied={hasApplied}
                      isApplying={isApplying}
                      onApply={handleApply}
                      t={t}
                      translateCategory={translateCategory}
                      formatJobSchedule={formatJobSchedule}
                    />
                  </React.Fragment>
                );
              })
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 border-dashed">
                <Icons.SearchX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">{t('helper_dashboard.empty_feed')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-120px)] space-y-4">
          
          {/* Live Opportunity Radar Map Widget */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden hover:shadow-md transition-shadow duration-200">
             <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Icons.Crosshair className="w-4 h-4 text-blue-600" />
                   <h3 className="font-bold text-gray-900 text-sm">{t('helper_dashboard.radar_title')}</h3>
                </div>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">{t('helper_dashboard.radar_badge_neutral')}</span>
             </div>
             <div className="relative h-40 bg-gray-900 flex items-center justify-center overflow-hidden">
                {/* Dark Radar Background Pattern */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                
                {/* Radar Sweep Effect */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border border-blue-500/20 rounded-full z-0 motion-reduce:animate-none"></div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-blue-500/35 rounded-full z-0"></div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 origin-center animate-[spin_6s_linear_infinite] z-0 motion-reduce:animate-none opacity-90">
                  <div className="w-20 h-20 bg-gradient-to-tr from-blue-500/25 to-transparent rounded-tl-full"></div>
                </div>

                {/* Simulated Opportunity Pins */}
                <div className="absolute top-1/4 left-1/3 z-10 motion-reduce:animate-none animate-pulse [animation-duration:2.6s]">
                   <div className="relative group cursor-pointer flex justify-center items-center">
                     <div className="w-2.5 h-2.5 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.8)]"></div>
                     <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 text-[10px] font-bold px-2 py-1 rounded-md -top-7 whitespace-nowrap shadow-lg">{t('helper_dashboard.radar_pin_translation')}</div>
                   </div>
                </div>

                <div className="absolute bottom-1/3 right-1/4 z-10 motion-reduce:animate-none animate-pulse [animation-duration:2.9s]">
                   <div className="relative group cursor-pointer flex justify-center items-center">
                     <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                     <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 text-[10px] font-bold px-2 py-1 rounded-md -top-7 whitespace-nowrap shadow-lg">{t('helper_dashboard.radar_pin_move')}</div>
                   </div>
                </div>

                <div className="absolute top-1/2 right-1/3 z-10 motion-reduce:animate-none animate-pulse [animation-duration:3.2s]">
                   <div className="relative group cursor-pointer flex justify-center items-center">
                     <div className="w-2.5 h-2.5 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.8)]"></div>
                     <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 text-[10px] font-bold px-2 py-1 rounded-md -top-7 whitespace-nowrap shadow-lg">{t('helper_dashboard.radar_pin_assembly')}</div>
                   </div>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-0 border-t border-gray-100 bg-white">
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.map)}
                  className="p-3 border-r border-gray-100 text-left hover:bg-gray-50 transition-colors cursor-pointer group focus:outline-none focus:bg-gray-100"
                >
                   <p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">{t('helper_dashboard.radar_footer_nearby_title')}</p>
                   <p className="text-[10px] text-gray-500 font-medium mt-0.5 leading-snug">{t('helper_dashboard.radar_footer_nearby_sub')}</p>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.helperOpportunities)}
                  className="p-3 text-left hover:bg-gray-50 transition-colors cursor-pointer group focus:outline-none focus:bg-gray-100"
                >
                   <p className="text-xs font-bold text-red-700 group-hover:text-red-800 transition-colors leading-snug">{t('helper_dashboard.radar_footer_urgent_title')}</p>
                   <p className="text-[10px] text-gray-500 font-medium mt-0.5 leading-snug">{t('helper_dashboard.radar_footer_urgent_sub')}</p>
                </button>
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

    </div>
  );
}
