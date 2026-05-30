import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, MapPin, Clock, Star, MessageSquare, ChevronRight, CheckCircle2, Bell } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAppData, type OfficialHirePayload } from '@/context/AppDataContext';
import { useServiceReview } from '@/context/ServiceReviewContext';
import { SERVICE_CATEGORIES, isOfficialServiceCategoryId } from '@/data/serviceCategories';
import { getCategoryLucideIcon } from '@/utils/categoryIcons';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { formatJobScheduleDisplay, isBeautyScheduledJob } from '@/utils/jobDisplay';
import { ROUTES } from '@/utils/constants';
import { avatarUrlForName } from '@/utils/avatarUrl';
import { HelperPlanBadge } from '@/components/helpers/HelperPlanBadge';
import { CreateRequestModal } from '@/components/client/create-request/CreateRequestModal';
import { TrainingCertBadge } from '@/components/training/TrainingCertBadge';
import type { TrainingCertLevel } from '@/utils/helperTrainingProgress';
import { helperPlanFromRoleKey, helperTierFromApplication } from '@/utils/helperPlanFromRoleKey';
import { ClientMapWidget } from '@/components/client/ClientMapWidget';
import { ClientNearbyHelpersList } from '@/components/client/ClientNearbyHelpersList';
import { useNearbyHelpers } from '@/hooks/useNearbyHelpers';
import type { NearbyHelperMapPoint } from '@/types/nearbyHelper';
import { LhCard } from '@/components/design-system/LhCard';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { useToast } from '@/context/ToastContext';
import { UserProfileModal } from '@/components/profile/UserProfileModal';
import { JobTaskActionsBar } from '@/components/features/JobTaskActionsBar';
import { HelperPublicProfileView } from '@/components/features/HelperPublicProfileView';
import { formatJobBudgetDisplay } from '@/utils/formatJobBudget';
import { formatMoneyAmount, jobHasBoundedBudget } from '@/utils/jobProposal';
import {
  findClientHelperApplication,
  isClientChatUnlockedForHelper,
} from '@/utils/chatHireGate';
import {
  hideJobForUser,
  isJobExpired,
  isJobCancelled,
  isJobVisibleToClient,
  readHiddenJobIds,
} from '@/utils/jobVisibility';
import { translateJobTitle } from '@/utils/translateCategory';

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
  id: number;
  name: string;
  roleKey: 'pro_helper' | 'elite' | 'trusted';
  roleColor: string;
  rating: number;
  avatar: string;
  skills: readonly string[];
  isOnline: boolean;
  trainingCert: TrainingCertLevel;
};

const RECOMMENDED_HELPERS: RecommendedHelperCard[] = [];

function estimateClientLeadQuality(description: string, location: string, budget: string, applicationsCount: number): number {
  let score = 52;
  if (description.trim().length > 120) score += 16;
  if (location.trim()) score += 12;
  if (budget.trim() && !/negotiable|combinar|agree/i.test(budget)) score += 12;
  if (applicationsCount > 0) score += 8;
  return Math.min(score, 98);
}

