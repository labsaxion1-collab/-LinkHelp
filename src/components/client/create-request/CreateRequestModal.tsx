import React, { useState, useMemo, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAppData } from '@/context/AppDataContext';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import { CreateRequestScheduleStep, type MovePropertyType } from '@/components/client/create-request/CreateRequestScheduleStep';
import { CreateRequestReviewStep } from '@/components/client/create-request/CreateRequestReviewStep';
import { emptyRequestAddress, type RequestAddressValue } from '@/components/client/create-request/RequestAddressInput';
import { descriptionContainsContactInfo } from '@/utils/descriptionContactGuard';
import {
  buildJobDateLabel,
  isScheduleStepComplete,
  jobUrgencyFromPriority,
  resolvePreferredDateIso,
  type PreferredDateMode,
  type RequestPriority,
  type TimeWindow,
} from '@/utils/requestSchedule';

type ModalStep = 'category' | 'schedule' | 'description' | 'review';
const STEPS: ModalStep[] = ['category', 'schedule', 'description', 'review'];
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
  const me = useSessionViewer();

  const [step, setStep] = useState<ModalStep>('category');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [postText, setPostText] = useState('');
  const [budgetHint, setBudgetHint] = useState('');
  const [budgetMin, setBudgetMin] = useState(80);
  const [budgetMax, setBudgetMax] = useState(120);
  const [translationFromLanguage, setTranslationFromLanguage] = useState('');
  const [translationToLanguage, setTranslationToLanguage] = useState('');
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

  const scheduleInput = useMemo(
    () => ({ priority, preferredDateMode, preferredDateIso, preferredTimeWindow, preferredTimeSpecific }),
    [priority, preferredDateMode, preferredDateIso, preferredTimeWindow, preferredTimeSpecific],
  );

  const scheduleExtrasComplete = useMemo(() => {
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
    return Boolean(requestAddress.display.trim());
  }, [
    selectedCategory, selectedSubcategory, movePropertyType, movePickupAddress.display, moveDeliveryAddress.display,
    movePickupFloor, movePickupElevator, moveDeliveryFloor, moveDeliveryElevator,
    cleaningHouseFloors, cleaningAptFloor, cleaningHasElevator, requestAddress.display,
  ]);

  const scheduleComplete = isScheduleStepComplete(scheduleInput) && scheduleExtrasComplete;
  const descriptionBlocked = descriptionContainsContactInfo(postText);
  const translationLanguagesComplete =
    selectedCategory !== 'translation' || Boolean(translationFromLanguage && translationToLanguage);
  const descriptionComplete = Boolean(postText.trim()) && !descriptionBlocked && translationLanguagesComplete;
  const formatBudgetRange = (min: number, max: number) => `CAD $${min}-${max}`;

  const reset = () => {
    setStep(initialCategory && initialSubcategory ? 'schedule' : 'category');
    setSelectedCategory(initialCategory);
    setSelectedSubcategory(initialSubcategory);
    setPostText('');
    setBudgetHint('');
    setBudgetMin(80);
    setBudgetMax(120);
    setTranslationFromLanguage('');
    setTranslationToLanguage('');
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
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    reset();
  }, [open, initialCategory, initialSubcategory]);

  const handlePublish = () => {
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
      ];
      extra = '\n\n---\n' + lines.join('\n');
    }
    const fullDescription = postText.trim() + extra;
    const finalBudgetHint = budgetHint.trim() || formatBudgetRange(budgetMin, budgetMax);
    const addr = selectedCategory === 'moving' ? movePickupAddress : requestAddress;
    const locationParts = [addr.display.trim(), addr.city, addr.region].filter(Boolean);
    const locationLabel = locationParts.join(', ') || t('jobs.remote');
    const categoryLabel = selectedCategory ? t(`categories.${selectedCategory}`) : t('client_dashboard.create_order_title');
    const subKey = selectedSubcategory ? `service_subs.${selectedCategory}.${selectedSubcategory}` : '';
    const subLabel = subKey ? t(subKey) : '';
    const titleLabel = subLabel && subLabel !== subKey ? subLabel : categoryLabel;
    createJob({
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
      latitude: addr.latitude,
      longitude: addr.longitude,
      preferredDate: resolvePreferredDateIso(scheduleInput),
      preferredTimeWindow: preferredTimeWindow || null,
      preferredTime: preferredTimeSpecific.trim() || null,
      date: buildJobDateLabel(scheduleInput),
      value: finalBudgetHint || t('jobs.value_negotiable'),
      urgency: jobUrgencyFromPriority(priority),
    });
    handleClose();
    onPublished?.();
  };

  if (!open) return null;

  const stepIndex = STEPS.indexOf(step);
  const stepIcons: Record<ModalStep, React.ComponentType<{ className?: string }>> = {
    category: Icons.Grid,
    schedule: Icons.Calendar,
    description: Icons.Type,
    review: Icons.CheckCircle2,
  };
  const activeCat = SERVICE_CATEGORIES.find((c) => c.id === selectedCategory);

  const goBack = () => {
    if (step === 'category' && selectedCategory) {
      setSelectedCategory('');
      setSelectedSubcategory('');
      return;
    }
    const idx = stepIndex;
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const goNext = () => {
    const idx = stepIndex;
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const continueDisabled =
    (step === 'schedule' && !scheduleComplete) ||
    (step === 'description' && !descriptionComplete);
  const budgetTrackLeft = (budgetMin / 1000) * 100;
  const budgetTrackRight = 100 - (budgetMax / 1000) * 100;

  const updateBudgetMin = (value: number) => {
    const nextMin = Math.min(value, budgetMax - 10);
    setBudgetMin(nextMin);
    setBudgetHint(formatBudgetRange(nextMin, budgetMax));
  };

  const updateBudgetMax = (value: number) => {
    const nextMax = Math.max(value, budgetMin + 10);
    setBudgetMax(nextMax);
    setBudgetHint(formatBudgetRange(budgetMin, nextMax));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={handleClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200 max-h-[min(92dvh,900px)]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <h3 className="text-xl font-bold text-gray-900 font-display flex items-center gap-2">
            <Icons.PlusCircle className="w-5 h-5 text-blue-600" />
            {t('client_dashboard.create_order_title')}
          </h3>
          <button type="button" onClick={handleClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 pt-5 pb-2 shrink-0">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 rounded-full" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-500 rounded-full"
              style={{ width: (stepIndex / Math.max(STEPS.length - 1, 1)) * 100 + '%' }}
            />
            {STEPS.map((s, idx) => {
              const Icon = stepIcons[s];
              const isActive = idx <= stepIndex;
              return (
                <div key={s} className="relative z-10 flex flex-col items-center">
                  <div className={'w-8 h-8 rounded-full flex items-center justify-center text-sm ' + (isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-white border-2 border-gray-200 text-gray-400')}>
                    {idx < stepIndex ? <Icons.Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="p-6 overflow-y-auto overscroll-contain flex-1 min-h-0">
          {step === 'category' && !selectedCategory && (
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SERVICE_CATEGORIES.map((cat) => {
                  const IconComponent = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[cat.icon];
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { setSelectedCategory(cat.id); setSelectedSubcategory(''); }}
                      className="flex flex-col items-center p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-300 bg-white hover:shadow-md transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                        {IconComponent ? <IconComponent className="w-6 h-6" /> : null}
                      </div>
                      <span className="text-sm font-bold text-center">{t('categories.' + cat.id)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {step === 'category' && selectedCategory && (
            <div className="animate-in fade-in duration-300">
              <button type="button" onClick={() => setSelectedCategory('')} className="text-sm font-bold text-blue-600 mb-4">
                {t('create_modal.change_category')}
              </button>
              <h4 className="text-2xl font-bold text-gray-900 mb-2">{t('create_modal.select_sub')}</h4>
              <p className="text-gray-500 text-sm mb-6">{t('create_modal.select_sub_desc', { category: activeCat ? t('categories.' + activeCat.id) : '' })}</p>
              <div className="space-y-3">
                {activeCat?.subKeys.map((subKey) => (
                  <button
                    key={subKey}
                    type="button"
                    onClick={() => { setSelectedSubcategory(subKey); setStep('schedule'); }}
                    className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 bg-white text-left"
                  >
                    <span className="font-bold text-gray-900">{t('service_subs.' + activeCat.id + '.' + subKey)}</span>
                    <Icons.ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 'schedule' && (
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
            />
          )}
          {step === 'description' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <h4 className="text-2xl font-bold text-gray-900">{t('create_modal.describe_simple')}</h4>
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-800">{t('create_modal.budget_hint_label')}</label>
                <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 focus-within:border-blue-500">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wide text-gray-400">{t('create_modal.budget_min_label')}</span>
                      <span className="text-lg font-black text-slate-950">CAD ${budgetMin}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-bold uppercase tracking-wide text-gray-400">{t('create_modal.budget_max_label')}</span>
                      <span className="text-lg font-black text-slate-950">CAD ${budgetMax}</span>
                    </div>
                  </div>
                  <div className="relative h-8">
                    <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-100" />
                    <div
                      className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-blue-600"
                      style={{ left: `${budgetTrackLeft}%`, right: `${budgetTrackRight}%` }}
                    />
                    <input
                      aria-label={t('create_modal.budget_min_label')}
                      type="range"
                      min="0"
                      max="1000"
                      step="10"
                      value={budgetMin}
                      onChange={(e) => updateBudgetMin(Number(e.target.value))}
                      className="pointer-events-none absolute inset-x-0 top-1/2 h-2 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-md"
                    />
                    <input
                      aria-label={t('create_modal.budget_max_label')}
                      type="range"
                      min="0"
                      max="1000"
                      step="10"
                      value={budgetMax}
                      onChange={(e) => updateBudgetMax(Number(e.target.value))}
                      className="pointer-events-none absolute inset-x-0 top-1/2 h-2 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-md"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-gray-400">
                    <span>CAD $0</span>
                    <span>CAD $1000+</span>
                  </div>
                </div>
                <p className="mt-1.5 text-xs font-medium text-gray-500">{t('create_modal.budget_hint_help')}</p>
              </div>
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
                <textarea
                  autoFocus
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
          {step === 'review' && (
            <CreateRequestReviewStep
              t={t}
              selectedCategory={selectedCategory}
              selectedSubcategory={selectedSubcategory}
              postText={postText}
              budgetHint={budgetHint.trim() || formatBudgetRange(budgetMin, budgetMax)}
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
        <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-between items-center shrink-0">
          {step === 'category' && !selectedCategory ? (
            <span />
          ) : (
            <button type="button" onClick={goBack} className="px-5 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">
              {t('common.back')}
            </button>
          )}
          {step === 'review' ? (
            <button type="button" onClick={handlePublish} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl ml-auto flex items-center gap-2">
              {t('create_modal.publish_help')} <Icons.Rocket className="w-5 h-5" />
            </button>
          ) : step === 'category' ? (
            <span />
          ) : (
            <button
              type="button"
              disabled={continueDisabled}
              onClick={goNext}
              className="bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 px-8 rounded-xl ml-auto flex items-center gap-2"
            >
              {t('common.continue')} <Icons.ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
