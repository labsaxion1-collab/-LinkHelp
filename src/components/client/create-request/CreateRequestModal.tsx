import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAppData } from '@/context/AppDataContext';
import { useToast } from '@/context/ToastContext';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import { getCategoryLucideIcon } from '@/utils/categoryIcons';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { CreateRequestScheduleStep, type MovePropertyType } from '@/components/client/create-request/CreateRequestScheduleStep';
import { CreateRequestReviewStep } from '@/components/client/create-request/CreateRequestReviewStep';
import {
  CreateRequestConfirmStep,
  isConfirmStepComplete,
} from '@/components/client/create-request/CreateRequestConfirmStep';
import { emptyRequestAddress, type RequestAddressValue } from '@/components/client/create-request/RequestAddressInput';
import { descriptionContainsContactInfo } from '@/utils/descriptionContactGuard';
import {
  buildBudgetLabelFromRange,
  parseBudgetInput,
  parseBudgetInt,
} from '@/utils/formatJobBudget';
import {
  buildJobDateLabel,
  jobUrgencyFromPriority,
  resolvePreferredDateIso,
  type PreferredDateMode,
  type RequestPriority,
  type TimeWindow,
} from '@/utils/requestSchedule';

type ModalStep = 'category' | 'subcategory' | 'description' | 'confirm' | 'review';
const STEPS: ModalStep[] = ['category', 'subcategory', 'description', 'confirm', 'review'];
const TRANSLATION_LANGUAGE_OPTIONS = ['Português', 'Inglês', 'Francês', 'Espanhol', 'Italiano', 'Árabe'] as const;

function needsBuilding(type: MovePropertyType) {
  return type === 'apartment' || type === 'office' || type === 'business';
}

type Props = {
  open: boolean;
  onClose: () => void;
  onPublished?: () => void;
  initialCategory?: string;
  initialSubcategory?: string;
};

