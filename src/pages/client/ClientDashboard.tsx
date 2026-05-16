import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, MapPin, Clock, Star, MessageSquare, ChevronRight, CheckCircle2, Bell } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAppData } from '@/context/AppDataContext';
import { useAppMode } from '@/context/AppModeContext';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import { movingNeedsBuildingDetails } from '@/data/movingRequestConfig';
import { formatJobSchedule } from '@/utils/jobDisplay';
import { ROUTES } from '@/utils/constants';
import { avatarUrlForName } from '@/utils/avatarUrl';
import { getRequestDescriptionCopy } from '@/data/createRequestStepCopy';
import { HelperPlanBadge } from '@/components/helpers/HelperPlanBadge';
import { TrainingCertBadge } from '@/components/training/TrainingCertBadge';
import type { TrainingCertLevel } from '@/utils/helperTrainingProgress';
import { helperPlanFromRoleKey, helperTierFromApplication } from '@/utils/helperPlanFromRoleKey';
import { ClientRadarInsights } from '@/components/client/ClientRadarInsights';
import { LhCard } from '@/components/design-system/LhCard';
import { UserPresenceBadge } from '@/components/ui/UserPresenceBadge';
import { markDemoServiceConfirmed } from '@/utils/chatThreadDemo';
import { UI_VISIBILITY } from '@/config/uiVisibility';

type ModalStep =
  | 'category'
  | 'subcategory'
  | 'moving_access'
  | 'text'
  | 'media'
  | 'location'
  | 'priority'
  | 'review';

const RECOMMENDED_HELPERS: {
  id: number;
  name: string;
  roleKey: 'pro_helper' | 'elite' | 'trusted';
  roleColor: string;
  rating: number;
  avatar: string;
  skills: readonly string[];
  isOnline: boolean;
  trainingCert: TrainingCertLevel;
}[] = [
  {
    id: 1,
    name: 'Alex M.',
    roleKey: 'pro_helper',
    roleColor: 'purple',
    rating: 4.9,
    avatar: avatarUrlForName('Alex M.', 'ede9fe', '5b21b6'),
    skills: ['assembly', 'cleaning', 'moving'] as const,
    isOnline: true,
    trainingCert: 'pro',
  },
  {
    id: 2,
    name: 'Sarah K.',
    roleKey: 'elite',
    roleColor: 'orange',
    rating: 5.0,
    avatar: avatarUrlForName('Sarah K.', 'ffedd5', '9a3412'),
    skills: ['translation', 'support', 'hair'] as const,
    isOnline: true,
    trainingCert: 'elite',
  },
  {
    id: 3,
    name: 'David T.',
    roleKey: 'trusted',
    roleColor: 'blue',
    rating: 4.8,
    avatar: avatarUrlForName('David T.', 'dbeafe', '1e3a8a'),
    skills: ['renovation', 'assembly', 'outdoor'] as const,
    isOnline: true,
    trainingCert: 'basic',
  },
];