export default function ClientDashboard() {
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
  const [hiddenJobIds, setHiddenJobIds] = useState<Set<string>>(() => new Set());
  const [acceptingApplicationId, setAcceptingApplicationId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const isClientJobsPage = routerLocation.pathname === ROUTES.clientJobs;

  const { t } = useLanguage();
  const { showToast } = useToast();
  const skillChip = (skill: string) =>
    skill === 'support' ? t('skills.support') : t(`categories.${skill}`);
  const { jobs, applications, notifications, updateApplicationStatus, updateJobStatus, officiallyHireHelper, pendingServiceReviews } = useAppData();
  const { openReviewByRequestId } = useServiceReview();
  const me = useSessionViewer();

  const myJobIds = useMemo(() => jobs.filter((j) => j.clientId === me.id).map((j) => j.id), [jobs, me.id]);

  const profileChatUnlocked = useMemo(() => {
    if (!selectedHelper) return false;
    return isClientChatUnlockedForHelper(String(selectedHelper.id), myJobIds, applications);
  }, [selectedHelper, myJobIds, applications]);

  const profileApplicationId = useMemo(() => {
    if (selectedApplicationId) return selectedApplicationId;
    if (!selectedHelper) return null;
    return findClientHelperApplication(String(selectedHelper.id), myJobIds, applications)?.id ?? null;
  }, [selectedApplicationId, selectedHelper, myJobIds, applications]);

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

  useEffect(
    () => () => {
      if (successModalTimerRef.current) clearTimeout(successModalTimerRef.current);
    },
    [],
  );

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

  const openHelperProfile = (helper: RecommendedHelperCard, applicationId?: string) => {
    setSelectedHelper(helper);
    setSelectedApplicationId(applicationId ?? null);
    setShowHelperProfileModal(true);
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
  });

  const removeClientJob = async (jobId: string) => {
    await updateJobStatus(jobId, 'cancelled');
    hideJobForUser(me.id, jobId);
    setHiddenJobIds(readHiddenJobIds(me.id));
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
    setShowHelperProfileModal(true);
  };

  const handleProfileMessageClick = () => {
    if (profileChatUnlocked) {
      setShowHelperProfileModal(false);
      navigate(ROUTES.messages);
      return;
    }
    showToast(t('helper_profile.chat_locked_hint'), 'info');
  };

  const handleAcceptProposal = async (job: Job, app: Application, slotIndex: number) => {
    console.log('[Accept proposal]', {
      requestId: job.id,
      applicationId: app.id,
      helperId: app.helperId,
      proposedAmount: app.proposedAmount ?? null,
      slotIndex,
    });

    if (acceptingApplicationId) return;
    setAcceptingApplicationId(app.id);

    const payload: OfficialHirePayload = {
      requestId: job.id,
      applicationId: app.id,
      helperId: app.helperId,
      proposedAmount: app.proposedAmount ?? null,
      slotIndex,
    };

    try {
      const conversationId = await officiallyHireHelper(payload, '');
      showToast(t('client_dashboard.helper_hired_success_toast'), 'success');
      if (conversationId) {
        navigate(`${ROUTES.messages}?c=${conversationId}`);
      }
    } catch (error) {
      console.error(error);
      showToast(t('hire_modal.error_toast'), 'error');
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
      const conversationId = await officiallyHireHelper(
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
      console.error(error);
      showToast(t('hire_modal.error_toast'), 'error');
    }
  };

  const openCreateModal = (categoryId = '', subcategoryId = '') => {
    setCreateInitialCategory(categoryId);
    setCreateInitialSubcategory(subcategoryId);
    setShowCreateModal(true);
  };

  return (
    <AppPageShell wide className="min-w-0 overflow-x-hidden">
      {/* Toast Notification */}
      {toastNotification.show && (
        <div className="fixed top-20 right-4 z-[100] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg border border-gray-800 flex items-center gap-3 w-80">
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

      {/* Credits Modal */}
      {UI_VISIBILITY.clientCredits && showCreditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => !isProcessingPayment && setShowCreditModal(false)}>
          <div className="bg-white rounded-[2rem] w-full max-w-5xl shadow-[0_0_50px_rgba(0,0,0,0.28)] overflow-hidden flex flex-col lg:flex-row relative max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
             <div className="w-full lg:w-[42%] bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-100 p-8 flex flex-col justify-center overflow-y-auto">
               <div className="w-16 h-16 bg-blue-100/60 rounded-2xl flex items-center justify-center mb-6">
                 <Icons.Zap className="w-8 h-8 text-blue-600" />
               </div>
               <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{t('link_credits.client_intro_title')}</h3>
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

             <div className="w-full lg:w-[58%] p-6 sm:p-10 bg-white relative overflow-y-auto">
               <button onClick={() => !isProcessingPayment && setShowCreditModal(false)} className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors z-10" disabled={isProcessingPayment}>
                 <Icons.X className="w-5 h-5" />
               </button>
               <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6 pr-10">{t('link_credits.choose_package')}</h2>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div onClick={() => !isProcessingPayment && setSelectedCreditPackage(1)} className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all ${selectedCreditPackage === 1 ? 'border-blue-500 bg-blue-50/30 shadow-md' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                   <div className="flex justify-between items-start mb-3">
                     <Icons.Coins className="w-8 h-8 text-slate-500" />
                     {selectedCreditPackage === 1 && <Icons.CheckCircle2 className="w-6 h-6 text-blue-500" />}
                   </div>
                   <div className="text-slate-500 font-bold text-sm mb-1">{t('link_credits.credits_count', { count: 10 })}</div>
                   <div className="text-2xl font-black text-slate-900">{t('link_credits.package_10_price')}</div>
                 </div>
                 <div onClick={() => !isProcessingPayment && setSelectedCreditPackage(2)} className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all ${selectedCreditPackage === 2 ? 'border-blue-600 bg-blue-50/40 shadow-md' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                   <div className="absolute top-0 right-3 rounded-b-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-wide px-3 py-1 shadow-sm">{t('link_credits.popular_badge')}</div>
                   <div className="flex justify-between items-start mb-3 mt-4">
                     <Icons.Coins className="w-8 h-8 text-blue-600" />
                     {selectedCreditPackage === 2 && <Icons.CheckCircle2 className="w-6 h-6 text-blue-600" />}
                   </div>
                   <div className="text-slate-600 font-bold text-sm mb-1">{t('link_credits.credits_count', { count: 50 })}</div>
                   <div className="text-2xl font-black text-slate-900">{t('link_credits.package_50_price')}</div>
                 </div>
                 <div onClick={() => !isProcessingPayment && setSelectedCreditPackage(3)} className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all ${selectedCreditPackage === 3 ? 'border-violet-500 bg-violet-50/40 shadow-md' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                   <div className="absolute top-0 right-3 rounded-b-lg bg-violet-600 text-white text-[10px] font-black uppercase tracking-wide px-3 py-1 shadow-sm">{t('link_credits.best_value_badge')}</div>
                   <div className="flex justify-between items-start mb-3 mt-4">
                     <Icons.Zap className="w-8 h-8 text-violet-600" />
                     {selectedCreditPackage === 3 && <Icons.CheckCircle2 className="w-6 h-6 text-violet-600" />}
                   </div>
                   <div className="text-slate-600 font-bold text-sm mb-1">{t('link_credits.credits_count', { count: 120 })}</div>
                   <div className="text-2xl font-black text-slate-900">{t('link_credits.package_120_price')}</div>
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
                { id: 'profile' as const, label: t('nav.profile_menu_profile'), icon: Icons.UserRound, action: () => navigate(ROUTES.settings) },
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
          <div className="w-full max-w-full mx-auto animate-in fade-in duration-300 min-w-0">

          <LhCard className="mb-6 w-full max-w-full min-w-0">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">{t('client_dashboard.category_hub_title')}</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">{t('client_dashboard.category_hub_sub')}</p>
              </div>
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-black"
              >
                <Icons.Plus className="h-4 w-4" />
                {t('client_dashboard.create_order_now')}
              </button>
            </div>

            <div className="grid w-full max-w-full min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {SERVICE_CATEGORIES.map((cat) => {
                const IconComponent = getCategoryLucideIcon(cat.icon);
                return (
                  <section key={cat.id} className="w-full max-w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 transition-all hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openCreateModal(cat.id)}
                        className="group inline-flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#17A8FF] to-[#1565FF] text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-200">
                          <IconComponent className="h-6 w-6" />
                        </span>
                        <span className="min-w-0">
                          <span className="inline-flex max-w-full items-center gap-2 rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-black text-slate-100">
                            <span className="truncate">{t(`categories.${cat.id}`)}</span>
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openCreateModal(cat.id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200 hover:text-blue-700"
                        aria-label={t(`categories.${cat.id}`)}
                      >
                        <Icons.ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </section>
                );
              })}
            </div>
          </LhCard>

          <div className="space-y-6">
            <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-white p-5 sm:p-6 shadow-sm">
              <h3 className="text-lg font-black text-slate-950">{t('client_how_it_works.title')}</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {(
                  [
                    { icon: Icons.ClipboardCheck, title: 'card1_title', desc: 'card1_desc', accent: 'from-blue-500 to-indigo-600' },
                    { icon: Icons.MapPinned, title: 'card2_title', desc: 'card2_desc', accent: 'from-sky-500 to-blue-600' },
                    { icon: Icons.ShieldCheck, title: 'card3_title', desc: 'card3_desc', accent: 'from-indigo-500 to-violet-600' },
                  ] as const
                ).map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <article
                      key={card.title}
                      className="group relative overflow-hidden rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                    >
                      <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent} text-white shadow-lg shadow-blue-500/20`}>
                        <Icon className="h-7 w-7" strokeWidth={2.2} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">0{idx + 1}</span>
                      <h4 className="mt-1 text-base font-black text-slate-950">{t(`client_how_it_works.${card.title}`)}</h4>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{t(`client_how_it_works.${card.desc}`)}</p>
                    </article>
                  );
                })}
              </div>
            </section>

          </div>
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
                        <HelperPlanBadge tier={helperPlanFromRoleKey(helper.roleKey)} className="align-middle" />
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
                           if (isClientChatUnlockedForHelper(String(helper.id), myJobIds, applications)) {
                             navigate(ROUTES.messages);
                             return;
                           }
                           showToast(t('helper_profile.chat_locked_hint'), 'info');
                         }}
                         className={`px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                           isClientChatUnlockedForHelper(String(helper.id), myJobIds, applications)
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
            <LhCard className="mb-6 overflow-hidden">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('sidebar.active_services')}</h2>
                <p className="text-gray-500 text-sm">{t('client_dashboard.active_services_intro')}</p>
              </div>
              <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div>
                    <p className="text-sm font-black text-blue-950 flex items-center gap-2">
                      <Icons.Sparkles className="w-4 h-4 text-blue-600" />
                      {t('client_dashboard.qualified_requests_title')}
                    </p>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-blue-900">
                      {t('client_dashboard.qualified_requests_body')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCreateModal()}
                    className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    <Icons.Plus className="h-4 w-4" />
                    {t('client_dashboard.create_order_now')}
                  </button>
                </div>
              </div>
              
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setJobsListTab('active')}
                  className={`rounded-xl px-4 py-2 text-sm font-bold ${jobsListTab === 'active' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {t('client_jobs.tab_active')}
                </button>
                <button
                  type="button"
                  onClick={() => setJobsListTab('history')}
                  className={`rounded-xl px-4 py-2 text-sm font-bold ${jobsListTab === 'history' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {t('client_jobs.tab_history')}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {jobs
                  .filter((j) => j.clientId === me.id)
                  .filter((j) => isOfficialServiceCategoryId(j.category))
                  .filter((j) => {
                    const visible = isJobVisibleToClient(j, hiddenJobIds, {
                      includeHistory: jobsListTab === 'history',
                    });
                    if (jobsListTab === 'history') {
                      return (
                        !isJobCancelled(j) &&
                        (hiddenJobIds.has(j.id) || j.status === 'completed' || isJobExpired(j))
                      );
                    }
                    return visible && (j.status === 'open' || j.status === 'in_progress');
                  })
                  .length > 0 ? (
                  jobs
                    .filter((j) => j.clientId === me.id)
                    .filter((j) => isOfficialServiceCategoryId(j.category))
                    .filter((j) => {
                      if (jobsListTab === 'history') {
                        return (
                          !isJobCancelled(j) &&
                          (hiddenJobIds.has(j.id) || j.status === 'completed' || isJobExpired(j))
                        );
                      }
                      return (
                        isJobVisibleToClient(j, hiddenJobIds) &&
                        (j.status === 'open' || j.status === 'in_progress')
                      );
                    })
                    .map((job) => {
                    const jobApps = applications
                      .filter((a) => a.jobId === job.id && a.status !== 'cancelled')
                      .sort((a, b) => a.createdAt - b.createdAt);
                    const clientBudgetRange = formatClientBudgetRangeLabel(job, t);
                    const canCancelJob = job.status === 'open' || job.status === 'in_progress';
                    const qualityScore = estimateClientLeadQuality(job.description, job.location, job.value, jobApps.length);
                    const helperSlots = [...jobApps.slice(0, 3), ...Array(Math.max(0, 3 - jobApps.length)).fill(null)];
                    
                    return (
                      <div key={job.id} className="min-w-0 border border-blue-100 bg-white rounded-2xl p-4 md:p-5 relative overflow-hidden flex flex-col shadow-sm">
                        <div className={`absolute top-0 left-0 w-1 h-full ${job.status === 'open' ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-4">
                          <div className="min-w-0">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-md mb-2 inline-block ${job.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                              {job.status === 'cancelled'
                                ? t('upcoming_jobs.status_cancelled')
                                : job.status === 'open'
                                  ? t('client_dashboard.status_waiting_helpers')
                                  : t('client_dashboard.status_in_progress')}
                            </span>
                            <h3 className="font-bold text-gray-900 text-lg leading-snug line-clamp-2">{translateJobTitle(job.title, job.category, job.subcategory, t)}</h3>
                            <p className="text-gray-500 text-xs md:text-sm flex items-center gap-1 mt-1 min-w-0">
                              <Icons.Clock className="w-4 h-4 shrink-0" />
                              <span className="truncate">{formatJobScheduleDisplay(job, t)}</span>
                            </p>
                            {isBeautyScheduledJob(job) ? (
                              <span className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-violet-100 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-800">
                                <span aria-hidden>🕒</span>
                                {job.preferredTime}
                                <span className="text-violet-600/90">· {t('jobs.scheduled_time_badge')}</span>
                              </span>
                            ) : null}
                          </div>
                          <div className="shrink-0 sm:text-right">
                            <p className="inline-flex rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-black text-blue-800">{formatJobBudgetDisplay(job, t)}</p>
                          </div>
                        </div>
                        {jobsListTab === 'history' &&
                        job.status === 'completed' &&
                        pendingServiceReviews.some((p) => p.requestId === job.id) ? (
                          <button
                            type="button"
                            onClick={() => openReviewByRequestId(job.id)}
                            className="mb-3 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-900 hover:bg-amber-100"
                          >
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            {t('service_review.rate_now')}
                          </button>
                        ) : null}
                        <JobTaskActionsBar
                          canCancel={canCancelJob}
                          canRemove={!hiddenJobIds.has(job.id)}
                          canRepublish={job.status === 'cancelled' || isJobExpired(job)}
                          canFinalize={job.status === 'in_progress'}
                          onCancel={() => {
                            if (window.confirm(t('job_actions.cancel_confirm'))) {
                              void updateJobStatus(job.id, 'cancelled').catch(console.error);
                            }
                          }}
                          onRemove={() => {
                            if (window.confirm(t('job_actions.remove_confirm'))) {
                              void removeClientJob(job.id).catch(console.error);
                            }
                          }}
                          onRepublish={() => openCreateModal(job.category, job.subcategory ?? '')}
                          onFinalize={() => {
                            void updateJobStatus(job.id, 'completed')
                              .then(() => {
                                window.setTimeout(() => openReviewByRequestId(job.id), 400);
                              })
                              .catch(console.error);
                          }}
                        />
                        <div className="mb-4 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800">
                            <Icons.BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                            {t('client_dashboard.request_quality', { pct: qualityScore })}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-bold text-blue-800">
                            <Icons.Users className="h-3.5 w-3.5 text-blue-600" />
                            {t('client_dashboard.request_helper_limit', { count: job.urgency === 'high' ? 5 : 3 })}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 max-w-full truncate">
                            <Icons.MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{job.address || job.city || job.location}</span>
                          </span>
                        </div>

                        <div className="border-t border-gray-200 pt-4 mt-auto">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <h4 className="font-black text-gray-900 text-sm">{t('client_dashboard.interested_helpers_title')}</h4>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">{jobApps.length}/3</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {helperSlots.map((app, index) => (
                              app ? (
                                <div
                                  key={app.id}
                                  className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <img src={app.helperAvatar} alt="" className="h-10 w-10 shrink-0 rounded-full border border-white object-cover shadow-sm" loading="lazy" />
                                    <div className="min-w-0 flex-1">
                                      <p className="flex min-w-0 items-center gap-1.5 text-sm font-black text-slate-950">
                                        <span className="truncate">{app.helperName}</span>
                                        <HelperPlanBadge tier={helperTierFromApplication(app)} size="sm" />
                                      </p>
                                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                                        <Icons.Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                        <span>{app.helperRating}</span>
                                        <span>{t('client_dashboard.helper_jobs_count', { count: app.helperJobs })}</span>
                                      </p>
                                      {app.proposedAmount != null ? (
                                        <p className="mt-1.5 text-xs font-black text-slate-900">
                                          {t('client_dashboard.helper_proposal_amount', {
                                            amount: formatMoneyAmount(app.proposedAmount, job.currency || 'CAD'),
                                          })}
                                        </p>
                                      ) : (
                                        <p className="mt-1.5 text-xs font-black text-slate-700">
                                          {t('client_dashboard.helper_proposal_negotiable')}
                                        </p>
                                      )}
                                      {clientBudgetRange ? (
                                        <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{clientBudgetRange}</p>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                    {app.status === 'pending' || app.status === 'viewed' ? (
                                      <>
                                        <button
                                          type="button"
                                          disabled={acceptingApplicationId === app.id}
                                          onClick={() => void handleAcceptProposal(job, app, index)}
                                          className="order-1 w-full rounded-xl bg-green-600 px-3 py-2.5 text-xs font-black text-white hover:bg-green-700 disabled:opacity-60 sm:order-3 sm:w-auto sm:min-w-[9rem]"
                                        >
                                          {t('client_dashboard.accept_proposal')}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            openHelperProfile(
                                              {
                                                id: app.helperId,
                                                name: app.helperName,
                                                avatar: app.helperAvatar,
                                                rating: app.helperRating,
                                                roleKey: 'pro_helper',
                                                roleColor: '',
                                                skills: [],
                                                isOnline: true,
                                                trainingCert: 'none',
                                              },
                                              app.id,
                                            );
                                          }}
                                          className="order-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 sm:order-1 sm:w-auto"
                                        >
                                          {t('helper_public.view_profile')}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void updateApplicationStatus(app.id, 'rejected').catch(console.error)}
                                          className="order-3 w-full rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 sm:order-2 sm:w-auto"
                                        >
                                          {t('client_dashboard.reject_helper')}
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            openHelperProfile(
                                              {
                                                id: app.helperId,
                                                name: app.helperName,
                                                avatar: app.helperAvatar,
                                                rating: app.helperRating,
                                                roleKey: 'pro_helper',
                                                roleColor: '',
                                                skills: [],
                                                isOnline: true,
                                                trainingCert: 'none',
                                              },
                                              app.id,
                                            );
                                          }}
                                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 sm:w-auto"
                                        >
                                          {t('helper_public.view_profile')}
                                        </button>
                                        {app.chatUnlocked ? (
                                          <button
                                            type="button"
                                            onClick={() => navigate(ROUTES.messages)}
                                            className="inline-flex min-h-[32px] w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 sm:w-auto"
                                          >
                                            <Icons.MessageSquare className="h-3.5 w-3.5" />
                                            {t('client_dashboard.open_chat_with', { name: app.helperName.split(' ')[0] })}
                                          </button>
                                        ) : (
                                          <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-400 opacity-70 sm:w-auto">
                                            <Icons.MessageSquare className="h-3.5 w-3.5" />
                                            {t('client_dashboard.chat_locked_until_accept')}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div key={`empty-${job.id}-${index}`} className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3 text-sm font-bold text-slate-400">
                                  {t('client_dashboard.waiting_helper_slot')}
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-200 border-dashed border-2 md:col-span-2 2xl:col-span-3">
                    <p className="text-gray-500 font-medium">{t('client_dashboard.empty_no_published_requests')}</p>
                    <button onClick={() => openCreateModal()} className="mt-4 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
                      {t('client_dashboard.create_order_now')}
                    </button>
                  </div>
                )}
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
        <div className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-120px)] space-y-4">
          <ClientMapWidget
            t={t}
            clientId={me.id}
            jobs={jobs}
            applications={applications}
            notifications={notifications}
          />
          <ClientNearbyHelpersList
            helpers={nearbyHelpers}
            loading={nearbyHelpersLoading}
            t={t}
            onViewProfile={openNearbyHelperProfile}
          />
        </div>

      </div>

      {showHelperProfileModal && selectedHelper && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="mb-[calc(env(safe-area-inset-bottom)+4.5rem)] flex max-h-[min(88dvh,calc(100dvh-5.5rem))] w-full flex-col overflow-hidden rounded-t-3xl border border-gray-100/80 bg-white shadow-2xl transition-opacity duration-200 ease-out sm:mb-0 sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl">
            <div className="shrink-0 relative rounded-t-3xl sm:rounded-t-3xl">
              <div className="h-28 sm:h-36 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-800 sm:rounded-t-3xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_30%_20%,white,transparent_55%)] pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowHelperProfileModal(false)}
                  className="absolute top-3 right-3 z-20 bg-black/20 hover:bg-black/30 backdrop-blur-sm p-2 rounded-full text-white transition-colors"
                  aria-label={t('common.close')}
                >
                  <Icons.X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex justify-center px-4 sm:px-6 -mt-14 sm:-mt-16 relative z-10 pointer-events-none">
                <div className="pointer-events-auto relative">
                  <img
                    src={selectedHelper.avatar}
                    alt=""
                    className="w-[5.5rem] h-[5.5rem] sm:w-28 sm:h-28 rounded-full object-cover ring-[3px] ring-white shadow-xl shadow-blue-900/20 bg-gray-100"
                  />
                  {selectedHelper.isOnline && (
                    <div className="absolute bottom-1 right-1 w-5 h-5 sm:w-6 sm:h-6 bg-emerald-500 border-[3px] border-white rounded-full" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-3 sm:px-6 sm:pt-4">
                <HelperPublicProfileView
                  helper={{
                    id: String(selectedHelper.id),
                    name: selectedHelper.name,
                    avatar: selectedHelper.avatar,
                    rating: selectedHelper.rating,
                    jobsCompleted: 120,
                    bio: t('helper_public.sample_bio'),
                    city: t('helper_public.sample_city'),
                    categories: selectedHelper.skills?.length ? [...selectedHelper.skills] : ['cleaning'],
                  }}
                />
              </div>
              <div className="shrink-0 flex flex-col gap-2 border-t border-gray-100 bg-white px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 sm:px-6">
                <button
                  type="button"
                  onClick={handleProfileMessageClick}
                  disabled={!profileChatUnlocked}
                  className={`w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl border-2 text-sm font-bold transition-colors ${
                    profileChatUnlocked
                      ? 'border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50'
                      : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400 opacity-60'
                  }`}
                >
                  <Icons.MessageSquare className={`w-5 h-5 ${profileChatUnlocked ? 'text-blue-600' : 'text-slate-400'}`} />
                  {t('helper_profile.cta_chat')}
                </button>
                {!profileChatUnlocked ? (
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
              </div>
            </div>
          </div>
        </div>
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
                <h2 className="text-2xl font-black text-gray-900">
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
  );
}
