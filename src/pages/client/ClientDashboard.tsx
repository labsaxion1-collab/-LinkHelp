import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, MapPin, Clock, Star, MessageSquare, ChevronRight, CheckCircle2, Bell } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAppData } from '@/context/AppDataContext';
import { useModeSwitch } from '@/hooks/useModeSwitch';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import { formatJobSchedule } from '@/utils/jobDisplay';
import { ROUTES } from '@/utils/constants';
import { avatarUrlForName } from '@/utils/avatarUrl';
import { HelperPlanBadge } from '@/components/helpers/HelperPlanBadge';
import { CreateRequestModal } from '@/components/client/create-request/CreateRequestModal';
import { TrainingCertBadge } from '@/components/training/TrainingCertBadge';
import type { TrainingCertLevel } from '@/utils/helperTrainingProgress';
import { helperPlanFromRoleKey, helperTierFromApplication } from '@/utils/helperPlanFromRoleKey';
import { ClientMapWidget } from '@/components/client/ClientMapWidget';
import { LhCard } from '@/components/design-system/LhCard';
import { UserPresenceBadge } from '@/components/ui/UserPresenceBadge';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { useAuth } from '@/context/AuthContext';
import { UserProfileModal } from '@/components/profile/UserProfileModal';
import { JobTaskActionsBar } from '@/components/features/JobTaskActionsBar';
import { HelperPublicProfileView } from '@/components/features/HelperPublicProfileView';
import {
  hideJobForUser,
  isJobExpired,
  isJobVisibleToClient,
  readHiddenJobIds,
} from '@/utils/jobVisibility';
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
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'dashboard' | 'my-helpers' | 'active-services' | 'saved'>('dashboard');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [toastNotification, setToastNotification] = useState<{message: string, show: boolean}>({message: '', show: false});
  const [previousAppCount, setPreviousAppCount] = useState(0);
  
  const [selectedHelper, setSelectedHelper] = useState<any>(null);
  const [showHelperProfileModal, setShowHelperProfileModal] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireModalKind, setHireModalKind] = useState<'hire' | 'proposal'>('hire');
  const [inviteMessage, setInviteMessage] = useState('');
  const [jobsListTab, setJobsListTab] = useState<'active' | 'history'>('active');
  const [hiddenJobIds, setHiddenJobIds] = useState<Set<string>>(() => new Set());
  
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { toHelper, modeSwitchBusy } = useModeSwitch();

  const { t } = useLanguage();
  const skillChip = (skill: string) =>
    skill === 'support' ? t('skills.support') : t(`categories.${skill}`);
  const { jobs, applications, notifications, updateApplicationStatus, updateJobStatus } = useAppData();
  const { profile } = useAuth();
  const me = useSessionViewer();

  useEffect(() => {
    setHiddenJobIds(readHiddenJobIds(me.id));
  }, [me.id]);

  useEffect(() => {
    if (showCreditModal) setSelectedCreditPackage(2);
  }, [showCreditModal]);

  useEffect(() => {
    if (routerLocation.pathname === ROUTES.clientJobs) {
      setActiveSidebarTab('active-services');
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

  const openCreateModal = (categoryId = '', subcategoryId = '') => {
    setCreateInitialCategory(categoryId);
    setCreateInitialSubcategory(subcategoryId);
    setShowCreateModal(true);
  };

  return (
    <div className="bg-[#f0f2f5] min-h-[calc(100vh-64px)] py-4 sm:py-6 -mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
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

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-[var(--lh-gutter)] justify-center min-w-0 px-3 sm:px-4 md:px-0">
        
        {/* Left Sidebar */}
        <div className="hidden">
          
          {/* User Profile & Switch Mode */}
          <div className="space-y-2">
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-3 p-3 hover:bg-gray-200 rounded-xl transition-all group w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-200">
              <img src={me.avatar} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm shrink-0" />
              <div className="flex-1 min-w-0 pr-1">
                <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors block truncate">{me.name}</span>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <UserPresenceBadge role="client" status="seeking" />
                </div>
                <span className="text-[11px] xl:text-xs text-gray-500 block truncate mt-1">{t('client_shell.view_profile')}</span>
              </div>
            </button>
            
              <button
                type="button"
                onClick={() => void toHelper()}
                className="flex items-center justify-center gap-2 w-full p-2.5 border border-gray-300 hover:border-gray-400 hover:bg-gray-200 rounded-xl text-gray-700 font-medium text-sm transition-all focus:ring-2 focus:ring-gray-200 focus:outline-none min-w-0"
              >
                <Icons.RefreshCw className="w-4 h-4 shrink-0" /> <span className="truncate">{t('sidebar.switch_helper')}</span>
              </button>
          </div>
          {/* Main Navigation */}
          <nav className="space-y-1 mb-6">
            <button onClick={() => { navigate(ROUTES.clientDashboard); setActiveSidebarTab('dashboard'); }} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all cursor-pointer font-bold focus:outline-none min-w-0 ${activeSidebarTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-200 text-gray-700 hover:text-gray-900 group'}`}>
              <Icons.Grid className={`w-5 h-5 shrink-0 ${activeSidebarTab === 'dashboard' ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600 transition-colors'}`} />
              <span className="truncate">{t('sidebar.dashboard')}</span>
            </button>
            <button onClick={() => { navigate(ROUTES.clientDashboard); setActiveSidebarTab('my-helpers'); }} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all cursor-pointer font-bold focus:outline-none min-w-0 ${activeSidebarTab === 'my-helpers' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-200 text-gray-700 hover:text-gray-900 group'}`}>
              <Icons.Users className={`w-5 h-5 shrink-0 ${activeSidebarTab === 'my-helpers' ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600 transition-colors'}`} />
              <span className="truncate">{t('sidebar.my_helpers')}</span>
            </button>
            <button onClick={() => { navigate(ROUTES.clientJobs); setActiveSidebarTab('active-services'); }} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all cursor-pointer font-bold focus:outline-none min-w-0 ${activeSidebarTab === 'active-services' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-200 text-gray-700 hover:text-gray-900 group'}`}>
              <Icons.Briefcase className={`w-5 h-5 shrink-0 ${activeSidebarTab === 'active-services' ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600 transition-colors'}`} />
              <span className="truncate flex-1 text-left">{t('sidebar.active_services')}</span>
            </button>
            <button onClick={() => { navigate(ROUTES.clientDashboard); setActiveSidebarTab('saved'); }} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all cursor-pointer font-bold focus:outline-none min-w-0 ${activeSidebarTab === 'saved' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-200 text-gray-700 hover:text-gray-900 group'}`}>
              <Icons.Bookmark className={`w-5 h-5 shrink-0 ${activeSidebarTab === 'saved' ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600 transition-colors'}`} />
              <span className="truncate">{t('sidebar.saved')}</span>
            </button>
          </nav>
          
          {UI_VISIBILITY.ideas ? (
          <Link to={ROUTES.ideas} className="shrink-0 block relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-4 xl:p-5 group shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all hover:-translate-y-0.5 mb-6 border border-gray-700/50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/20 rounded-full blur-[50px] group-hover:bg-yellow-400/30 transition-colors pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col justify-between items-center w-full group">
              <div className="w-full flex justify-between items-center mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center shrink-0 w-8 h-8 bg-gradient-to-br from-yellow-400/20 to-yellow-500/10 rounded-xl border border-yellow-400/20 shadow-inner">
                    <Icons.Lightbulb className="w-4 h-4 text-yellow-400 fill-yellow-400/20" />
                  </div>
                  <span className="font-bold text-white text-[15px] tracking-tight truncate">{t('sidebar.ideas')}</span>
                </div>
                
                {/* Ping Indicator */}
                <div className="flex h-2 w-2 shrink-0 relative mr-1">
                  <span className="animate-ping absolute inset-0 rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                </div>
              </div>
              
              <p className="text-gray-400 text-xs font-medium leading-relaxed w-full text-left mb-4">
                {t('sidebar.ideas_subtitle')}
              </p>

              <div className="w-full grid grid-cols-1 gap-2 border-t border-gray-700/50 pt-4">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-300 bg-white/5 hover:bg-white/10 p-2.5 rounded-xl border border-white/5 transition-colors min-w-0 w-full group-hover:text-blue-400">
                  <Icons.TrendingUp className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="font-medium truncate">{t('sidebar.trending_ideas')}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-medium px-2 py-0.5 min-w-0 w-full">
                  <Icons.Gift className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                  <span className="truncate">{t('sidebar.earn_credits')}</span>
                </div>
              </div>
            </div>
          </Link>
          ) : null}
          
          {/* Quick Actions / Create Post (Sidebar) */}
          <div className="pt-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">{t('dashboard.shortcuts')}</p>
            <div className="space-y-3 px-1">
              <button onClick={() => openCreateModal()} className="flex items-center gap-3 w-full p-3 bg-white border border-gray-100 shadow-sm hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-0.5 rounded-2xl transition-all text-left group focus:outline-none focus:ring-2 focus:ring-blue-200 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors shadow-inner">
                  <Icons.Plus className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <span className="font-bold text-gray-900 block text-[14px] xl:text-[15px] truncate group-hover:text-blue-700 transition-colors">{t('dashboard.create_request')}</span>
                  <span className="text-[11px] xl:text-xs text-gray-500 block font-medium truncate">{t('dashboard.create_request_desc')}</span>
                </div>
              </button>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200 pb-8">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-3">{t('client_shell.favorite_services')}</p>
            <div className="space-y-3 px-1">
              {SERVICE_CATEGORIES.slice(0, 4).map(cat => {
                const IconComponent = (Icons as any)[cat.icon];
                return (
                  <button key={cat.id} className="flex items-center p-3 rounded-2xl border-2 border-transparent bg-white hover:border-blue-200 hover:bg-blue-50 shadow-sm transition-all w-full text-left group">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:border-blue-100 transition-colors mr-3">
                      {IconComponent && <IconComponent className="w-5 h-5 text-gray-500 group-hover:text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-gray-900 text-sm block mb-0.5 truncate group-hover:text-blue-900">{t(`categories.${cat.id}`)}</span>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                        {t('client_shell.saved_badge')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <main className="w-full min-w-0">
          <div className="mb-5 hidden md:block rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm">
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
              <button
                type="button"
                title={t('sidebar.switch_helper')}
                aria-label={t('sidebar.switch_helper')}
                onClick={() => void toHelper()}
                disabled={modeSwitchBusy}
                className="group relative ml-auto inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 md:h-12 md:w-12 md:gap-0 md:rounded-2xl md:px-0"
              >
                <Icons.RefreshCw className="h-4 w-4 md:h-5 md:w-5" />
                <span className="sr-only">{t('sidebar.switch_helper')}</span>
                <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-white opacity-0 shadow-lg transition-opacity md:block md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
                  {t('sidebar.switch_helper')}
                </span>
              </button>
            </div>
          </div>

        {/* Main Feed */}
        {activeSidebarTab === 'dashboard' && (
          <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-300">
          
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {SERVICE_CATEGORIES.map((cat) => {
                const IconComponent = (Icons as any)[cat.icon] || Icons.HelpCircle;
                const expanded = expandedCategory === cat.id;
                return (
                  <section key={cat.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 transition-all hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm">
                    <div className="mb-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setExpandedCategory(expanded ? null : cat.id)}
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
                        onClick={() => setExpandedCategory(expanded ? null : cat.id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200 hover:text-blue-700"
                        aria-label={t(`categories.${cat.id}`)}
                      >
                        <Icons.ChevronRight className={`h-5 w-5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                      </button>
                    </div>

                    {expanded ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {cat.subKeys.map((subKey) => (
                        <button
                          key={subKey}
                          type="button"
                          onClick={() => openCreateModal(cat.id, subKey)}
                          className="min-h-[38px] rounded-full border border-slate-200 bg-white px-3 py-2 text-left text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          {t(`service_subs.${cat.id}.${subKey}`)}
                        </button>
                      ))}
                    </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('client_dashboard.home_feed_title')}</h2>
            <p className="text-sm text-gray-500 mb-3">{t('client_dashboard.home_feed_sub')}</p>
          </div>

          {/* Posts (Feed) */}
          <div className="space-y-6">
            
            {/* Active Requests Summary */}
            {jobs.filter((j) => j.clientId === me.id).slice(0, 2).map((job) => {
               const jobApps = applications.filter((a) => a.jobId === job.id && a.status !== 'cancelled');
               return (
                 <div key={job.id} className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden hover:-translate-y-1 transition-transform duration-300 p-5 relative">
                   <div className={`absolute top-0 left-0 w-1 h-full ${job.status === 'open' ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
                   <div className="flex justify-between items-start mb-2">
                     <div>
                       <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md mb-2 inline-block uppercase tracking-wider ${job.status === 'open' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                         {job.status === 'open' ? t('jobs.request_status_open') : t('jobs.request_status_in_progress')}
                       </span>
                       <h3 className="font-bold text-gray-900 text-lg leading-tight">{job.title}</h3>
                     </div>
                     <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg text-sm border border-blue-100">
                      {jobApps.length === 0
                        ? t('client_dashboard.helpers_interest_neutral')
                        : t('client_dashboard.helpers_applied_count', { count: jobApps.length })}
                    </span>
                   </div>
                   <div className="flex gap-2 mt-3">
                     <button
                       type="button"
                       onClick={() => { navigate(ROUTES.clientJobs); setActiveSidebarTab('active-services'); }}
                       className="text-sm font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1"
                     >
                       {t('notifications.view_details')} <Icons.ChevronRight className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               );
            })}
            
            {/* Recommended Helpers Block */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 leading-tight">{t('client_helpers.recommended_title')}</h3>
                <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><Icons.MoreHorizontal className="w-5 h-5" /></button>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                {RECOMMENDED_HELPERS.length === 0 ? (
                  <p className="text-sm text-slate-500 font-medium py-6 px-2 w-full text-center">
                    {t('client_helpers.recommended_empty')}
                  </p>
                ) : null}
                {RECOMMENDED_HELPERS.map((helper) => (
                  <div key={helper.id} className="min-w-[190px] w-[190px] bg-white border border-gray-200 rounded-xl flex flex-col justify-between shrink-0 shadow-sm hover:shadow-md transition-shadow relative">
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start max-w-[calc(100%-3rem)]">
                      <HelperPlanBadge tier={helperPlanFromRoleKey(helper.roleKey)} />
                      <TrainingCertBadge level={helper.trainingCert} />
                    </div>
                    <button onClick={() => { setSelectedHelper(helper); setShowHelperProfileModal(true); }} className="absolute top-3 right-3 text-gray-400 hover:text-blue-600 transition-colors z-10" title={t('common.view_profile')}>
                      <Icons.ExternalLink className="w-4 h-4" />
                    </button>
                    <div className="p-4 pt-6 flex flex-col items-center border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white rounded-t-xl">
                      <div className="relative mb-2">
                        <img src={helper.avatar} alt="Helper" className="w-16 h-16 rounded-full object-cover border-2 border-gray-50 shadow-sm" />
                      </div>
                      <h4 className="font-bold text-gray-900 flex items-center gap-1 text-center leading-tight">{helper.name} <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-50" /></h4>
                      <span className="text-blue-600 font-bold text-sm mt-1 flex items-center gap-1"><Icons.Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {helper.rating.toFixed(1)}</span>
                    </div>
                    <div className="p-3 bg-white flex-grow flex flex-col items-center justify-center gap-2">
                       <div className="flex flex-wrap gap-1 justify-center mt-1">
                         {helper.skills.map((skill, i) => (
                           <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-semibold border border-gray-200">{skillChip(skill)}</span>
                         ))}
                       </div>
                    </div>
                    <div className="border-t border-gray-200 flex justify-between divide-x divide-gray-200 bg-gray-50 rounded-b-xl overflow-hidden">
                      <button onClick={(e) => { e.stopPropagation(); navigate(ROUTES.messages); }} className="flex-1 py-2 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-green-600 transition-colors" title={t('common.message')}>
                        <Icons.MessageSquare className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHelper(helper);
                          setHireModalKind('hire');
                          setShowHireModal(true);
                        }}
                        className="flex-1 py-2 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-blue-600 transition-colors"
                        title={t('common.hire')}
                      >
                        <Icons.Briefcase className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
          </div>
        )}

        {/* My Helpers Tab */}
        {activeSidebarTab === 'my-helpers' && (
          <div className="w-full max-w-[680px] mx-auto animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6 p-6">
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
                       <button onClick={() => navigate(ROUTES.messages)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                         <Icons.MessageSquare className="w-4 h-4" /> {t('client_helpers.chat')}
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active Services Tab */}
        {activeSidebarTab === 'active-services' && (
          <div className="w-full max-w-[680px] mx-auto animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6 p-6">
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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {jobs
                  .filter((j) => j.clientId === me.id)
                  .filter((j) => {
                    const visible = isJobVisibleToClient(j, hiddenJobIds, {
                      includeHistory: jobsListTab === 'history',
                    });
                    if (jobsListTab === 'history') {
                      return (
                        hiddenJobIds.has(j.id) ||
                        j.status === 'cancelled' ||
                        j.status === 'completed' ||
                        isJobExpired(j)
                      );
                    }
                    return visible && (j.status === 'open' || j.status === 'in_progress');
                  })
                  .length > 0 ? (
                  jobs
                    .filter((j) => j.clientId === me.id)
                    .filter((j) => {
                      if (jobsListTab === 'history') {
                        return (
                          hiddenJobIds.has(j.id) ||
                          j.status === 'cancelled' ||
                          j.status === 'completed' ||
                          isJobExpired(j)
                        );
                      }
                      return (
                        isJobVisibleToClient(j, hiddenJobIds) &&
                        (j.status === 'open' || j.status === 'in_progress')
                      );
                    })
                    .map((job) => {
                    const jobApps = applications.filter((a) => a.jobId === job.id && a.status !== 'cancelled');
                    const canCancelJob = job.status === 'open' || job.status === 'in_progress';
                    const qualityScore = estimateClientLeadQuality(job.description, job.location, job.value, jobApps.length);
                    
                    return (
                      <div key={job.id} className="border border-blue-200 bg-blue-50/20 rounded-2xl p-4 md:p-5 relative overflow-hidden flex flex-col">
                        <div className={`absolute top-0 left-0 w-1 h-full ${job.status === 'open' ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-md mb-2 inline-block ${job.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                              {job.status === 'cancelled' ? t('upcoming_jobs.status_cancelled') : job.status === 'open' ? 'Aguardando Helpers' : 'Em Andamento'}
                            </span>
                            <h3 className="font-bold text-gray-900 text-lg">{job.title}</h3>
                            <p className="text-gray-500 text-xs md:text-sm flex items-center gap-1 mt-1 truncate"><Icons.Clock className="w-4 h-4 shrink-0" /> {formatJobSchedule(job.date, t)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-gray-900 text-sm">{job.value}</p>
                          </div>
                        </div>
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
                            hideJobForUser(me.id, job.id);
                            setHiddenJobIds(readHiddenJobIds(me.id));
                          }}
                          onRepublish={() => openCreateModal(job.category, job.subcategory ?? '')}
                          onFinalize={() => void updateJobStatus(job.id, 'completed').catch(console.error)}
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

                        {jobApps.length > 0 && (
                          <div className="border-t border-gray-200 pt-4 mt-4">
                            <h4 className="font-bold text-gray-700 text-sm mb-3">Helpers Interessados ({jobApps.length}):</h4>
                            <div className="space-y-3">
                              {jobApps.map(app => (
                                <div key={app.id} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                  <img src={app.helperAvatar} alt="Helper" className="w-10 h-10 rounded-full border border-gray-200" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-900 text-sm flex flex-wrap items-center gap-2">
                                      {app.helperName}
                                      <HelperPlanBadge tier={helperTierFromApplication(app)} size="sm" />
                                    </p>
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-600">
                                      <Icons.Star className="w-3 h-3 fill-yellow-500" /> {app.helperRating} ({app.helperJobs} jobs)
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    {app.status === 'pending' || app.status === 'viewed' ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedHelper({
                                              id: app.helperId,
                                              name: app.helperName,
                                              avatar: app.helperAvatar,
                                              rating: app.helperRating,
                                              roleKey: 'pro_helper',
                                              roleColor: '',
                                              skills: [],
                                              isOnline: true,
                                              trainingCert: 'none',
                                            });
                                            setShowHelperProfileModal(true);
                                          }}
                                          className="px-3 py-1.5 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg"
                                        >
                                          {t('helper_public.view_profile')}
                                        </button>
                                    <button 
                                          onClick={() => {
                                            void updateApplicationStatus(app.id, 'accepted').catch(console.error);
                                            setToastNotification({
                                              message: `Chat automático criado com ${app.helperName}! "Parabéns! Sua candidatura foi aceita 🎉"`,
                                              show: true
                                            });
                                            setTimeout(() => setToastNotification({ message: '', show: false }), 5000);
                                          }}
                                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition"
                                        >
                                          Aceitar
                                        </button>
                                        <button 
                                          onClick={() => void updateApplicationStatus(app.id, 'rejected').catch(console.error)}
                                          className="px-3 py-1.5 bg-red-100 text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition"
                                        >
                                          Recusar
                                        </button>
                                      </>
                                    ) : app.status === 'accepted' ? (
                                      <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 border border-green-200 rounded-lg flex items-center gap-1">
                                        <Icons.CheckCircle2 className="w-3.5 h-3.5" /> {t('helper_dashboard.app_accepted')}
                                      </span>
                                    ) : app.status === 'rejected' ? (
                                      <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 border border-red-200 rounded-lg">
                                        {t('helper_dashboard.app_rejected')}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {jobApps.length === 0 && (
                          <div className="border-t border-gray-200 pt-4 mt-4 text-center">
                            <p className="text-sm font-medium text-gray-500 text-left">{t('client_dashboard.applications_empty_client')}</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-200 border-dashed border-2">
                    <p className="text-gray-500 font-medium">{t('client_dashboard.empty_no_published_requests')}</p>
                    <button onClick={() => openCreateModal()} className="mt-4 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
                      {t('client_dashboard.create_order_now')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Saved Tab */}
        {activeSidebarTab === 'saved' && (
          <div className="w-full max-w-[680px] mx-auto animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6 p-6 text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icons.Bookmark className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('client_dashboard.saved_empty_title')}</h2>
              <p className="text-gray-500 max-w-sm mx-auto">{t('client_dashboard.saved_empty_body')}</p>
            </div>
          </div>
        )}
        </main>

        {/* Right Sidebar */}
        <div className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-120px)] space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-950">{t('client_dashboard.my_requests_sidebar_title')}</h3>
              <button
                type="button"
                onClick={() => {
                  navigate(ROUTES.clientJobs);
                  setActiveSidebarTab('active-services');
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                {t('notifications.view_all')}
              </button>
            </div>
            <div className="space-y-2">
              {jobs.filter((j) => j.clientId === me.id).slice(0, 4).length > 0 ? (
                jobs.filter((j) => j.clientId === me.id).slice(0, 4).map((job) => {
                  const jobApps = applications.filter((a) => a.jobId === job.id && a.status !== 'cancelled');
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => {
                        navigate(ROUTES.clientJobs);
                        setActiveSidebarTab('active-services');
                      }}
                      className="w-full rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50"
                    >
                      <span className="line-clamp-2 text-xs font-black text-slate-900">{job.title}</span>
                      <span className="mt-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
                        <span>{formatJobSchedule(job.date, t)}</span>
                        <span className="text-blue-700">{t('client_dashboard.helpers_applied_count', { count: jobApps.length })}</span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-xs font-semibold text-slate-500">{t('client_dashboard.empty_no_published_requests')}</p>
                </div>
              )}
            </div>
          </div>
          
          <ClientMapWidget
            t={t}
            clientId={me.id}
            jobs={jobs}
            applications={applications}
            notifications={notifications}
          />
        </div>

      </div>

      {showHelperProfileModal && selectedHelper && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div className="bg-white w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl rounded-t-3xl sm:rounded-3xl border border-gray-100/80 transition-opacity duration-200 ease-out">
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

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 pb-6 pt-3 sm:pt-4 space-y-4">
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
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowHelperProfileModal(false);
                    navigate(ROUTES.messages);
                  }}
                  className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white text-slate-800 text-sm font-bold"
                >
                  <Icons.MessageSquare className="w-5 h-5 text-blue-600" />
                  {t('helper_profile.cta_chat')}
                </button>
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
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                  onClick={() => {
                    setShowHireModal(false);
                    setToastNotification({
                      message: hireModalKind === 'hire' ? t('hire_modal.success_toast') : t('hire_modal.success_toast_proposal'),
                      show: true,
                    });
                    setTimeout(() => setToastNotification({ message: '', show: false }), 4000);
                  }}
                  className="flex-1 min-h-[44px] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Icons.Send className="w-5 h-5" />{' '}
                  {hireModalKind === 'proposal' ? t('hire_modal.send_proposal') : t('hire_modal.send_invite')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