export default function ClientDashboard() {
  const [postText, setPostText] = useState('');
  const [requestTags, setRequestTags] = useState<string[]>([]);
  const [moveOriginFloor, setMoveOriginFloor] = useState('');
  const [moveOriginElevator, setMoveOriginElevator] = useState('');
  const [moveOriginStairs, setMoveOriginStairs] = useState('');
  const [moveDestFloor, setMoveDestFloor] = useState('');
  const [moveDestElevator, setMoveDestElevator] = useState('');
  const [moveDestStairs, setMoveDestStairs] = useState('');
  const [moveApproxBoxes, setMoveApproxBoxes] = useState('');
  const [moveLargeFurniture, setMoveLargeFurniture] = useState('');
  const [moveNeedDisassembly, setMoveNeedDisassembly] = useState('');
  const [moveNeedAssembly, setMoveNeedAssembly] = useState('');
  const [moveFragileItems, setMoveFragileItems] = useState('');
  const [moveDate, setMoveDate] = useState('');
  const [movePreferredTime, setMovePreferredTime] = useState('');
  const [moveDistanceNotes, setMoveDistanceNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [priority, setPriority] = useState('flexible');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedCreditPackage, setSelectedCreditPackage] = useState<number | null>(null);
  const [selectedPlanUpgrade, setSelectedPlanUpgrade] = useState<string | null>(null);
  const successModalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissSuccessModal = () => {
    if (successModalTimerRef.current) {
      clearTimeout(successModalTimerRef.current);
      successModalTimerRef.current = null;
    }
    setShowSuccessModal(false);
  };

  const processPayment = (type: 'credits' | 'upgrade') => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      if (type === 'credits') {
        setShowCreditModal(false);
      } else {
        setShowUpgradeModal(false);
      }
      setShowSuccessModal(true);
      if (successModalTimerRef.current) clearTimeout(successModalTimerRef.current);
      successModalTimerRef.current = setTimeout(() => dismissSuccessModal(), 3000);
    }, 1500);
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalStep, setCreateModalStep] = useState<ModalStep>('category');
  const [activeSidebarTab, setActiveSidebarTab] = useState<'dashboard' | 'my-helpers' | 'active-services' | 'saved'>('dashboard');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [toastNotification, setToastNotification] = useState<{message: string, show: boolean}>({message: '', show: false});
  const [previousAppCount, setPreviousAppCount] = useState(0);
  
  const [selectedHelper, setSelectedHelper] = useState<any>(null);
  const [showHelperProfileModal, setShowHelperProfileModal] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireModalKind, setHireModalKind] = useState<'hire' | 'proposal'>('hire');
  const [inviteMessage, setInviteMessage] = useState('');
  
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { switchToHelper } = useAppMode();

  const { t, language } = useLanguage();
  const skillChip = (skill: string) =>
    skill === 'support' ? t('skills.support') : t(`categories.${skill}`);
  const { jobs, applications, notifications, createJob, updateApplicationStatus } = useAppData();
  const me = useSessionViewer();

  const descriptionCopy = useMemo(
    () =>
      selectedCategory && selectedSubcategory
        ? getRequestDescriptionCopy(language, selectedCategory, selectedSubcategory)
        : null,
    [language, selectedCategory, selectedSubcategory],
  );

  const createModalSteps = useMemo((): ModalStep[] => {
    const steps: ModalStep[] = ['category', 'subcategory'];
    if (selectedCategory === 'moving' && movingNeedsBuildingDetails(selectedSubcategory)) {
      steps.push('moving_access');
    }
    steps.push('text', 'media', 'location', 'priority', 'review');
    return steps;
  }, [selectedCategory, selectedSubcategory]);

  const buildingAccessComplete = useMemo(() => {
    if (selectedCategory !== 'moving' || !movingNeedsBuildingDetails(selectedSubcategory)) {
      return true;
    }
    return (
      !!moveOriginFloor.trim() &&
      !!moveOriginElevator &&
      !!moveOriginStairs &&
      !!moveDestFloor.trim() &&
      !!moveDestElevator &&
      !!moveDestStairs
    );
  }, [
    selectedCategory,
    selectedSubcategory,
    moveOriginFloor,
    moveOriginElevator,
    moveOriginStairs,
    moveDestFloor,
    moveDestElevator,
    moveDestStairs,
  ]);

  useEffect(() => {
    if (!descriptionCopy) return;
    setRequestTags(Array.from(new Set(descriptionCopy.tags)));
  }, [descriptionCopy]);

  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'moving') {
      setMoveOriginFloor('');
      setMoveOriginElevator('');
      setMoveOriginStairs('');
      setMoveDestFloor('');
      setMoveDestElevator('');
      setMoveDestStairs('');
      setMoveApproxBoxes('');
      setMoveLargeFurniture('');
      setMoveNeedDisassembly('');
      setMoveNeedAssembly('');
      setMoveFragileItems('');
      setMoveDate('');
      setMovePreferredTime('');
      setMoveDistanceNotes('');
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (showCreditModal) setSelectedCreditPackage(2);
  }, [showCreditModal]);

  useEffect(() => {
    if (routerLocation.pathname === ROUTES.clientJobs) {
      setActiveSidebarTab('active-services');
    }
  }, [routerLocation.pathname]);

  useEffect(() => {
    const st = routerLocation.state as { openUpgrade?: boolean } | null;
    if (st?.openUpgrade) {
      setShowUpgradeModal(true);
      navigate(routerLocation.pathname, { replace: true, state: {} });
    }
  }, [routerLocation.state, routerLocation.pathname, navigate]);

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

  const resetCreateModalFields = () => {
    setPostText('');
    setJobLocation('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setRequestTags([]);
    setPriority('flexible');
    setMoveOriginFloor('');
    setMoveOriginElevator('');
    setMoveOriginStairs('');
    setMoveDestFloor('');
    setMoveDestElevator('');
    setMoveDestStairs('');
    setMoveApproxBoxes('');
    setMoveLargeFurniture('');
    setMoveNeedDisassembly('');
    setMoveNeedAssembly('');
    setMoveFragileItems('');
    setMoveDate('');
    setMovePreferredTime('');
    setMoveDistanceNotes('');
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateModalStep('category');
    resetCreateModalFields();
  };

  const openCreateModal = () => {
    resetCreateModalFields();
    setCreateModalStep('category');
    setShowCreateModal(true);
  };

  const handlePublish = () => {
    const ynLabel = (v: string) =>
      v === 'yes'
        ? t('create_modal.moving_yes')
        : v === 'no'
          ? t('create_modal.moving_no')
          : v === 'unsure'
            ? t('create_modal.moving_unsure')
            : '—';

    let movingAppend = '';
    if (selectedCategory === 'moving') {
      const parts: string[] = [];
      if (movingNeedsBuildingDetails(selectedSubcategory)) {
        parts.push(
          t('create_modal.moving_origin_section'),
          `${t('create_modal.moving_floor_pickup')}: ${moveOriginFloor.trim()}`,
          `${t('create_modal.moving_elevator_label')}: ${ynLabel(moveOriginElevator)}`,
          `${t('create_modal.moving_stairs_label')}: ${ynLabel(moveOriginStairs)}`,
          '',
          t('create_modal.moving_dest_section'),
          `${t('create_modal.moving_floor_delivery')}: ${moveDestFloor.trim()}`,
          `${t('create_modal.moving_elevator_label')}: ${ynLabel(moveDestElevator)}`,
          `${t('create_modal.moving_stairs_label')}: ${ynLabel(moveDestStairs)}`,
        );
      }
      const optional: string[] = [];
      if (moveApproxBoxes.trim()) {
        optional.push(`${t('create_modal.moving_boxes_label')}: ${moveApproxBoxes.trim()}`);
      }
      if (moveLargeFurniture) {
        optional.push(`${t('create_modal.moving_large_furniture_label')}: ${ynLabel(moveLargeFurniture)}`);
      }
      if (moveNeedDisassembly) {
        optional.push(`${t('create_modal.moving_disassembly_label')}: ${ynLabel(moveNeedDisassembly)}`);
      }
      if (moveNeedAssembly) {
        optional.push(`${t('create_modal.moving_assembly_label')}: ${ynLabel(moveNeedAssembly)}`);
      }
      if (moveFragileItems) {
        optional.push(`${t('create_modal.moving_fragile_label')}: ${ynLabel(moveFragileItems)}`);
      }
      if (moveDate) {
        optional.push(`${t('create_modal.moving_move_date')}: ${moveDate}`);
      }
      if (movePreferredTime) {
        optional.push(`${t('create_modal.moving_preferred_time')}: ${movePreferredTime}`);
      }
      if (moveDistanceNotes.trim()) {
        optional.push(`${t('create_modal.moving_distance_label')}: ${moveDistanceNotes.trim()}`);
      }
      const core = parts.join('\n');
      let optBlock = '';
      if (optional.length) {
        optBlock = (core ? '\n\n' : '') + `${t('create_modal.moving_optional_section')}\n${optional.join('\n')}`;
      }
      if (core || optional.length) {
        movingAppend = `\n\n—\n${t('create_modal.moving_details_title')}\n${core}${optBlock}`;
      }
    }

    const fullDescription = `${postText.trim()}${movingAppend}`;

    const schedule =
      priority === 'emergency'
        ? '__now'
        : priority === 'urgent'
          ? '__today'
          : priority === 'today'
            ? '__soon'
            : '__flexible';
    createJob({
      clientId: me.id,
      clientName: me.name,
      clientAvatar: me.avatar,
      title: fullDescription.slice(0, 30) + (fullDescription.length > 30 ? '...' : ''),
      description: fullDescription,
      category: selectedCategory,
      tags: requestTags.length > 0 ? [...requestTags] : undefined,
      location: jobLocation.trim() || t('jobs.remote'),
      date: schedule,
      value: t('jobs.value_negotiable'),
      urgency: priority === 'emergency' || priority === 'urgent' ? 'high' : 'normal',
    });

    closeCreateModal();
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
                   onClick={() => processPayment('credits')}
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

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => !isProcessingPayment && setShowUpgradeModal(false)}>
           <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-[0_0_60px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh] relative" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-100/60 to-purple-100/60 rounded-full blur-[80px] pointer-events-none"></div>
              
              <div className="p-6 border-b border-gray-100 flex justify-between items-center relative z-10 bg-white/50 backdrop-blur-xl">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <Icons.TrendingUp className="w-8 h-8 text-blue-600" /> {t('client_dashboard.upgrade_title')}
                  </h2>
                  <p className="text-sm text-gray-500 font-medium mt-1">{t('client_dashboard.upgrade_subtitle')}</p>
                </div>
                <button onClick={() => !isProcessingPayment && setShowUpgradeModal(false)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-900 transition-colors" disabled={isProcessingPayment}>
                  <Icons.X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 relative z-10 hide-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-3xl mx-auto">
                  {/* FREE */}
                  <div className={`relative bg-white border-2 rounded-[2rem] p-6 lg:p-8 transition-all flex flex-col h-full border-gray-100 opacity-60`}>
                    <div className="w-14 h-14 bg-gray-100 text-gray-500 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                      <Icons.User className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-1">{t('client_dashboard.plan_free_title')}</h3>
                    <div className="text-3xl font-black text-gray-600 mb-8">$0<span className="text-sm text-gray-400 font-medium tracking-normal">{t('link_credits.per_month')}</span></div>
                    
                    <ul className="space-y-4 mb-8 flex-1">
                      <li className="flex gap-3 text-sm font-medium text-gray-500 leading-tight"><Icons.CheckCircle2 className="w-5 h-5 text-gray-400 shrink-0" /> {t('client_dashboard.plan_free_f1')}</li>
                      <li className="flex gap-3 text-sm font-medium text-gray-500 leading-tight"><Icons.CheckCircle2 className="w-5 h-5 text-gray-400 shrink-0" /> {t('client_dashboard.plan_free_f2')}</li>
                      <li className="flex gap-3 text-sm font-medium text-gray-500 leading-tight"><Icons.CheckCircle2 className="w-5 h-5 text-gray-400 shrink-0" /> {t('client_dashboard.plan_free_f3')}</li>
                    </ul>
                    <div className="py-2 px-4 bg-gray-100 rounded-xl text-center text-sm font-bold text-gray-500">
                      {t('client_dashboard.plan_current_badge')}
                    </div>
                  </div>

                  {/* PLUS */}
                  <div onClick={() => !isProcessingPayment && setSelectedPlanUpgrade('PLUS')} className={`relative overflow-hidden bg-gray-900 border-2 rounded-[2rem] p-6 lg:p-8 cursor-pointer transition-all flex flex-col h-full ${selectedPlanUpgrade === 'PLUS' ? 'border-yellow-500 shadow-[0_10px_40px_rgba(234,179,8,0.25)] md:-translate-y-4 z-10 scale-[1.02]' : 'border-transparent text-white hover:shadow-2xl md:hover:-translate-y-2'}`}>
                    <div className="absolute top-0 right-1/2 translate-x-1/2 bg-yellow-500 text-yellow-950 text-[10px] font-black uppercase tracking-wider px-4 py-1.5 rounded-b-xl shadow-md z-20">{t('client_dashboard.plan_plus_tag')}</div>
                    {selectedPlanUpgrade === 'PLUS' && <div className="absolute -top-3 -right-3 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-yellow-950 shadow-lg animate-in zoom-in z-20"><Icons.Check className="w-5 h-5" /></div>}
                    
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none"></div>
                    <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-gray-700 text-yellow-400 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-gray-600 shadow-inner relative z-10">
                      <Icons.Star className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-1 relative z-10">Plus</h3>
                    <div className="text-3xl font-black text-yellow-400 mb-8 relative z-10">{t('client_dashboard.plan_plus_price_line')}<span className="text-sm text-gray-400 font-medium tracking-normal">{t('link_credits.per_month')}</span></div>
                    
                    <ul className="space-y-4 mb-8 flex-1 relative z-10">
                      <li className="flex gap-3 text-sm font-medium text-gray-300 leading-tight"><Icons.CheckCircle2 className="w-5 h-5 text-yellow-500 shrink-0" /> {t('client_dashboard.plan_plus_f1')}</li>
                      <li className="flex gap-3 text-sm font-medium text-gray-300 leading-tight"><Icons.CheckCircle2 className="w-5 h-5 text-yellow-500 shrink-0" /> {t('client_dashboard.plan_plus_f2')}</li>
                      <li className="flex gap-3 text-sm font-medium text-gray-300 leading-tight"><Icons.CheckCircle2 className="w-5 h-5 text-yellow-500 shrink-0" /> {t('client_dashboard.plan_plus_f3')}</li>
                      <li className="flex gap-3 text-sm font-medium text-gray-300 leading-tight"><Icons.CheckCircle2 className="w-5 h-5 text-yellow-500 shrink-0" /> {t('client_dashboard.plan_plus_f4')}</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-10 flex justify-center sticky bottom-0 pt-4 bg-gradient-to-t from-white via-white to-transparent pb-2">
                  <button 
                    onClick={() => processPayment('upgrade')}
                    disabled={!selectedPlanUpgrade || isProcessingPayment}
                    className={`w-full max-w-sm py-4 rounded-xl font-black tracking-wide transition-all shadow-xl flex items-center justify-center gap-3 ${!selectedPlanUpgrade ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-2xl hover:scale-105'}`}
                  >
                    {isProcessingPayment ? (
                      <><Icons.Loader2 className="w-5 h-5 animate-spin" /> {t('helper_dashboard.upgrade_processing')}</>
                    ) : (
                      <><Icons.Rocket className="w-5 h-5" /> {t('client_dashboard.upgrade_cta')}</>
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

      {/* User Profile Modal Overlay */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowProfileModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200 max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
               <h3 className="text-xl font-bold text-gray-900">{t('client_dashboard.profile_modal_title')}</h3>
               <button onClick={() => setShowProfileModal(false)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500">
                 <Icons.X className="w-5 h-5" />
               </button>
            </div>
            <div className="p-6 overflow-y-auto hide-scrollbar flex-1">
               <div className="flex flex-col sm:flex-row gap-8">
                  <div className="w-full sm:w-1/3 space-y-6">
                    <div className="flex flex-col items-center text-center">
                       <div className="relative group cursor-pointer mb-4">
                         <img src={me.avatar} alt="Avatar" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg" />
                         <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <Icons.Camera className="w-8 h-8 text-white" />
                         </div>
                       </div>
                       <h2 className="text-2xl font-bold text-gray-900">{me.name}</h2>
                       <p className="text-gray-500 flex items-center gap-1 mt-1 justify-center"><Icons.MapPin className="w-4 h-4" /> Montreal, QC</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-bold text-gray-700 block mb-1">{t('client_dashboard.status_label')}</label>
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg font-medium border border-green-200">
                           <div className="w-2 h-2 rounded-full bg-green-500"></div> {t('client_dashboard.status_online')}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-bold text-gray-700 block mb-1">{t('client_dashboard.languages_label')}</label>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">{t('client_dashboard.lang_portuguese')}</span>
                          <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">{t('client_dashboard.lang_english')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full sm:w-2/3 space-y-6">
                     <div>
                       <label className="text-sm font-bold text-gray-700 block mb-2">{t('client_dashboard.about_me')}</label>
                       <textarea className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none" rows={4} placeholder={t('client_dashboard.bio_placeholder')} defaultValue="Brasileiro recém-chegado no Canadá. Gosto de coisas práticas e ágeis."></textarea>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-bold text-gray-700 block mb-2">Telefone</label>
                          <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none" defaultValue="+1 (514) 000-0000" />
                        </div>
                        <div>
                           <label className="text-sm font-bold text-gray-700 block mb-2">{t('client_dashboard.email_label')}</label>
                           <input type="email" disabled className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-gray-500 cursor-not-allowed" defaultValue="joao.silva@example.com" />
                        </div>
                     </div>

                     <div className="pt-4 border-t border-gray-100">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-sm w-full">{t('client_dashboard.save_changes')}</button>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={closeCreateModal}>
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200 max-h-[90vh]" onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <h3 className="text-xl font-bold text-gray-900 font-display flex items-center gap-2">
                <Icons.PlusCircle className="w-5 h-5 text-blue-600" />
                {t('client_dashboard.create_order_title')}
              </h3>
              <button onClick={closeCreateModal} className="p-2 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 rounded-full text-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300">
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper */}
            <div className="px-6 pt-5 pb-2 shrink-0">
              <div className="flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 z-0 rounded-full"></div>
                <div 
                  className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-500 rounded-full" 
                  style={{
                    width: `${(createModalSteps.indexOf(createModalStep) / Math.max(createModalSteps.length - 1, 1)) * 100}%` 
                  }}
                ></div>
                
                {createModalSteps.map((step, idx) => {
                  const stepIcons: Record<ModalStep, any> = { 
                    'category': Icons.Grid, 
                    'subcategory': Icons.List, 
                    'moving_access': Icons.Building2,
                    'text': Icons.Type, 
                    'media': Icons.Image, 
                    'location': Icons.MapPin, 
                    'priority': Icons.Clock, 
                    'review': Icons.CheckCircle2 
                  };
                  const currentIndex = createModalSteps.indexOf(createModalStep);
                  const isPast = idx < currentIndex;
                  const isCurrent = idx === currentIndex;
                  const isActive = isPast || isCurrent;
                  const Icon = stepIcons[step];
                  
                  return (
                    <div key={step} className="relative z-10 flex flex-col items-center gap-1.5" title={step}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'bg-white border-2 border-gray-200 text-gray-400'}`}>
                        {isPast ? <Icons.Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto hide-scrollbar flex-1 relative min-h-[400px]">
              
              {/* Step 1: Category */}
              {createModalStep === 'category' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">{t('create_modal.select_category')}</h4>
                  <p className="text-gray-500 text-sm mb-6">{t('create_modal.select_category_desc')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {SERVICE_CATEGORIES.map((cat) => {
                      const IconComponent = (Icons as any)[cat.icon];
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <div 
                          key={cat.id} 
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setSelectedSubcategory('');
                            setCreateModalStep('subcategory');
                          }} 
                          className={`group flex flex-col items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all hover:-translate-y-1 ${isSelected ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'}`}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'}`}>
                            {IconComponent && <IconComponent className="w-6 h-6" />}
                          </div>
                          <span className={`text-sm font-bold text-center ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>{t(`categories.${cat.id}`)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Step 1.5: Subcategory */}
              {createModalStep === 'subcategory' && (() => {
                const activeCat = SERVICE_CATEGORIES.find((c) => c.id === selectedCategory);
                return (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">{t('create_modal.select_sub')}</h4>
                    <p className="text-gray-500 text-sm mb-6">
                      {t('create_modal.select_sub_desc', { category: activeCat ? t(`categories.${activeCat.id}`) : '' })}
                    </p>
                    <div className="space-y-3">
                      {activeCat?.subKeys.map((subKey) => {
                        const isSelected = selectedSubcategory === subKey;
                        return (
                          <div
                            key={subKey}
                            onClick={() => {
                              setSelectedSubcategory(subKey);
                              if (selectedCategory === 'moving' && movingNeedsBuildingDetails(subKey)) {
                                setCreateModalStep('moving_access');
                              } else {
                                setCreateModalStep('text');
                              }
                            }}
                            className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-50' : 'border-gray-200 hover:border-blue-300 bg-white hover:shadow-sm'}`}
                          >
                            <span className="font-bold text-gray-900">
                              {t(`service_subs.${activeCat.id}.${subKey}`)}
                            </span>
                            <Icons.ChevronRight className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Building access (apartment / condo / office tower) */}
              {createModalStep === 'moving_access' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">{t('create_modal.moving_access_title')}</h4>
                    <p className="text-gray-500 text-sm leading-relaxed">{t('create_modal.moving_access_sub')}</p>
                  </div>

                  <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-4 sm:p-5 space-y-4">
                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
                      <Icons.ArrowUpFromLine className="w-4 h-4 text-blue-600 shrink-0" />
                      {t('create_modal.moving_origin_section')}
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">
                        {t('create_modal.moving_floor_pickup')} <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={moveOriginFloor}
                        onChange={(e) => setMoveOriginFloor(e.target.value)}
                        placeholder={t('create_modal.moving_floor_placeholder')}
                        className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">
                          {t('create_modal.moving_elevator_label')} <span className="text-rose-600">*</span>
                        </label>
                        <select
                          value={moveOriginElevator}
                          onChange={(e) => setMoveOriginElevator(e.target.value)}
                          className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none"
                        >
                          <option value="">—</option>
                          <option value="yes">{t('create_modal.moving_yes')}</option>
                          <option value="no">{t('create_modal.moving_no')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">
                          {t('create_modal.moving_stairs_label')} <span className="text-rose-600">*</span>
                        </label>
                        <select
                          value={moveOriginStairs}
                          onChange={(e) => setMoveOriginStairs(e.target.value)}
                          className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none"
                        >
                          <option value="">—</option>
                          <option value="yes">{t('create_modal.moving_yes')}</option>
                          <option value="no">{t('create_modal.moving_no')}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-4 sm:p-5 space-y-4">
                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
                      <Icons.ArrowDownToLine className="w-4 h-4 text-blue-600 shrink-0" />
                      {t('create_modal.moving_dest_section')}
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">
                        {t('create_modal.moving_floor_delivery')} <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={moveDestFloor}
                        onChange={(e) => setMoveDestFloor(e.target.value)}
                        placeholder={t('create_modal.moving_floor_placeholder')}
                        className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">
                          {t('create_modal.moving_elevator_label')} <span className="text-rose-600">*</span>
                        </label>
                        <select
                          value={moveDestElevator}
                          onChange={(e) => setMoveDestElevator(e.target.value)}
                          className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none"
                        >
                          <option value="">—</option>
                          <option value="yes">{t('create_modal.moving_yes')}</option>
                          <option value="no">{t('create_modal.moving_no')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">
                          {t('create_modal.moving_stairs_label')} <span className="text-rose-600">*</span>
                        </label>
                        <select
                          value={moveDestStairs}
                          onChange={(e) => setMoveDestStairs(e.target.value)}
                          className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none"
                        >
                          <option value="">—</option>
                          <option value="yes">{t('create_modal.moving_yes')}</option>
                          <option value="no">{t('create_modal.moving_no')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Text */}
              {createModalStep === 'text' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 relative h-full flex flex-col">
                  <div className="mb-4 flex-1 flex flex-col">
                    <label className="block text-2xl font-bold text-gray-900 mb-2">{t('create_modal.describe')}</label>
                    <p className="text-gray-500 text-sm mb-4">{t('create_modal.describe_desc')}</p>
                    <textarea
                      autoFocus
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                      placeholder={descriptionCopy?.placeholder ?? t('create_modal.placeholder')}
                      className="w-full bg-gray-50/50 border-2 border-gray-200 rounded-2xl px-5 py-4 hover:border-gray-300 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:outline-none transition-all resize-none text-gray-900 placeholder-gray-400 flex-1 text-lg"
                    />
                    {selectedCategory === 'moving' && (
                      <details className="mb-4 mt-3 rounded-2xl border border-slate-200 bg-slate-50/90 open:bg-white open:shadow-sm transition-colors group">
                        <summary className="cursor-pointer list-none flex items-center justify-between gap-2 p-4 font-bold text-sm text-slate-900 [&::-webkit-details-marker]:hidden">
                          <span className="flex items-center gap-2 min-w-0">
                            <Icons.SlidersHorizontal className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="truncate">{t('create_modal.moving_optional_section')}</span>
                          </span>
                          <Icons.ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0" />
                        </summary>
                        <div className="px-4 pb-4 pt-0 space-y-3 border-t border-slate-100">
                          <p className="text-[11px] text-gray-500 pt-3">{t('create_modal.moving_optional_hint')}</p>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">{t('create_modal.moving_boxes_label')}</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={moveApproxBoxes}
                              onChange={(e) => setMoveApproxBoxes(e.target.value)}
                              placeholder={t('create_modal.moving_boxes_placeholder')}
                              className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-500 outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">{t('create_modal.moving_large_furniture_label')}</label>
                              <select
                                value={moveLargeFurniture}
                                onChange={(e) => setMoveLargeFurniture(e.target.value)}
                                className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none"
                              >
                                <option value="">—</option>
                                <option value="yes">{t('create_modal.moving_yes')}</option>
                                <option value="no">{t('create_modal.moving_no')}</option>
                                <option value="unsure">{t('create_modal.moving_unsure')}</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">{t('create_modal.moving_fragile_label')}</label>
                              <select
                                value={moveFragileItems}
                                onChange={(e) => setMoveFragileItems(e.target.value)}
                                className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none"
                              >
                                <option value="">—</option>
                                <option value="yes">{t('create_modal.moving_yes')}</option>
                                <option value="no">{t('create_modal.moving_no')}</option>
                                <option value="unsure">{t('create_modal.moving_unsure')}</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">{t('create_modal.moving_disassembly_label')}</label>
                              <select
                                value={moveNeedDisassembly}
                                onChange={(e) => setMoveNeedDisassembly(e.target.value)}
                                className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none"
                              >
                                <option value="">—</option>
                                <option value="yes">{t('create_modal.moving_yes')}</option>
                                <option value="no">{t('create_modal.moving_no')}</option>
                                <option value="unsure">{t('create_modal.moving_unsure')}</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">{t('create_modal.moving_assembly_label')}</label>
                              <select
                                value={moveNeedAssembly}
                                onChange={(e) => setMoveNeedAssembly(e.target.value)}
                                className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 focus:border-blue-500 outline-none"
                              >
                                <option value="">—</option>
                                <option value="yes">{t('create_modal.moving_yes')}</option>
                                <option value="no">{t('create_modal.moving_no')}</option>
                                <option value="unsure">{t('create_modal.moving_unsure')}</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">{t('create_modal.moving_move_date')}</label>
                              <input
                                type="date"
                                value={moveDate}
                                onChange={(e) => setMoveDate(e.target.value)}
                                className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">{t('create_modal.moving_preferred_time')}</label>
                              <input
                                type="time"
                                value={movePreferredTime}
                                onChange={(e) => setMovePreferredTime(e.target.value)}
                                className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-500 outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">{t('create_modal.moving_distance_label')}</label>
                            <input
                              type="text"
                              value={moveDistanceNotes}
                              onChange={(e) => setMoveDistanceNotes(e.target.value)}
                              placeholder={t('create_modal.moving_distance_placeholder')}
                              className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-500 outline-none"
                            />
                          </div>
                          <p className="text-[11px] text-gray-600 leading-relaxed pt-1">
                            <span className="font-bold text-gray-800">{t('create_modal.moving_examples_title')}</span>
                            {' — '}
                            {t('create_modal.moving_examples_body')}
                          </p>
                        </div>
                      </details>
                    )}
                    {descriptionCopy && (
                      <>
                        <div className="mt-4">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('create_modal.suggestions')}</p>
                          <div className="flex flex-wrap gap-2">
                            {descriptionCopy.suggestions.map((line, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setPostText(line)}
                                className="text-left text-xs sm:text-sm font-semibold bg-white hover:bg-blue-50 text-gray-800 hover:text-blue-950 py-2 px-3 rounded-xl transition-colors border border-gray-200 hover:border-blue-200 max-w-full leading-snug"
                              >
                                {line}
                              </button>
                            ))}
                          </div>
                        </div>
                        {descriptionCopy.exampleHint && (
                          <div className="mt-3">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">{t('create_modal.example_sentence')}</p>
                            <button
                              type="button"
                              onClick={() => setPostText(descriptionCopy.exampleHint!)}
                              className="text-left w-full text-sm text-gray-600 hover:text-blue-900 font-medium bg-white border border-dashed border-gray-200 hover:border-blue-200 rounded-xl px-3 py-2.5 transition-colors"
                            >
                              {descriptionCopy.exampleHint}
                            </button>
                          </div>
                        )}
                        <div className="mt-5">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('create_modal.recommended_tags')}</p>
                          <p className="text-[11px] text-gray-500 mb-2.5">{t('create_modal.tags_hint')}</p>
                          <div className="flex flex-wrap gap-2">
                            {requestTags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-0.5 rounded-full bg-slate-50 text-slate-800 border border-slate-200 pl-2.5 pr-1 py-0.5 text-xs font-semibold"
                              >
                                <span className="text-blue-700">#</span>
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => setRequestTags((prev) => prev.filter((x) => x !== tag))}
                                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 transition-colors"
                                  aria-label="Remove tag"
                                >
                                  <Icons.X className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    <div className="flex justify-end mt-2">
                      <span className={`text-sm font-bold ${postText.length > 450 ? 'text-orange-500' : 'text-gray-400'}`}>{postText.length}/500</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Media */}
              {createModalStep === 'media' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <label className="block text-2xl font-bold text-gray-900 mb-2">{t('create_modal.media')}</label>
                  <p className="text-gray-500 text-sm mb-6">{t('create_modal.media_desc')}</p>
                  <div className="border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group bg-gray-50">
                    <div className="w-16 h-16 bg-white shadow-sm text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 group-hover:text-blue-600 transition-all border border-gray-100">
                      <Icons.UploadCloud className="w-8 h-8" />
                    </div>
                    <span className="text-lg font-bold text-gray-900 mb-2">{t('create_modal.drag_drop')}</span>
                    <span className="text-sm text-gray-500 font-medium mb-6">{t('create_modal.browse')}</span>
                    
                    <div className="flex gap-2">
                       <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded">JPG</span>
                       <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded">PNG</span>
                       <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded">MP4</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Location */}
              {createModalStep === 'location' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                  <div>
                    <label className="block text-2xl font-bold text-gray-900 mb-2">{t('create_modal.where')}</label>
                    <p className="text-gray-500 text-sm mb-6">{t('create_modal.where_desc')}</p>
                    <div className="relative">
                      <Icons.MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                      <input 
                        autoFocus
                        type="text" 
                        value={jobLocation}
                        onChange={(e) => setJobLocation(e.target.value)}
                        placeholder={t('create_modal.location_placeholder')} 
                        className="w-full pl-14 bg-gray-50 border-2 border-gray-200 text-gray-900 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white block p-4 text-lg transition-all outline-none font-medium shadow-sm" 
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
                        <Icons.Navigation className="w-4 h-4" /> <span className="hidden sm:inline">{t('create_modal.current_location')}</span><span className="sm:hidden">{t('create_modal.current_location_short')}</span>
                      </button>
                    </div>
                    
                    {/* Simulated Map */}
                    {jobLocation.length > 5 && (
                      <div className="mt-6 h-56 bg-gray-200 rounded-3xl overflow-hidden relative animate-in fade-in zoom-in-95 shadow-inner">
                         <div className="absolute inset-0 bg-[url('https://maps.gstatic.com/mapfiles/api-3/images/mapcnt6.png')] bg-cover bg-center opacity-60 mix-blend-multiply"></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-blue-600 flex flex-col items-center">
                              <Icons.MapPin className="w-12 h-12 -mt-6 drop-shadow-lg" />
                              <div className="w-5 h-2 bg-black/20 rounded-full blur-[2px]"></div>
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 5: Urgency */}
              {createModalStep === 'priority' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <label className="block text-2xl font-bold text-gray-900 mb-2">{t('create_modal.when')}</label>
                  <p className="text-gray-500 text-sm mb-6">{t('create_modal.when_desc')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button type="button" onClick={() => setPriority('emergency')} className={`p-5 rounded-2xl border-2 text-left transition-all group ${priority === 'emergency' ? 'border-red-500 bg-red-50 ring-4 ring-red-50' : 'border-gray-200 hover:border-red-300 hover:bg-red-50/30'}`}>
                       <Icons.AlertOctagon className={`w-6 h-6 mb-3 ${priority === 'emergency' ? 'text-red-500' : 'text-gray-400 group-hover:text-red-400'}`} />
                       <h5 className="font-bold text-gray-900 text-lg">{t('urgency.emergency')}</h5>
                       <p className="text-gray-500 text-sm mt-1">{t('urgency.emergency_desc')}</p>
                    </button>
                    <button type="button" onClick={() => setPriority('urgent')} className={`p-5 rounded-2xl border-2 text-left transition-all group ${priority === 'urgent' ? 'border-orange-500 bg-orange-50 ring-4 ring-orange-50' : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/30'}`}>
                       <Icons.Zap className={`w-6 h-6 mb-3 ${priority === 'urgent' ? 'text-orange-500' : 'text-gray-400 group-hover:text-orange-400'}`} />
                       <h5 className="font-bold text-gray-900 text-lg">{t('urgency.urgent')}</h5>
                       <p className="text-gray-500 text-sm mt-1">{t('urgency.urgent_desc')}</p>
                    </button>
                    <button type="button" onClick={() => setPriority('today')} className={`p-5 rounded-2xl border-2 text-left transition-all group ${priority === 'today' ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'}`}>
                       <Icons.Clock className={`w-6 h-6 mb-3 ${priority === 'today' ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-400'}`} />
                       <h5 className="font-bold text-gray-900 text-lg">{t('urgency.today_tomorrow')}</h5>
                       <p className="text-gray-500 text-sm mt-1">{t('urgency.today_tomorrow_desc')}</p>
                    </button>
                    <button type="button" onClick={() => setPriority('flexible')} className={`p-5 rounded-2xl border-2 text-left transition-all group ${priority === 'flexible' ? 'border-green-500 bg-green-50 ring-4 ring-green-50' : 'border-gray-200 hover:border-green-300 hover:bg-green-50/30'}`}>
                       <Icons.Calendar className={`w-6 h-6 mb-3 ${priority === 'flexible' ? 'text-green-500' : 'text-gray-400 group-hover:text-green-400'}`} />
                       <h5 className="font-bold text-gray-900 text-lg">{t('urgency.flexible')}</h5>
                       <p className="text-gray-500 text-sm mt-1">{t('urgency.flexible_desc')}</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 6: Review */}
              {createModalStep === 'review' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <label className="block text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Icons.CheckCircle2 className="w-7 h-7 text-green-500" />
                    {t('create_modal.review')}
                  </label>
                  
                  <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">{t('create_modal.service_category')}</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{t(`categories.${selectedCategory}`)}</span>
                        <Icons.ChevronRight className="w-4 h-4 text-gray-400" />
                        <span className="font-bold text-blue-600">
                          {selectedCategory && selectedSubcategory
                            ? t(`service_subs.${selectedCategory}.${selectedSubcategory}`)
                            : ''}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">{t('create_modal.description')}</span>
                      <p className="text-gray-800 font-medium whitespace-pre-wrap">{postText}</p>
                      {selectedCategory === 'moving' &&
                        (movingNeedsBuildingDetails(selectedSubcategory) ||
                          moveApproxBoxes.trim() ||
                          moveLargeFurniture ||
                          moveNeedDisassembly ||
                          moveNeedAssembly ||
                          moveFragileItems ||
                          moveDate ||
                          movePreferredTime ||
                          moveDistanceNotes.trim()) && (
                          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm text-gray-700 space-y-3">
                            <p className="font-bold text-slate-900 text-xs uppercase tracking-wide">{t('create_modal.moving_details_title')}</p>
                            {movingNeedsBuildingDetails(selectedSubcategory) && (
                              <>
                                <div className="space-y-1 text-sm">
                                  <p className="font-semibold text-gray-800">{t('create_modal.moving_origin_section')}</p>
                                  <p>
                                    <span className="font-semibold text-gray-600">{t('create_modal.moving_floor_pickup')}:</span>{' '}
                                    {moveOriginFloor.trim() || '—'}
                                  </p>
                                  <p>
                                    <span className="font-semibold text-gray-600">{t('create_modal.moving_elevator_label')}:</span>{' '}
                                    {moveOriginElevator === 'yes'
                                      ? t('create_modal.moving_yes')
                                      : moveOriginElevator === 'no'
                                        ? t('create_modal.moving_no')
                                        : '—'}
                                  </p>
                                  <p>
                                    <span className="font-semibold text-gray-600">{t('create_modal.moving_stairs_label')}:</span>{' '}
                                    {moveOriginStairs === 'yes'
                                      ? t('create_modal.moving_yes')
                                      : moveOriginStairs === 'no'
                                        ? t('create_modal.moving_no')
                                        : '—'}
                                  </p>
                                </div>
                                <div className="space-y-1 text-sm border-t border-slate-200 pt-2">
                                  <p className="font-semibold text-gray-800">{t('create_modal.moving_dest_section')}</p>
                                  <p>
                                    <span className="font-semibold text-gray-600">{t('create_modal.moving_floor_delivery')}:</span>{' '}
                                    {moveDestFloor.trim() || '—'}
                                  </p>
                                  <p>
                                    <span className="font-semibold text-gray-600">{t('create_modal.moving_elevator_label')}:</span>{' '}
                                    {moveDestElevator === 'yes'
                                      ? t('create_modal.moving_yes')
                                      : moveDestElevator === 'no'
                                        ? t('create_modal.moving_no')
                                        : '—'}
                                  </p>
                                  <p>
                                    <span className="font-semibold text-gray-600">{t('create_modal.moving_stairs_label')}:</span>{' '}
                                    {moveDestStairs === 'yes'
                                      ? t('create_modal.moving_yes')
                                      : moveDestStairs === 'no'
                                        ? t('create_modal.moving_no')
                                        : '—'}
                                  </p>
                                </div>
                              </>
                            )}
                            {(moveApproxBoxes.trim() ||
                              moveLargeFurniture ||
                              moveNeedDisassembly ||
                              moveNeedAssembly ||
                              moveFragileItems ||
                              moveDate ||
                              movePreferredTime ||
                              moveDistanceNotes.trim()) && (
                              <div className="space-y-1 text-sm border-t border-slate-200 pt-2">
                                <p className="font-semibold text-gray-800">{t('create_modal.moving_optional_section')}</p>
                                {moveApproxBoxes.trim() ? (
                                  <p>
                                    <span className="font-semibold text-gray-600">{t('create_modal.moving_boxes_label')}:</span> {moveApproxBoxes.trim()}
                                  </p>
                                ) : null}
                                {moveLargeFurniture ? (
                                  <p>
                                    <span className="font-semibold text-gray-600">{t('create_modal.moving_large_furniture_label')}</span>{' '}
                                    {moveLargeFurniture === 'yes'
                                      ? t('create_modal.moving_yes')
                                      : moveLargeFurniture === 'no'
                                        ? t('create_modal.moving_no')
                                        : t('create_modal.moving_unsure')}
                                  </p>
                                ) : null}
                                {moveNeedDisassembly ? (
                                  <p>
                                    <span className="font-semibold text-gray-600">{t('create_modal.moving_disassembly_label')}</span>{' '}
                                    {moveNeedDisassembly === 'yes'
                                      ? t('create_modal.moving_yes')
                                      : moveNeedDisassembly === 'no'
                                        ? t('create_modal.moving_no')
                                        : t('create_modal.moving_unsure')}
                                  </p>
                                ) : null}
                                {moveNeedAssembly ? (
                                  <p>
                                    <span className="font-semibold text-gray-600">{t('create_modal.moving_assembly_label')}</span>{' '}
                                    {moveNeedAssembly === 'yes'
                                      ? t('create_modal.moving_yes')
                                      : moveNeedAssembly === 'no'
                                        ? t('create_modal.moving_no')
                                        : t('create_modal.moving_unsure')}
                                  </p>
                                ) : null}
                                {moveFragileItems ? (
                                  <p>
                                    <span className="font-semibold text-gray-600">{t('create_modal.moving_fragile_label')}</span>{' '}
                                    {moveFragileItems === 'yes'
                                      ? t('create_modal.moving_yes')
                                      : moveFragileItems === 'no'
                                        ? t('create_modal.moving_no')
                                        : t('create_modal.moving_unsure')}
                                  </p>
                                ) : null}
                                {moveDate ? (
                                  <p>
                                    <span className="font-semibold text-gray-600">{t('create_modal.moving_move_date')}:</span> {moveDate}
                                  </p>
                                ) : null}
                                {movePreferredTime ? (
                                  <p>
                                    <span className="font-semibold text-gray-600">{t('create_modal.moving_preferred_time')}:</span> {movePreferredTime}
                                  </p>
                                ) : null}
                                {moveDistanceNotes.trim() ? (
                                  <p>
                                    <span className="font-semibold text-gray-600">{t('create_modal.moving_distance_label')}:</span> {moveDistanceNotes.trim()}
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </div>
                        )}
                    </div>

                    {requestTags.length > 0 && (
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">{t('create_modal.recommended_tags')}</span>
                        <div className="flex flex-wrap gap-2">
                          {requestTags.map((tag) => (
                            <span key={tag} className="text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-100 px-2.5 py-1 rounded-lg">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">{t('create_modal.location')}</span>
                        <div className="flex items-center gap-1.5 font-bold text-gray-900">
                          <Icons.MapPin className="w-4 h-4 text-gray-400" />
                          {jobLocation}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">{t('create_modal.urgency')}</span>
                        <div className="flex items-center gap-1.5 font-bold text-gray-900">
                          <Icons.Clock className="w-4 h-4 text-gray-400" />
                          {priority === 'emergency'
                            ? t('urgency.emergency')
                            : priority === 'urgent'
                              ? t('urgency.urgent')
                              : priority === 'today'
                                ? t('urgency.today_tomorrow')
                                : t('urgency.flexible')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-between items-center shrink-0">
              {createModalStep === 'category' ? (
                <div></div>
              ) : (
                <button 
                  onClick={() => {
                     const currentIdx = createModalSteps.indexOf(createModalStep);
                     if(currentIdx > 0) setCreateModalStep(createModalSteps[currentIdx - 1]);
                  }} 
                  className="px-5 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
                >
                  {t('common.back')}
                </button>
              )}
              
              {createModalStep !== 'review' ? (
                <button 
                  disabled={
                    createModalStep === 'category' ||
                    (createModalStep === 'subcategory' && !selectedSubcategory) ||
                    (createModalStep === 'moving_access' && !buildingAccessComplete) ||
                    (createModalStep === 'text' && !postText.trim()) ||
                    (createModalStep === 'location' && !jobLocation)
                  }
                  onClick={() => {
                     const currentIdx = createModalSteps.indexOf(createModalStep);
                     if(currentIdx < createModalSteps.length - 1) setCreateModalStep(createModalSteps[currentIdx + 1]);
                  }} 
                  className="bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-md flex items-center gap-2 ml-auto hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-gray-200"
                >
                  {t('common.continue')} <Icons.ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button 
                  onClick={handlePublish}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-[0_8px_30px_rgba(37,99,235,0.3)] flex items-center gap-2 ml-auto hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  {t('create_modal.publish')} <Icons.Rocket className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr_320px] gap-[var(--lh-gutter)] justify-center min-w-0 px-3 sm:px-4 md:px-0">
        
        {/* Left Sidebar */}
        <div className="hidden md:flex flex-col sticky top-24 h-[calc(100vh-120px)] overflow-y-auto hide-scrollbar space-y-4 pr-2">
          
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
                onClick={() => switchToHelper()}
                className="flex items-center justify-center gap-2 w-full p-2.5 border border-gray-300 hover:border-gray-400 hover:bg-gray-200 rounded-xl text-gray-700 font-medium text-sm transition-all focus:ring-2 focus:ring-gray-200 focus:outline-none min-w-0"
              >
                <Icons.RefreshCw className="w-4 h-4 shrink-0" /> <span className="truncate">{t('sidebar.switch_helper')}</span>
              </button>
          </div>
          
          {/* Account Status / Monetization */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3 shrink-0">
            {/* Plan Status */}
            <div className={`flex items-center justify-between ${UI_VISIBILITY.clientCredits ? 'pb-3 border-b border-gray-100' : ''}`}>
               <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t('client_shell.current_plan')}</div>
                  <div className="flex items-center gap-1.5 font-black text-sm text-gray-900">
                    {t('client_shell.plan_basic_badge')} <Icons.User className="w-4 h-4 text-gray-400" />
                  </div>
               </div>
               <button onClick={() => setShowUpgradeModal(true)} className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm hover:shadow-md">
                 <Icons.Star className="w-3.5 h-3.5 text-yellow-400" /> {t('client_shell.evolve')}
               </button>
            </div>
            {UI_VISIBILITY.clientCredits ? (
            <div className="flex items-center justify-between pt-1">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                   <Icons.Coins className="w-4 h-4 text-blue-600" />
                 </div>
                 <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t('client_shell.balance')}</div>
                    <div className="font-black text-sm text-gray-900">12 <span className="text-gray-500 text-xs font-semibold">{t('client_shell.credits_label')}</span></div>
                 </div>
               </div>
               <button onClick={() => setShowCreditModal(true)} className="w-8 h-8 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title={t('client_shell.add_credits')}>
                 <Icons.Plus className="w-4 h-4" />
               </button>
            </div>
            ) : null}
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

        {/* Main Feed */}
        {activeSidebarTab === 'dashboard' && (
          <div className="w-full max-w-[680px] mx-auto animate-in fade-in duration-300">
          
          {/* Create Post / Request (Trigger Block) */}
          <div className="bg-white rounded-3xl shadow-sm mb-6 border border-gray-100 overflow-hidden group hover:border-gray-300 transition-colors cursor-pointer" onClick={() => openCreateModal()}>
            <div className="p-4 sm:p-5">
              <div className="flex gap-4 items-center">
                <div className="relative shrink-0">
                  <img src={me.avatar} alt="Profile" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 text-gray-500 font-medium group-hover:bg-white group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all flex items-center justify-between">
                    <span>{t('dashboard.greeting', { name: me.name.split(' ')[0] })}</span>
                    <button className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white group-hover:scale-110 transition-transform">
                      <Icons.Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
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
              
              <div className="space-y-6">
                {jobs.filter((j) => j.clientId === me.id).length > 0 ? (
                  jobs.filter((j) => j.clientId === me.id).map((job) => {
                    const jobApps = applications.filter((a) => a.jobId === job.id && a.status !== 'cancelled');
                    
                    return (
                      <div key={job.id} className="border border-blue-200 bg-blue-50/20 rounded-2xl p-5 relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1 h-full ${job.status === 'open' ? 'bg-yellow-400' : 'bg-green-500'}`}></div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-md mb-2 inline-block ${job.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                              {job.status === 'open' ? 'Aguardando Helpers' : 'Em Andamento'}
                            </span>
                            <h3 className="font-bold text-gray-900 text-lg">{job.title}</h3>
                            <p className="text-gray-500 text-sm flex items-center gap-1 mt-1"><Icons.Clock className="w-4 h-4" /> {formatJobSchedule(job.date, t)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">{job.value}</p>
                          </div>
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
                    <button onClick={openCreateModal} className="mt-4 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
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

        {/* Right Sidebar */}
        <div className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-120px)] space-y-4">
          
          {/* Map Widget (Helpers Nearby) */}
          <LhCard
            padding="none"
            className="overflow-hidden transition-shadow duration-300 hover:shadow-[var(--lh-shadow-md)] motion-reduce:transform-none"
          >
             <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Icons.MapPin className="w-4 h-4 text-blue-600" />
                   <h3 className="font-bold text-gray-900 text-sm">{t('client_dashboard.map_widget_title')}</h3>
                </div>
                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{t('client_dashboard.map_widget_neutral')}</span>
             </div>
             <div className="relative h-40 bg-blue-50/50 flex items-center justify-center overflow-hidden">
                {/* Minimalist Map Background Pattern */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-blue-50/50 to-transparent"></div>
                
                {/* Central Radar Pulse */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full z-0">
                  <div className="absolute inset-0 rounded-full border-2 border-blue-400/80 animate-ping opacity-60 [animation-duration:2.8s] motion-reduce:animate-none"></div>
                  <div className="absolute -inset-4 rounded-full border border-blue-300/60 animate-ping opacity-40 [animation-duration:3.4s] motion-reduce:animate-none"></div>
                </div>

                {/* Simulated Pins */}
                <div className="absolute top-1/4 left-1/4 z-10 motion-reduce:animate-none animate-pulse [animation-duration:2.8s]">
                   <div className="relative group cursor-pointer">
                     <div className="w-7 h-7 bg-white rounded-full border-2 border-blue-500 shadow-md p-0.5"><img src={avatarUrlForName('Sarah K.', 'ffedd5', '9a3412')} className="w-full h-full rounded-full object-cover" alt="" /></div>
                     <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-md -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-lg">{t('client_dashboard.map_pin_km', { km: '0.3' })}</div>
                   </div>
                </div>

                <div className="absolute bottom-1/4 right-1/4 z-10 motion-reduce:animate-none animate-pulse [animation-duration:3.1s]">
                   <div className="relative group cursor-pointer">
                     <div className="w-7 h-7 bg-white rounded-full border-2 border-green-500 shadow-md p-0.5"><img src={avatarUrlForName('Alex M.', 'ede9fe', '5b21b6')} className="w-full h-full rounded-full object-cover" alt="" /></div>
                     <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-md -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-lg">{t('client_dashboard.map_pin_km', { km: '0.8' })}</div>
                   </div>
                </div>

                <div className="absolute top-1/3 right-1/3 shadow-sm z-10 motion-reduce:animate-none animate-pulse [animation-duration:2.5s]">
                   <div className="relative group cursor-pointer">
                     <div className="w-7 h-7 bg-white rounded-full border-2 border-orange-400 shadow-md p-0.5"><img src={avatarUrlForName('Jordan P.', 'ffedd5', '9a3412')} className="w-full h-full rounded-full object-cover" alt="" /></div>
                     <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-md -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-lg">{t('client_dashboard.map_pin_km_busy', { km: '1.2' })}</div>
                   </div>
                </div>
             </div>
             <Link to={ROUTES.map} className="p-2 border-t border-gray-50 bg-gray-50 text-center hover:bg-gray-100 transition-colors cursor-pointer block">
                <span className="text-xs font-semibold text-blue-600">{t('client_dashboard.view_map_expanded')}</span>
             </Link>
             <ClientRadarInsights t={t} clientId={me.id} jobs={jobs} applications={applications} notifications={notifications} />
          </LhCard>
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

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 pb-6 pt-3 sm:pt-4 space-y-5">
              <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col items-center text-center gap-2 sm:items-start sm:text-left sm:flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    {selectedHelper.name}
                    <Icons.CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 fill-blue-50" />
                  </h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <HelperPlanBadge tier={helperPlanFromRoleKey(selectedHelper.roleKey)} size="md" />
                    <TrainingCertBadge level={(selectedHelper as { trainingCert?: TrainingCertLevel }).trainingCert ?? 'none'} size="md" />
                  </div>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-1 w-full">
                    <div className="inline-flex gap-1 items-center bg-yellow-50 text-yellow-800 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-bold border border-yellow-100">
                      <Icons.Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {selectedHelper.rating.toFixed(1)}
                    </div>
                    <div className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-600 font-semibold bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                      <Icons.CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      {t('helper_profile.jobs_completed', { count: 120 })}
                    </div>
                    <div className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-600 font-semibold bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                      <Icons.MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                      {t('helper_profile.distance_km', { km: '1.2' })}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-auto sm:min-w-[280px]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowHelperProfileModal(false);
                      navigate(ROUTES.messages);
                    }}
                    className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white text-slate-800 text-sm font-bold hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                  >
                    <Icons.MessageSquare className="w-5 h-5 shrink-0 text-blue-600" />
                    <span className="flex flex-col items-start leading-tight">
                      <span>{t('helper_profile.cta_chat')}</span>
                      <span className="text-[11px] font-semibold text-slate-500">{t('helper_profile.cta_chat_sub')}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowHelperProfileModal(false);
                      setHireModalKind('proposal');
                      setShowHireModal(true);
                    }}
                    className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-bold hover:bg-slate-100 transition-colors"
                  >
                    <Icons.FileText className="w-5 h-5 shrink-0 text-slate-600" />
                    {t('helper_profile.cta_proposal')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowHelperProfileModal(false);
                      setHireModalKind('hire');
                      setShowHireModal(true);
                    }}
                    className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black shadow-lg shadow-blue-600/25 transition-colors"
                  >
                    <Icons.Briefcase className="w-5 h-5 shrink-0" />
                    {t('helper_profile.cta_hire')}
                  </button>
                </div>
              </div>

              <div className="space-y-5 pt-2 border-t border-gray-100">
                <div>
                  <h3 className="font-bold mb-2 text-xs uppercase tracking-wide text-gray-500">
                    {t('helper_profile.about')}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-sm">{t('helper_profile.demo_bio')}</p>
                </div>
                <div>
                  <h3 className="font-bold mb-2 text-xs uppercase tracking-wide text-gray-500">
                    {t('helper_profile.specialties')}
                  </h3>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {selectedHelper.skills.map((skill: string, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-800 rounded-lg text-xs sm:text-sm font-semibold"
                      >
                        {skillChip(skill)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-3">{t('helper_profile.response_status')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">{t('helper_profile.avg_time')}</p>
                      <p className="font-bold text-gray-900">{t('helper_profile.avg_time_value')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">{t('helper_profile.response_rate')}</p>
                      <p className="font-bold text-green-600">98%</p>
                    </div>
                  </div>
                </div>
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
                    if (hireModalKind === 'hire') {
                      markDemoServiceConfirmed();
                    }
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