export function CreateRequestModal({ open, onClose, onPublished, initialCategory = '', initialSubcategory = '' }: Props) {
  const { t } = useLanguage();
  const { createJob } = useAppData();
  const { showToast } = useToast();
  const me = useSessionViewer();

  const [step, setStep] = useState<ModalStep>('category');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [postText, setPostText] = useState('');
  const [budgetType, setBudgetType] = useState<'fixed' | 'negotiable'>('negotiable');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [translationFromLanguage, setTranslationFromLanguage] = useState('');
  const [translationToLanguage, setTranslationToLanguage] = useState('');
  const [translationServiceMode, setTranslationServiceMode] = useState<'online' | 'in_person' | ''>('');
  const [requestAddress, setRequestAddress] = useState<RequestAddressValue>(() => emptyRequestAddress());
  const [priority, setPriority] = useState<RequestPriority>('flexible');
  const [preferredDateMode, setPreferredDateMode] = useState<PreferredDateMode>('today');
  const [preferredDateIso, setPreferredDateIso] = useState('');
  const [preferredTimeWindow, setPreferredTimeWindow] = useState<TimeWindow>('');
  const [preferredTimeSpecific, setPreferredTimeSpecific] = useState('');
  const [showSpecificTime, setShowSpecificTime] = useState(false);
  const [movePropertyType, setMovePropertyType] = useState<MovePropertyType>('');
  const [movePickupAddress, setMovePickupAddress] = useState<RequestAddressValue>(() => emptyRequestAddress());
  const [moveDeliveryAddress, setMoveDeliveryAddress] = useState<RequestAddressValue>(() => emptyRequestAddress());
  const [movePickupFloor, setMovePickupFloor] = useState('');
  const [movePickupElevator, setMovePickupElevator] = useState('');
  const [moveDeliveryFloor, setMoveDeliveryFloor] = useState('');
  const [moveDeliveryElevator, setMoveDeliveryElevator] = useState('');
  const [cleaningHouseFloors, setCleaningHouseFloors] = useState('');
  const [cleaningAptFloor, setCleaningAptFloor] = useState('');
  const [cleaningHasElevator, setCleaningHasElevator] = useState('');
  const [publishing, setPublishing] = useState(false);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const scrollModalToTop = useCallback((behavior: ScrollBehavior = 'instant') => {
    const el = scrollBodyRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior });
  }, []);

  const scheduleInput = useMemo(
    () => ({ priority, preferredDateMode, preferredDateIso, preferredTimeWindow, preferredTimeSpecific }),
    [priority, preferredDateMode, preferredDateIso, preferredTimeWindow, preferredTimeSpecific],
  );

  const detailsComplete = useMemo(() => {
    if (selectedCategory === 'moving') {
      if (!movePropertyType || !movePickupAddress.display.trim() || !moveDeliveryAddress.display.trim()) return false;
      if (needsBuilding(movePropertyType)) {
        return Boolean(movePickupFloor.trim() && movePickupElevator && moveDeliveryFloor.trim() && moveDeliveryElevator);
      }
      return true;
    }
    if (selectedCategory === 'cleaning' && selectedSubcategory === 'house') return Boolean(cleaningHouseFloors);
    if (selectedCategory === 'cleaning' && selectedSubcategory === 'apartment') {
      return Boolean(cleaningAptFloor && cleaningHasElevator);
    }
    if (selectedCategory === 'translation') {
      if (!translationServiceMode) return false;
      return translationServiceMode === 'online' || Boolean(requestAddress.display.trim());
    }
    return Boolean(requestAddress.display.trim());
  }, [
    selectedCategory, selectedSubcategory, movePropertyType, movePickupAddress.display, moveDeliveryAddress.display,
    movePickupFloor, movePickupElevator, moveDeliveryFloor, moveDeliveryElevator,
    cleaningHouseFloors, cleaningAptFloor, cleaningHasElevator, translationServiceMode, requestAddress.display,
  ]);

  const descriptionBlocked = descriptionContainsContactInfo(postText);
  const translationLanguagesComplete =
    selectedCategory !== 'translation' || Boolean(translationFromLanguage && translationToLanguage);
  const descriptionComplete = detailsComplete && !descriptionBlocked && translationLanguagesComplete;
  const parsedBudgetMin = budgetType === 'fixed' && selectedCategory !== 'translation' ? parseBudgetInt(budgetMin) : null;
  const parsedBudgetMax = budgetType === 'fixed' && selectedCategory !== 'translation' ? parseBudgetInt(budgetMax) : null;
  const rangeBudgetIsValid =
    budgetType === 'fixed' &&
    Boolean(parsedBudgetMin || parsedBudgetMax) &&
    (parsedBudgetMin == null || parsedBudgetMax == null || parsedBudgetMin <= parsedBudgetMax);
  const rangeBudgetIsInvalid =
    budgetType === 'fixed' &&
    parsedBudgetMin != null &&
    parsedBudgetMax != null &&
    parsedBudgetMin > parsedBudgetMax;
  const budgetLabel = buildBudgetLabelFromRange(budgetType, parsedBudgetMin, parsedBudgetMax, t);
  const budgetStorageType: 'fixed' | 'negotiable' = rangeBudgetIsValid ? 'fixed' : 'negotiable';

  const reset = () => {
    setStep(initialCategory && initialSubcategory ? 'description' : initialCategory ? 'subcategory' : 'category');
    setSelectedCategory(initialCategory);
    setSelectedSubcategory(initialSubcategory);
    setPostText('');
    setBudgetType('negotiable');
    setBudgetMin('');
    setBudgetMax('');
    setTranslationFromLanguage('');
    setTranslationToLanguage('');
    setTranslationServiceMode('');
    setRequestAddress(emptyRequestAddress());
    setPriority('flexible');
    setPreferredDateMode('today');
    setPreferredDateIso('');
    setPreferredTimeWindow('');
    setPreferredTimeSpecific('');
    setShowSpecificTime(false);
    setMovePropertyType('');
    setMovePickupAddress(emptyRequestAddress());
    setMoveDeliveryAddress(emptyRequestAddress());
    setMovePickupFloor('');
    setMovePickupElevator('');
    setMoveDeliveryFloor('');
    setMoveDeliveryElevator('');
    setCleaningHouseFloors('');
    setCleaningAptFloor('');
    setCleaningHasElevator('');
    setPublishing(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    reset();
  }, [open, initialCategory, initialSubcategory]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => scrollModalToTop('instant'));
    return () => cancelAnimationFrame(frame);
  }, [step, open, scrollModalToTop]);

  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);
    const yn = (v: string) => (v === 'yes' ? t('create_modal.moving_yes') : v === 'no' ? t('create_modal.moving_no') : '—');
    let extra = '';
    if (selectedCategory === 'moving') {
      const lines = [
        t('create_modal.moving_property_type') + ': ' + t('create_modal.moving_property_' + movePropertyType),
        t('create_modal.moving_pickup_address') + ': ' + movePickupAddress.display,
        t('create_modal.moving_delivery_address') + ': ' + moveDeliveryAddress.display,
      ];
      if (needsBuilding(movePropertyType)) {
        lines.push(t('create_modal.moving_floor_pickup') + ': ' + movePickupFloor.trim());
        lines.push(t('create_modal.moving_elevator_label') + ': ' + yn(movePickupElevator));
        lines.push(t('create_modal.moving_floor_delivery') + ': ' + moveDeliveryFloor.trim());
        lines.push(t('create_modal.moving_elevator_delivery') + ': ' + yn(moveDeliveryElevator));
      }
      extra = '\n\n—\n' + lines.join('\n');
    } else if (selectedCategory === 'cleaning') {
      const lines: string[] = [];
      if (selectedSubcategory === 'house' && cleaningHouseFloors) {
        lines.push(t('create_modal.cleaning_house_floors') + ': ' + cleaningHouseFloors);
      }
      if (selectedSubcategory === 'apartment') {
        if (cleaningAptFloor) lines.push(t('create_modal.cleaning_apt_floor') + ': ' + cleaningAptFloor);
        if (cleaningHasElevator) lines.push(t('create_modal.cleaning_elevator') + ': ' + yn(cleaningHasElevator));
      }
      if (lines.length) extra = '\n\n—\n' + lines.join('\n');
    } else if (selectedCategory === 'translation') {
      const lines = [
        t('create_modal.translation_from_language') + ': ' + translationFromLanguage,
        t('create_modal.translation_to_language') + ': ' + translationToLanguage,
        'Tipo de atendimento: ' + (translationServiceMode === 'online' ? 'Online' : 'Presencial'),
      ];
      extra = '\n\n---\n' + lines.join('\n');
    }
    const fullDescription = postText.trim() + extra;
    const addr =
      selectedCategory === 'moving'
        ? movePickupAddress
        : selectedCategory === 'translation' && translationServiceMode === 'online'
          ? emptyRequestAddress()
          : requestAddress;
    const locationParts = [addr.display.trim(), addr.city, addr.region].filter(Boolean);
    const locationLabel = locationParts.join(', ') || t('jobs.remote');
    const categoryLabel = selectedCategory ? t(`categories.${selectedCategory}`) : t('client_dashboard.create_order_title');
    const subKey = selectedSubcategory ? `service_subs.${selectedCategory}.${selectedSubcategory}` : '';
    const subLabel = subKey ? t(subKey) : '';
    const titleLabel = subLabel && subLabel !== subKey ? subLabel : categoryLabel;
    try {
      await createJob({
        clientId: me.id,
        clientName: me.name,
        clientAvatar: me.avatar,
        title: `${categoryLabel}: ${titleLabel}`,
        description: fullDescription,
        category: selectedCategory,
        subcategory: selectedSubcategory || null,
        location: locationLabel,
        address: addr.address || addr.display.trim() || null,
        city: addr.city || null,
        region: addr.region || null,
        postalCode: addr.postalCode?.trim() || null,
        latitude: addr.latitude,
        longitude: addr.longitude,
        preferredDate: resolvePreferredDateIso(scheduleInput),
        preferredTimeWindow: preferredTimeWindow || null,
        preferredTime: preferredTimeSpecific.trim() || null,
        date: buildJobDateLabel(scheduleInput),
        value: budgetLabel,
        budgetType: budgetStorageType,
        budgetAmount: parsedBudgetMin && !parsedBudgetMax ? parsedBudgetMin : parsedBudgetMax && !parsedBudgetMin ? parsedBudgetMax : null,
        budgetMin: rangeBudgetIsValid ? parsedBudgetMin : null,
        budgetMax: rangeBudgetIsValid ? parsedBudgetMax : null,
        currency: 'CAD',
        urgency: jobUrgencyFromPriority(priority),
      });
      handleClose();
      onPublished?.();
    } catch (error) {
      const technical =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: string }).message)
          : error instanceof Error
            ? error.message
            : String(error);
      console.error('[LinkHelp] create request failed', error);
      if (import.meta.env.DEV) {
        console.info('[LinkHelp] create request technical:', technical);
      }
      showToast(t('create_modal.publish_error'), 'error');
      setPublishing(false);
    }
  };

  if (!open) return null;

  const stepIndex = STEPS.indexOf(step);
  const stepIcons: Record<ModalStep, React.ComponentType<{ className?: string }>> = {
    category: Icons.Grid,
    subcategory: Icons.ListChecks,
    description: Icons.Type,
    confirm: Icons.CalendarCheck,
    review: Icons.CheckCircle2,
  };
  const activeCat = SERVICE_CATEGORIES.find((c) => c.id === selectedCategory);

  const goBack = () => {
    const idx = stepIndex;
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const goNext = () => {
    const idx = stepIndex;
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const continueDisabled =
    (step === 'description' && (!descriptionComplete || rangeBudgetIsInvalid)) ||
    (step === 'confirm' &&
      !isConfirmStepComplete(preferredDateMode, preferredDateIso, selectedCategory, preferredTimeSpecific));

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center lh-modal-overlay animate-in fade-in duration-200" onClick={handleClose}>
      <div
        className="lh-modal-panel w-full max-w-[calc(100vw-1.5rem)] sm:max-w-2xl overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200 max-h-[min(92dvh,900px)] min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center gap-2 sm:gap-3 bg-gray-50/50 shrink-0 min-w-0">
          <DesktopBackButton alwaysVisible onClose={handleClose} className="shrink-0" />
          <h3 className="min-w-0 flex-1 text-xl font-bold text-gray-900 font-display flex items-center gap-2">
            <Icons.PlusCircle className="w-5 h-5 text-blue-600 shrink-0" />
            <span className="truncate">{t('client_dashboard.create_order_title')}</span>
          </h3>
          <button type="button" onClick={handleClose} className="shrink-0 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 sm:px-6 pt-4 pb-2 shrink-0 min-w-0">
          <div className="relative grid w-full max-w-full grid-cols-5 gap-1">
            <div className="pointer-events-none absolute top-1/2 left-[10%] right-[10%] h-0.5 -translate-y-1/2 rounded-full bg-gray-100" />
            <div
              className="pointer-events-none absolute top-1/2 left-[10%] z-0 h-0.5 -translate-y-1/2 rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `calc(${(stepIndex / Math.max(STEPS.length - 1, 1)) * 80}% + 10%)` }}
            />
            {STEPS.map((s, idx) => {
              const Icon = stepIcons[s];
              const isActive = idx <= stepIndex;
              return (
                <div key={s} className="relative z-10 flex flex-col items-center">
                  <div
                    className={
                      'flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-sm ' +
                      (isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-white border-2 border-gray-200 text-gray-400')
                    }
                  >
                    {idx < stepIndex ? <Icons.Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div
          ref={scrollBodyRef}
          className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden overscroll-contain flex-1 min-h-0 min-w-0 ios-scroll w-full max-w-full"
        >
          {step === 'category' && (
            <div className="animate-in fade-in duration-300">
              <h4 className="text-2xl font-bold text-gray-900 mb-2">{t('create_modal.select_category')}</h4>
              <p className="text-gray-500 text-sm mb-6">{t('create_modal.select_category_desc')}</p>
              <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <p className="text-sm font-bold text-blue-950 flex items-center gap-2">
                  <Icons.Sparkles className="w-4 h-4 text-blue-600" />
                  {t('create_modal.marketplace_tip_title')}
                </p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-blue-900">
                  {t('create_modal.marketplace_tip_body')}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-full">
                {SERVICE_CATEGORIES.map((cat) => {
                  const IconComponent = getCategoryLucideIcon(cat.icon);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { setSelectedCategory(cat.id); setSelectedSubcategory(''); setStep('subcategory'); }}
                      className="flex w-full max-w-full min-w-0 flex-col items-center p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-300 bg-white hover:shadow-md transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-bold text-center">{t('categories.' + cat.id)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {step === 'subcategory' && (
            <div className="animate-in fade-in duration-300">
              <button type="button" onClick={() => setStep('category')} className="text-sm font-bold text-blue-600 mb-4">
                {t('create_modal.change_category')}
              </button>
              <h4 className="text-2xl font-bold text-gray-900 mb-2">{t('create_modal.select_sub')}</h4>
              <p className="text-gray-500 text-sm mb-6">{t('create_modal.select_sub_desc', { category: activeCat ? t('categories.' + activeCat.id) : '' })}</p>
              <div className="space-y-3 w-full max-w-full min-w-0">
                {activeCat?.subKeys.map((subKey) => (
                  <button
                    key={subKey}
                    type="button"
                    onClick={() => { setSelectedSubcategory(subKey); setStep('description'); }}
                    className="w-full max-w-full min-w-0 flex items-center justify-between gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 bg-white text-left"
                  >
                    <span className="min-w-0 flex-1 truncate font-bold text-gray-900">{t('service_subs.' + activeCat.id + '.' + subKey)}</span>
                    <Icons.ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 'description' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <CreateRequestScheduleStep
                t={t}
                selectedCategory={selectedCategory}
                selectedSubcategory={selectedSubcategory}
                priority={priority}
                setPriority={setPriority}
                preferredDateMode={preferredDateMode}
                setPreferredDateMode={setPreferredDateMode}
                preferredDateIso={preferredDateIso}
                setPreferredDateIso={setPreferredDateIso}
                preferredTimeWindow={preferredTimeWindow}
                setPreferredTimeWindow={setPreferredTimeWindow}
                preferredTimeSpecific={preferredTimeSpecific}
                setPreferredTimeSpecific={setPreferredTimeSpecific}
                showSpecificTime={showSpecificTime}
                setShowSpecificTime={setShowSpecificTime}
                requestAddress={requestAddress}
                setRequestAddress={setRequestAddress}
                movePropertyType={movePropertyType}
                setMovePropertyType={setMovePropertyType}
                movePickupAddress={movePickupAddress}
                setMovePickupAddress={setMovePickupAddress}
                moveDeliveryAddress={moveDeliveryAddress}
                setMoveDeliveryAddress={setMoveDeliveryAddress}
                movePickupFloor={movePickupFloor}
                setMovePickupFloor={setMovePickupFloor}
                movePickupElevator={movePickupElevator}
                setMovePickupElevator={setMovePickupElevator}
                moveDeliveryFloor={moveDeliveryFloor}
                setMoveDeliveryFloor={setMoveDeliveryFloor}
                moveDeliveryElevator={moveDeliveryElevator}
                setMoveDeliveryElevator={setMoveDeliveryElevator}
                cleaningHouseFloors={cleaningHouseFloors}
                setCleaningHouseFloors={setCleaningHouseFloors}
                cleaningAptFloor={cleaningAptFloor}
                setCleaningAptFloor={setCleaningAptFloor}
                cleaningHasElevator={cleaningHasElevator}
                setCleaningHasElevator={setCleaningHasElevator}
                translationServiceMode={translationServiceMode}
                setTranslationServiceMode={setTranslationServiceMode}
              />
              {selectedCategory !== 'translation' ? (
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-800">{t('create_modal.budget_hint_label')}</label>
                <div className="w-full max-w-full overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-3 sm:p-4 focus-within:border-blue-500">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <label
                      className={`flex min-h-[52px] min-w-0 flex-1 items-center rounded-xl border px-3 focus-within:border-blue-500 focus-within:bg-white ${
                        budgetType === 'negotiable' ? 'border-slate-200 bg-slate-50/70 opacity-75' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <span className="mr-2 shrink-0 text-[10px] font-bold uppercase text-slate-500">{t('create_modal.budget_min_label')}</span>
                      <span className="shrink-0 text-sm font-black text-slate-900">CAD $</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min="0"
                        step="1"
                        value={budgetMin}
                        onFocus={() => setBudgetType('fixed')}
                        onChange={(e) => {
                          setBudgetType('fixed');
                          setBudgetMin(parseBudgetInput(e.target.value));
                        }}
                        placeholder="50"
                        className="min-w-0 flex-1 bg-transparent px-2 text-base font-black text-slate-950 outline-none placeholder:text-slate-400 sm:text-lg"
                      />
                    </label>
                    <span className="hidden shrink-0 text-sm font-bold text-slate-400 sm:inline">{t('create_modal.budget_range_to')}</span>
                    <label
                      className={`flex min-h-[52px] min-w-0 flex-1 items-center rounded-xl border px-3 focus-within:border-blue-500 focus-within:bg-white ${
                        budgetType === 'negotiable' ? 'border-slate-200 bg-slate-50/70 opacity-75' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <span className="mr-2 shrink-0 text-[10px] font-bold uppercase text-slate-500">{t('create_modal.budget_max_label')}</span>
                      <span className="shrink-0 text-sm font-black text-slate-900">CAD $</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min="0"
                        step="1"
                        value={budgetMax}
                        onFocus={() => setBudgetType('fixed')}
                        onChange={(e) => {
                          setBudgetType('fixed');
                          setBudgetMax(parseBudgetInput(e.target.value));
                        }}
                        placeholder="120"
                        className="min-w-0 flex-1 bg-transparent px-2 text-base font-black text-slate-950 outline-none placeholder:text-slate-400 sm:text-lg"
                      />
                    </label>
                  </div>
                  {rangeBudgetIsInvalid ? (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                      {t('create_modal.budget_range_invalid')}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetType('negotiable');
                      setBudgetMin('');
                      setBudgetMax('');
                    }}
                    className={`mt-3 flex min-h-[44px] w-full items-center justify-center rounded-xl border px-4 text-sm font-black transition-colors ${
                      budgetType === 'negotiable'
                        ? 'border-[#1565FF] bg-[#1565FF] text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {budgetType === 'negotiable' ? <Icons.Check className="mr-2 h-4 w-4" /> : null}
                    {t('create_modal.budget_negotiate')}
                  </button>
                  <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-950">
                    {budgetType === 'negotiable'
                      ? t('create_modal.budget_selected_negotiable')
                      : budgetStorageType === 'fixed'
                        ? budgetLabel
                        : t('create_modal.budget_summary_negotiable')}
                  </div>
                </div>
                <p className="mt-1.5 text-xs font-medium text-gray-500">{t('create_modal.budget_hint_help')}</p>
              </div>
              ) : null}
              {selectedCategory === 'translation' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-gray-800">{t('create_modal.translation_from_language')}</span>
                    <select
                      value={translationFromLanguage}
                      onChange={(e) => setTranslationFromLanguage(e.target.value)}
                      className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 bg-white px-4 text-base font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">{t('create_modal.translation_language_placeholder')}</option>
                      {TRANSLATION_LANGUAGE_OPTIONS.map((language) => (
                        <option key={language} value={language}>{language}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-gray-800">{t('create_modal.translation_to_language')}</span>
                    <select
                      value={translationToLanguage}
                      onChange={(e) => setTranslationToLanguage(e.target.value)}
                      className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 bg-white px-4 text-base font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">{t('create_modal.translation_language_placeholder')}</option>
                      {TRANSLATION_LANGUAGE_OPTIONS.map((language) => (
                        <option key={language} value={language}>{language}</option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-800">{t('create_modal.activity_description_label')}</label>
                <p className="mb-2 text-xs font-medium text-slate-500">{t('create_modal.description_optional_hint')}</p>
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder={t('create_modal.placeholder')}
                  maxLength={500}
                  className="w-full min-h-[180px] bg-gray-50 border-2 border-gray-200 rounded-2xl px-5 py-4 focus:border-blue-500 focus:outline-none resize-none text-lg"
                />
                {descriptionBlocked ? (
                  <p className="mt-2 text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                    {t('create_modal.description_contact_warning')}
                  </p>
                ) : null}
              </div>
              <p className="text-sm text-gray-400 text-right">{postText.length}/500</p>
            </div>
          )}
          {step === 'confirm' && (
            <CreateRequestConfirmStep
              t={t}
              selectedCategory={selectedCategory}
              preferredDateMode={preferredDateMode}
              setPreferredDateMode={setPreferredDateMode}
              preferredDateIso={preferredDateIso}
              setPreferredDateIso={setPreferredDateIso}
              preferredTimeSpecific={preferredTimeSpecific}
              setPreferredTimeSpecific={setPreferredTimeSpecific}
            />
          )}
          {step === 'review' && (
            <CreateRequestReviewStep
              t={t}
              selectedCategory={selectedCategory}
              selectedSubcategory={selectedSubcategory}
              postText={postText}
              budgetHint={budgetLabel}
              translationFromLanguage={translationFromLanguage}
              translationToLanguage={translationToLanguage}
              requestAddress={requestAddress}
              movePickupAddress={movePickupAddress}
              moveDeliveryAddress={moveDeliveryAddress}
              movePropertyType={movePropertyType}
              priority={priority}
              preferredTimeWindow={preferredTimeWindow}
              preferredTimeSpecific={preferredTimeSpecific}
              preferredDateMode={preferredDateMode}
              preferredDateIso={preferredDateIso}
            />
          )}
        </div>
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white border-t border-gray-100 flex flex-wrap justify-between items-center gap-2 shrink-0 min-w-0 w-full max-w-full">
          {step === 'category' ? (
            <span />
          ) : (
            <button type="button" onClick={goBack} className="px-5 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">
              {t('common.back')}
            </button>
          )}
          {step === 'review' ? (
            <button
              type="button"
              disabled={publishing}
              onClick={() => void handlePublish()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3.5 px-8 rounded-xl ml-auto flex items-center gap-2"
            >
              {publishing ? <Icons.Loader2 className="w-5 h-5 animate-spin" /> : <Icons.Rocket className="w-5 h-5" />}
              Publicar pedido
            </button>
          ) : step === 'category' || step === 'subcategory' ? (
            <span />
          ) : (
            <button
              type="button"
              disabled={continueDisabled}
              onClick={goNext}
              className="bg-[#1565FF] hover:bg-[#0F55D9] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 px-8 rounded-xl ml-auto flex items-center gap-2"
            >
              {t('common.continue')} <Icons.ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
