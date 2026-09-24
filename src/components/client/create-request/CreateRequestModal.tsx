import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAppData } from '@/context/AppDataContext';
import { useToast } from '@/context/ToastContext';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { SERVICE_CATEGORIES, isOfficialServiceSubcategory, type ServiceCategoryId } from '@/data/serviceCategories';
import { getRequestCategoryGroup, isRequestCategoryGroupId, type RequestCategoryGroupId } from '@/data/requestCategoryGroups';
import { CreateRequestCategoryStep, CreateRequestServiceStep } from './CreateRequestCategorySteps';
import { appendOtherServiceType, isOtherServiceTypeValid } from '@/utils/requestOtherService';
import { clsx } from 'clsx';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { CreateRequestScheduleStep, type MovePropertyType } from '@/components/client/create-request/CreateRequestScheduleStep';
import { CreateRequestReviewStep } from '@/components/client/create-request/CreateRequestReviewStep';
import {
  CreateRequestConfirmStep,
  isConfirmStepComplete,
} from '@/components/client/create-request/CreateRequestConfirmStep';
import { emptyRequestAddress, type RequestAddressValue } from '@/components/client/create-request/RequestAddressInput';
import { TRANSLATION_REQUEST_LANGUAGES, getSpokenLanguageLabel } from '@/data/spokenLanguages';
import { isValidRequestAddress } from '@/utils/requestAddressValidation';
import {
  publishCoordinatesForMode,
  publishRequiresCoordinates,
  publishRequiresMapAddress,
} from '@/utils/publishAddressPolicy';
import { descriptionContainsContactInfo } from '@/utils/descriptionContactGuard';
import {
  buildBudgetLabelFromRange,
  parseBudgetInput,
  parseBudgetInt,
  type BudgetMode,
} from '@/utils/formatJobBudget';
import {
  buildJobDateLabel,
  jobUrgencyFromPriority,
  resolvePreferredDateIso,
  type RequestPriority,
} from '@/utils/requestSchedule';
import { getMarketBudgetSuggestion } from '@/utils/marketBudgetSuggestions';
import { getBrowserTimezone } from '@/utils/browserTimezone';
import {
  movingNeedsBuildingDetails,
  movingPropertyTypeFromSubKey,
} from '@/data/movingRequestConfig';
import {
  CreateRequestResumeDraftDialog,
  CreateRequestSaveDraftDialog,
} from '@/components/client/create-request/CreateRequestDraftDialogs';
import {
  clearCreateRequestDraft,
  hasMeaningfulCreateRequestDraft,
  loadCreateRequestDraft,
  saveCreateRequestDraft,
  type CreateRequestDraft,
} from '@/utils/createRequestDraft';
import { InsufficientClientCreditsError, ActiveCreditObligationError } from '@/services/supabase/appDataRemote';
import { buildCanonicalJobTitle } from '@/utils/translateCategory';
import { coerceServiceMode, isBaselineFinanceEnabled, type ServiceMode } from '@/config/baselineFinance';
import { getServiceModePolicy } from '@/config/serviceModePolicy';
import { getDefaultSubcategoryForCategory } from '@/config/createRequestDefaultSubcategory';
import { formatBaselineFinanceError, isActiveCreditObligationError } from '@/utils/formatBaselineFinanceError';
import { UI_VISIBILITY } from '@/config/uiVisibility';
import { ROUTES } from '@/utils/constants';

type ModalStep = 'category' | 'subcategory' | 'description' | 'confirm' | 'review';
const STEPS: ModalStep[] = ['category', 'subcategory', 'description', 'confirm', 'review'];

function resolveInternalSubcategory(categoryId: string, preferred?: string): string {
  const preferredTrim = (preferred ?? '').trim();
  if (preferredTrim) return preferredTrim;
  return getDefaultSubcategoryForCategory(categoryId) ?? '';
}

function needsBuildingForMoving(subKey: string) {
  return movingNeedsBuildingDetails(subKey);
}

type Props = {
  open: boolean;
  onClose: () => void;
  onPublished?: () => void;
  initialCategory?: string;
  initialSubcategory?: string;
};

export function CreateRequestModal({ open, onClose, onPublished, initialCategory = '', initialSubcategory = '' }: Props) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { createJob } = useAppData();
  const { showToast } = useToast();
  const me = useSessionViewer();

  const [step, setStep] = useState<ModalStep>('category');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedDisplayGroup, setSelectedDisplayGroup] = useState<RequestCategoryGroupId | ''>('');
  const [otherServiceType, setOtherServiceType] = useState('');
  const [postText, setPostText] = useState('');
  const [budgetType, setBudgetType] = useState<BudgetMode>('unset');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [translationFromLanguage, setTranslationFromLanguage] = useState('');
  const [translationToLanguage, setTranslationToLanguage] = useState('');
  const [translationServiceMode, setTranslationServiceMode] = useState<'online' | 'in_person' | ''>('');
  /** Canonical modality for pack 40 — collected for all categories. */
  const [serviceMode, setServiceMode] = useState<ServiceMode | ''>('');
  const [requestAddress, setRequestAddress] = useState<RequestAddressValue>(() => emptyRequestAddress());
  const [priority, setPriority] = useState<RequestPriority>('flexible');
  const [preferredDateIso, setPreferredDateIso] = useState('');
  const [preferredTimeSpecific, setPreferredTimeSpecific] = useState('');
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
  const [draftDialog, setDraftDialog] = useState<'resume' | 'close' | null>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const publishInFlightRef = useRef(false);
  const lastBudgetSuggestionKey = useRef('');
  const skipAutoSaveRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollModalToTop = useCallback((behavior: ScrollBehavior = 'instant') => {
    const el = scrollBodyRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior });
  }, []);

  const preferredExactTime = preferredTimeSpecific.trim() || null;

  const scheduleInput = useMemo(
    () => ({
      priority,
      preferredDateIso,
      preferredTimeWindow: '' as const,
      preferredTimeSpecific: preferredExactTime ?? '',
    }),
    [priority, preferredDateIso, preferredExactTime],
  );

  const detailsComplete = useMemo(() => {
    const resolvedMode: ServiceMode | '' =
      serviceMode ||
      (translationServiceMode === 'online'
        ? 'remote'
        : translationServiceMode === 'in_person'
          ? 'in_person'
          : '');

    if (isBaselineFinanceEnabled() && !resolvedMode) return false;

    if (selectedCategory === 'moving') {
      if (!isValidRequestAddress(movePickupAddress) || !isValidRequestAddress(moveDeliveryAddress)) return false;
      if (needsBuildingForMoving(selectedSubcategory)) {
        return Boolean(movePickupFloor.trim() && movePickupElevator && moveDeliveryFloor.trim() && moveDeliveryElevator);
      }
      return true;
    }
    if (selectedCategory === 'cleaning' && selectedSubcategory === 'house') return Boolean(cleaningHouseFloors);
    if (selectedCategory === 'cleaning' && selectedSubcategory === 'apartment') {
      return Boolean(cleaningAptFloor && cleaningHasElevator);
    }
    if (selectedCategory === 'translation') {
      if (!translationServiceMode && !serviceMode) return false;
      // Remote may omit precise coords on historical; baseline in_person requires coords.
      if (isBaselineFinanceEnabled() && resolvedMode === 'in_person') {
        return isValidRequestAddress(requestAddress);
      }
      if (resolvedMode === 'remote' && isBaselineFinanceEnabled()) return true;
      return isValidRequestAddress(requestAddress);
    }
    if (isBaselineFinanceEnabled() && resolvedMode === 'remote') return true;
    return isValidRequestAddress(requestAddress);
  }, [
    selectedCategory, selectedSubcategory, movePropertyType, movePickupAddress, moveDeliveryAddress,
    movePickupFloor, movePickupElevator, moveDeliveryFloor, moveDeliveryElevator,
    cleaningHouseFloors, cleaningAptFloor, cleaningHasElevator, translationServiceMode, serviceMode, requestAddress,
  ]);

  const descriptionBlocked = descriptionContainsContactInfo(postText);
  const translationLanguagesComplete =
    selectedCategory !== 'translation' || Boolean(translationFromLanguage && translationToLanguage);
  const descriptionComplete = detailsComplete && !descriptionBlocked && translationLanguagesComplete;
  const parsedBudgetMin = budgetType === 'fixed' ? parseBudgetInt(budgetMin) : null;
  const parsedBudgetMax = budgetType === 'fixed' ? parseBudgetInt(budgetMax) : null;
  const rangeBudgetIsValid =
    budgetType === 'fixed' &&
    parsedBudgetMin != null &&
    parsedBudgetMin > 0 &&
    parsedBudgetMax != null &&
    parsedBudgetMax >= parsedBudgetMin;
  const budgetStepComplete = rangeBudgetIsValid;
  const rangeBudgetIsInvalid =
    budgetType === 'fixed' &&
    parsedBudgetMin != null &&
    parsedBudgetMax != null &&
    parsedBudgetMin > parsedBudgetMax;
  const budgetLabel = buildBudgetLabelFromRange(budgetType, parsedBudgetMin, parsedBudgetMax, t);
  const budgetStorageType: 'fixed' | 'negotiable' = 'fixed';
  const marketSuggestion = useMemo(() => {
    if (!selectedCategory) return null;
    return getMarketBudgetSuggestion(selectedCategory, selectedSubcategory || null, {
      translationServiceMode: selectedCategory === 'translation' ? translationServiceMode : undefined,
    });
  }, [selectedCategory, selectedSubcategory, translationServiceMode]);

  // Auto-fill modality when pack 40 policy leaves only one option.
  useEffect(() => {
    if (!isBaselineFinanceEnabled() || !selectedCategory || !selectedSubcategory) return;
    const policy = getServiceModePolicy(selectedCategory, selectedSubcategory);
    if (policy === 'in_person_only') {
      setServiceMode('in_person');
      if (selectedCategory === 'translation') setTranslationServiceMode('in_person');
    } else if (policy === 'remote_only') {
      setServiceMode('remote');
      if (selectedCategory === 'translation') setTranslationServiceMode('online');
    }
  }, [selectedCategory, selectedSubcategory]);

  useEffect(() => {
    if (!open || draftDialog || !selectedCategory || !marketSuggestion) return;
    const key = `${selectedCategory}|${selectedSubcategory}|${translationServiceMode}`;
    if (lastBudgetSuggestionKey.current === key) return;
    lastBudgetSuggestionKey.current = key;
    setBudgetType('fixed');
    // Preserve user input when selecting another service.
    setBudgetMin((value) => value || String(marketSuggestion.min));
    setBudgetMax((value) => value || String(marketSuggestion.max));
  }, [open, draftDialog, selectedCategory, selectedSubcategory, translationServiceMode, marketSuggestion]);

  const applyFreshStart = useCallback(() => {
    const nextSub = initialCategory
      ? resolveInternalSubcategory(initialCategory, initialSubcategory)
      : '';
    setStep(initialCategory ? 'description' : 'category');
    setSelectedCategory(initialCategory);
    setSelectedSubcategory(initialSubcategory);
    setSelectedDisplayGroup(initialCategory ? getRequestCategoryGroup(initialCategory) : '');
    setOtherServiceType('');
    setPostText('');
    setBudgetType('unset');
    setBudgetMin('');
    setBudgetMax('');
    setTranslationFromLanguage('');
    setTranslationToLanguage('');
    setTranslationServiceMode('');
    setServiceMode('');
    setRequestAddress(emptyRequestAddress());
    setPriority('flexible');
    setPreferredDateIso('');
    setPreferredTimeSpecific('');
    setMovePropertyType(
      initialCategory === 'moving' && nextSub ? movingPropertyTypeFromSubKey(nextSub) : '',
    );
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
    lastBudgetSuggestionKey.current = '';
  }, [initialCategory, initialSubcategory]);

  const applyDraft = useCallback((draft: CreateRequestDraft) => {
    setStep(draft.step);
    setSelectedCategory(draft.selectedCategory);
    setSelectedSubcategory(draft.selectedSubcategory);
    setSelectedDisplayGroup(isRequestCategoryGroupId(draft.selectedDisplayGroup)
      ? draft.selectedDisplayGroup : draft.selectedCategory ? getRequestCategoryGroup(draft.selectedCategory) : '');
    setOtherServiceType(draft.otherServiceType ?? '');
    setPostText(draft.postText);
    setBudgetType(draft.budgetType);
    setBudgetMin(draft.budgetMin);
    setBudgetMax(draft.budgetMax);
    setTranslationFromLanguage(draft.translationFromLanguage);
    setTranslationToLanguage(draft.translationToLanguage);
    setTranslationServiceMode(draft.translationServiceMode);
    setServiceMode(
      draft.serviceMode === 'remote' || draft.serviceMode === 'in_person'
        ? draft.serviceMode
        : draft.translationServiceMode === 'online'
          ? 'remote'
          : draft.translationServiceMode === 'in_person'
            ? 'in_person'
            : '',
    );
    setRequestAddress(draft.requestAddress);
    setPriority(draft.priority);
    setPreferredDateIso(draft.preferredDateIso);
    setPreferredTimeSpecific(draft.preferredTimeSpecific);
    setMovePropertyType(draft.movePropertyType);
    setMovePickupAddress(draft.movePickupAddress);
    setMoveDeliveryAddress(draft.moveDeliveryAddress);
    setMovePickupFloor(draft.movePickupFloor);
    setMovePickupElevator(draft.movePickupElevator);
    setMoveDeliveryFloor(draft.moveDeliveryFloor);
    setMoveDeliveryElevator(draft.moveDeliveryElevator);
    setCleaningHouseFloors(draft.cleaningHouseFloors);
    setCleaningAptFloor(draft.cleaningAptFloor);
    setCleaningHasElevator(draft.cleaningHasElevator);
    setPublishing(false);
    lastBudgetSuggestionKey.current = draft.lastBudgetSuggestionKey;
  }, []);

  const buildDraftSnapshot = useCallback((): CreateRequestDraft => {
    return {
      version: 1,
      updatedAt: Date.now(),
      step,
      selectedCategory,
      selectedSubcategory,
      selectedDisplayGroup,
      otherServiceType,
      postText,
      budgetType,
      budgetMin,
      budgetMax,
      translationFromLanguage,
      translationToLanguage,
      translationServiceMode,
      serviceMode,
      requestAddress,
      priority,
      preferredDateIso,
      preferredTimeSpecific,
      movePropertyType,
      movePickupAddress,
      moveDeliveryAddress,
      movePickupFloor,
      movePickupElevator,
      moveDeliveryFloor,
      moveDeliveryElevator,
      cleaningHouseFloors,
      cleaningAptFloor,
      cleaningHasElevator,
      lastBudgetSuggestionKey: lastBudgetSuggestionKey.current,
    };
  }, [
    step,
    selectedCategory,
    selectedSubcategory,
    selectedDisplayGroup,
    otherServiceType,
    postText,
    budgetType,
    budgetMin,
    budgetMax,
    translationFromLanguage,
    translationToLanguage,
    translationServiceMode,
    serviceMode,
    requestAddress,
    priority,
    preferredDateIso,
    preferredTimeSpecific,
    movePropertyType,
    movePickupAddress,
    moveDeliveryAddress,
    movePickupFloor,
    movePickupElevator,
    moveDeliveryFloor,
    moveDeliveryElevator,
    cleaningHouseFloors,
    cleaningAptFloor,
    cleaningHasElevator,
  ]);

  const performClose = useCallback(() => {
    skipAutoSaveRef.current = false;
    setDraftDialog(null);
    setPublishing(false);
    onClose();
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (publishing) return;
    const draft = buildDraftSnapshot();
    if (hasMeaningfulCreateRequestDraft(draft)) {
      skipAutoSaveRef.current = true;
      setDraftDialog('close');
      return;
    }
    performClose();
  }, [publishing, buildDraftSnapshot, performClose]);

  const handleResumeContinue = useCallback(() => {
    const draft = me.id ? loadCreateRequestDraft(me.id) : null;
    if (draft) applyDraft(draft);
    setDraftDialog(null);
    skipAutoSaveRef.current = false;
  }, [me.id, applyDraft]);

  const handleResumeDiscard = useCallback(() => {
    if (me.id) clearCreateRequestDraft(me.id);
    applyFreshStart();
    setDraftDialog(null);
    skipAutoSaveRef.current = false;
  }, [me.id, applyFreshStart]);

  const handleCloseSaveDraft = useCallback(() => {
    const draft = buildDraftSnapshot();
    if (me.id && hasMeaningfulCreateRequestDraft(draft)) {
      saveCreateRequestDraft(me.id, draft);
    }
    applyFreshStart();
    performClose();
  }, [me.id, buildDraftSnapshot, applyFreshStart, performClose]);

  const handleCloseDiscard = useCallback(() => {
    if (me.id) clearCreateRequestDraft(me.id);
    applyFreshStart();
    performClose();
  }, [me.id, applyFreshStart, performClose]);

  useEffect(() => {
    if (!open) return;
    skipAutoSaveRef.current = true;
    const draft = me.id ? loadCreateRequestDraft(me.id) : null;
    if (draft && hasMeaningfulCreateRequestDraft(draft)) {
      setDraftDialog('resume');
      return;
    }
    applyFreshStart();
    skipAutoSaveRef.current = false;
  }, [open, me.id, applyFreshStart]);

  useEffect(() => {
    if (!open || !me.id || skipAutoSaveRef.current || draftDialog || publishing) return;
    const draft = buildDraftSnapshot();
    if (!hasMeaningfulCreateRequestDraft(draft)) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveCreateRequestDraft(me.id, draft);
    }, 400);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    open,
    me.id,
    draftDialog,
    publishing,
    buildDraftSnapshot,
    step,
    selectedCategory,
    selectedSubcategory,
    postText,
    budgetType,
    budgetMin,
    budgetMax,
    translationFromLanguage,
    translationToLanguage,
    translationServiceMode,
    requestAddress,
    priority,
    preferredDateIso,
    preferredTimeSpecific,
    movePropertyType,
    movePickupAddress,
    moveDeliveryAddress,
    movePickupFloor,
    movePickupElevator,
    moveDeliveryFloor,
    moveDeliveryElevator,
    cleaningHouseFloors,
    cleaningAptFloor,
    cleaningHasElevator,
  ]);

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
    if (publishing || publishInFlightRef.current) return;
    if (!isOfficialServiceSubcategory(selectedCategory, selectedSubcategory)) {
      showToast(t('request_flow.category_required'), 'error');
      setStep('category');
      return;
    }
    if (selectedCategory === 'other' && !isOtherServiceTypeValid(otherServiceType)) {
      showToast(t('request_flow.other_required'), 'error');
      setStep('subcategory');
      return;
    }
    if (!descriptionComplete) { setStep('description'); return; }
    const resolvedServiceModeEarly: ServiceMode | null =
      coerceServiceMode(serviceMode) ||
      coerceServiceMode(translationServiceMode === 'online' ? 'remote' : translationServiceMode) ||
      null;
    const baselineOn = isBaselineFinanceEnabled();
    const requiresAddress = publishRequiresMapAddress({
      category: selectedCategory,
      serviceMode: resolvedServiceModeEarly,
      baselineFinanceEnabled: baselineOn,
    });
    const needsAddress =
      selectedCategory === 'moving'
        ? !isValidRequestAddress(movePickupAddress) || !isValidRequestAddress(moveDeliveryAddress)
        : requiresAddress && !isValidRequestAddress(requestAddress);
    if (needsAddress) {
      showToast(t('create_modal.address_required'), 'error');
      return;
    }
    if (!rangeBudgetIsValid) {
      showToast(t('create_modal.budget_required'), 'error');
      return;
    }
    if (!preferredDateIso || !preferredTimeSpecific.trim()) {
      showToast(
        !preferredDateIso ? t('create_modal.confirm_date_required') : t('create_modal.confirm_time_required'),
        'error',
      );
      return;
    }
    setPublishing(true);
    publishInFlightRef.current = true;
    const yn = (v: string) => (v === 'yes' ? t('create_modal.moving_yes') : v === 'no' ? t('create_modal.moving_no') : '—');
    let extra = '';
    if (selectedCategory === 'moving') {
      const subLabel = activeCat ? t(`service_subs.${activeCat.id}.${selectedSubcategory}`) : selectedSubcategory;
      const lines = [
        t('create_modal.moving_property_type') + ': ' + subLabel,
        t('create_modal.moving_pickup_address') + ': ' + movePickupAddress.display,
        t('create_modal.moving_delivery_address') + ': ' + moveDeliveryAddress.display,
      ];
      if (needsBuildingForMoving(selectedSubcategory)) {
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
      const modeLabel =
        (serviceMode || coerceServiceMode(translationServiceMode)) === 'remote' ? 'Online' : 'Presencial';
      const lines = [
        t('create_modal.translation_from_language') + ': ' + translationFromLanguage,
        t('create_modal.translation_to_language') + ': ' + translationToLanguage,
        'Tipo de atendimento: ' + modeLabel,
      ];
      extra = '\n\n---\n' + lines.join('\n');
    }
    const fullDescription = appendOtherServiceType(postText.trim() + extra, selectedCategory, otherServiceType, t('request_flow.service_type'));
    const addr = selectedCategory === 'moving' ? movePickupAddress : requestAddress;
    const resolvedServiceMode: ServiceMode | null = resolvedServiceModeEarly;
    const locationParts = [addr.display.trim(), addr.city, addr.region].filter(Boolean);
    const locationLabel =
      resolvedServiceMode === 'remote' && baselineOn
        ? t('jobs.remote')
        : locationParts.join(', ') || t('jobs.remote');
    const coords = publishCoordinatesForMode(resolvedServiceMode, addr.latitude, addr.longitude);
    try {
      if (baselineOn) {
        if (!selectedSubcategory && !getDefaultSubcategoryForCategory(selectedCategory)) {
          showToast(t('baseline_finance.subcategory_required'), 'error');
          setPublishing(false);
          return;
        }
        if (!resolvedServiceMode) {
          showToast(t('baseline_finance.service_mode_required'), 'error');
          setPublishing(false);
          return;
        }
        if (
          publishRequiresCoordinates({
            category: selectedCategory,
            serviceMode: resolvedServiceMode,
            baselineFinanceEnabled: true,
          }) &&
          (coords.latitude == null || coords.longitude == null)
        ) {
          showToast(t('baseline_finance.service_location_required'), 'error');
          setPublishing(false);
          return;
        }
      }
      const publishSubcategory =
        selectedSubcategory || getDefaultSubcategoryForCategory(selectedCategory) || null;
      await createJob({
        clientId: me.id,
        clientName: me.name,
        clientAvatar: me.avatar,
        title: buildCanonicalJobTitle(selectedCategory, publishSubcategory),
        description: fullDescription,
        category: selectedCategory,
        subcategory: publishSubcategory,
        serviceMode: resolvedServiceMode,
        location: locationLabel,
        address: resolvedServiceMode === 'remote' ? null : addr.address || addr.display.trim() || null,
        city: resolvedServiceMode === 'remote' ? null : addr.city || null,
        region: resolvedServiceMode === 'remote' ? null : addr.region || null,
        postalCode: resolvedServiceMode === 'remote' ? null : addr.postalCode?.trim() || null,
        latitude: coords.latitude,
        longitude: coords.longitude,
        preferredDate: resolvePreferredDateIso(scheduleInput),
        preferredPeriod: null,
        preferredTimeWindow: null,
        preferredTime: preferredExactTime,
        date: buildJobDateLabel(scheduleInput),
        value: budgetLabel,
        budgetType: budgetStorageType,
        budgetAmount: parsedBudgetMin && !parsedBudgetMax ? parsedBudgetMin : parsedBudgetMax && !parsedBudgetMin ? parsedBudgetMax : null,
        budgetMin: rangeBudgetIsValid ? parsedBudgetMin : null,
        budgetMax: rangeBudgetIsValid ? parsedBudgetMax : null,
        currency: 'CAD',
        urgency: jobUrgencyFromPriority(priority),
        timezone: getBrowserTimezone(),
        createdTimezone: getBrowserTimezone(),
      });
      showToast(t('create_modal.publish_success'), 'success');
      if (me.id) clearCreateRequestDraft(me.id);
      skipAutoSaveRef.current = true;
      applyFreshStart();
      performClose();
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
      if (error instanceof InsufficientClientCreditsError) {
        showToast(t('client_credits.insufficient_to_publish'), 'error');
      } else if (error instanceof ActiveCreditObligationError || isActiveCreditObligationError(error)) {
        showToast(t('baseline_finance.active_credit_obligation_client'), 'error');
        if (UI_VISIBILITY.clientCredits) {
          navigate(ROUTES.clientCredits);
        }
      } else {
        showToast(formatBaselineFinanceError(error, t, 'create_modal.publish_error'), 'error');
      }
      setPublishing(false);
    } finally {
      publishInFlightRef.current = false;
    }
  };

  const addressStepComplete = useMemo(() => {
    const resolvedMode: ServiceMode | '' =
      serviceMode ||
      (translationServiceMode === 'online'
        ? 'remote'
        : translationServiceMode === 'in_person'
          ? 'in_person'
          : '');
    if (selectedCategory === 'moving') {
      return isValidRequestAddress(movePickupAddress) && isValidRequestAddress(moveDeliveryAddress);
    }
    if (isBaselineFinanceEnabled() && resolvedMode === 'remote') return true;
    if (selectedCategory === 'translation') {
      return Boolean(translationServiceMode || serviceMode) && (
        resolvedMode === 'remote' || isValidRequestAddress(requestAddress)
      );
    }
    return isValidRequestAddress(requestAddress);
  }, [
    selectedCategory,
    movePickupAddress,
    moveDeliveryAddress,
    translationServiceMode,
    serviceMode,
    requestAddress,
  ]);

  const categoryFieldsComplete = useMemo(() => {
    if (selectedCategory === 'moving' && needsBuildingForMoving(selectedSubcategory)) {
      return Boolean(movePickupFloor.trim() && movePickupElevator && moveDeliveryFloor.trim() && moveDeliveryElevator);
    }
    if (selectedCategory === 'cleaning' && selectedSubcategory === 'house') return Boolean(cleaningHouseFloors);
    if (selectedCategory === 'cleaning' && selectedSubcategory === 'apartment') {
      return Boolean(cleaningAptFloor && cleaningHasElevator);
    }
    return true;
  }, [
    selectedCategory,
    selectedSubcategory,
    movePickupFloor,
    movePickupElevator,
    moveDeliveryFloor,
    moveDeliveryElevator,
    cleaningHouseFloors,
    cleaningAptFloor,
    cleaningHasElevator,
  ]);

  const continueBlockedMessage = useMemo(() => {
    if (step === 'description') {
      if (descriptionBlocked) return t('create_modal.description_contact_warning');
      if (selectedCategory === 'translation' && !translationLanguagesComplete) {
        return t('create_modal.translation_languages_required');
      }
      if (
        isBaselineFinanceEnabled() &&
        !serviceMode &&
        !(selectedCategory === 'translation' && translationServiceMode)
      ) {
        return t('baseline_finance.service_mode_required');
      }
      if (!addressStepComplete) return t('create_modal.address_required_continue');
      if (!categoryFieldsComplete) return t('create_modal.category_fields_required');
      if (!budgetStepComplete) return t('create_modal.budget_required_continue');
      if (rangeBudgetIsInvalid) return t('create_modal.budget_range_invalid');
    }
    if (step === 'confirm') {
      if (!preferredDateIso) return t('create_modal.confirm_date_required');
      if (!preferredTimeSpecific.trim()) return t('create_modal.confirm_time_required');
    }
    return '';
  }, [
    step,
    descriptionBlocked,
    selectedCategory,
    translationLanguagesComplete,
    serviceMode,
    translationServiceMode,
    addressStepComplete,
    categoryFieldsComplete,
    budgetStepComplete,
    rangeBudgetIsInvalid,
    preferredDateIso,
    preferredTimeSpecific,
    t,
  ]);

  const continueDisabled =
    (step === 'description' && (!descriptionComplete || !budgetStepComplete || rangeBudgetIsInvalid)) ||
    (step === 'confirm' && !isConfirmStepComplete(preferredDateIso, preferredTimeSpecific));


  useEffect(() => {
    if (!open || draftDialog) return;
    const frame = requestAnimationFrame(() => dialogRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, step, draftDialog]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    return () => previousFocus?.focus();
  }, [open]);

  if (!open) return null;

  const stepIndex = STEPS.indexOf(step);
  const stepIcons: Record<ModalStep, React.ComponentType<{ className?: string }>> = {
    category: Icons.Grid,
    subcategory: Icons.ListChecks,
    description: Icons.Type,
    confirm: Icons.CalendarCheck,
    review: Icons.CheckCircle2,
  };

  const selectPrimaryCategory = (categoryId: string) => {
    const sub = resolveInternalSubcategory(categoryId);
    setSelectedCategory(categoryId);
    setSelectedSubcategory(sub);
    if (categoryId === 'moving') {
      setMovePropertyType(movingPropertyTypeFromSubKey(sub));
    } else {
      setMovePropertyType('');
    }
    setStep('description');
  };
  const activeCat = SERVICE_CATEGORIES.find((c) => c.id === selectedCategory);
  const displaySteps = ['category', 'subcategory', 'description', 'review'] as const;
  const displayStepIndex = step === 'confirm' ? 2 : displaySteps.indexOf(step);
  const displayStepLabels = ['category', 'service', 'details', 'review'];
  const activeGroup = selectedDisplayGroup || getRequestCategoryGroup(selectedCategory);

  const selectGroup = (group: RequestCategoryGroupId) => {
    setSelectedDisplayGroup(group);
    if (selectedCategory && getRequestCategoryGroup(selectedCategory) !== group) {
      setSelectedCategory('');
      setSelectedSubcategory('');
    }
    setStep('subcategory');
  };

  const selectService = (category: ServiceCategoryId, subcategory: string) => {
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
    if (category === 'moving') setMovePropertyType(movingPropertyTypeFromSubKey(subcategory));
    setStep('description');
  };

  const yesNo = (value: string) => value === 'yes' ? t('create_modal.moving_yes') : value === 'no' ? t('create_modal.moving_no') : '—';
  const reviewDetails: { label: string; value: string }[] = [];
  if (selectedCategory === 'moving') {
    reviewDetails.push({ label: t('create_modal.moving_delivery_address'), value: moveDeliveryAddress.display });
    if (needsBuildingForMoving(selectedSubcategory)) {
      reviewDetails.push(
        { label: t('create_modal.moving_floor_pickup'), value: movePickupFloor },
        { label: t('create_modal.moving_elevator_label'), value: yesNo(movePickupElevator) },
        { label: t('create_modal.moving_floor_delivery'), value: moveDeliveryFloor },
        { label: t('create_modal.moving_elevator_delivery'), value: yesNo(moveDeliveryElevator) },
      );
    }
  }
  if (selectedCategory === 'cleaning' && selectedSubcategory === 'house') {
    reviewDetails.push({ label: t('create_modal.cleaning_house_floors'), value: cleaningHouseFloors });
  }
  if (selectedCategory === 'cleaning' && selectedSubcategory === 'apartment') {
    reviewDetails.push(
      { label: t('create_modal.cleaning_apt_floor'), value: cleaningAptFloor },
      { label: t('create_modal.cleaning_elevator'), value: yesNo(cleaningHasElevator) },
    );
  }

  const goBack = () => {
    const idx = stepIndex;
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const goNext = () => {
    const idx = stepIndex;
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  return (
    <div
      className="motion-reduce:animate-none fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto lh-modal-overlay p-3 pt-[calc(env(safe-area-inset-top)+60px+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+4.25rem+0.75rem)] animate-in fade-in duration-200 md:pt-[calc(env(safe-area-inset-top)+72px+0.75rem)] md:pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:items-center sm:p-6"
      onClick={requestClose}
    >
      <div
        ref={dialogRef}
        inert={Boolean(draftDialog)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-request-title"
        aria-busy={publishing}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (draftDialog) return;
          if (event.key === 'Escape') { event.stopPropagation(); requestClose(); }
          if (event.key !== 'Tab') return;
          const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]') ?? [])
            .filter((element) => !element.closest('[hidden]'));
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (!first) { event.preventDefault(); return; }
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
            event.preventDefault(); last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault(); first.focus();
          }
        }}
        className="outline-none motion-reduce:animate-none motion-reduce:transition-none [&_*]:motion-reduce:animate-none [&_*]:motion-reduce:transition-none lh-modal-panel w-full max-w-[calc(100vw-1.5rem)] sm:max-w-2xl overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200 max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-60px-4.25rem-1.5rem)] md:max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-72px-1.5rem)] sm:max-h-[min(92dvh,900px)] min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center gap-2 sm:gap-3 bg-gray-50/50 shrink-0 min-w-0">
          <DesktopBackButton onClose={requestClose} className="shrink-0" />
          <h3 id="create-request-title" className="min-w-0 flex-1 text-xl font-bold text-gray-900 font-display flex items-center gap-2">
            <Icons.PlusCircle className="w-5 h-5 text-blue-600 shrink-0" />
            <span className="truncate">{t('client_dashboard.create_order_title')}</span>
          </h3>
          <button type="button" onClick={requestClose} disabled={publishing} aria-label={t('common.close')}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"><Icons.X className="h-5 w-5" /></button>
        </div>
        <div className="px-4 sm:px-6 pt-4 pb-2 shrink-0 min-w-0">
          <div className="relative grid w-full max-w-full grid-cols-4 gap-1">
            <div className="pointer-events-none absolute top-4 left-[12.5%] right-[12.5%] h-0.5 -translate-y-1/2 rounded-full bg-gray-100" />
            <div
              className="pointer-events-none absolute top-4 left-[12.5%] z-0 h-0.5 -translate-y-1/2 rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `calc(${(displayStepIndex / 3) * 75}% + 0%)` }}
            />
            {displaySteps.map((s, idx) => {
              const Icon = stepIcons[s];
              const isActive = idx <= displayStepIndex;
              return (
                <div key={s} aria-current={idx === displayStepIndex ? 'step' : undefined} className="relative z-10 flex flex-col items-center gap-1">
                  <div
                    className={
                      'flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-sm ' +
                      (isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-white border-2 border-gray-200 text-gray-400')
                    }
                  >
                    {idx < displayStepIndex ? <Icons.Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-gray-600">{t('request_flow.' + displayStepLabels[idx])}</span>
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
            <CreateRequestCategoryStep t={t} selectedGroup={selectedDisplayGroup} onSelect={selectGroup} />
          )}
          {step === 'subcategory' && (
            <CreateRequestServiceStep t={t} group={activeGroup} category={selectedCategory} subcategory={selectedSubcategory}
              otherServiceType={otherServiceType} onOtherServiceTypeChange={setOtherServiceType} onSelect={selectService} />
          )}
          {step === 'description' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <CreateRequestScheduleStep
                t={t}
                selectedCategory={selectedCategory}
                selectedSubcategory={selectedSubcategory}
                priority={priority}
                setPriority={setPriority}
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
                setTranslationServiceMode={(mode) => {
                  setTranslationServiceMode(mode);
                  if (mode === 'online') setServiceMode('remote');
                  else if (mode === 'in_person') setServiceMode('in_person');
                }}
                serviceMode={serviceMode}
                setServiceMode={setServiceMode}
                requireServiceMode={isBaselineFinanceEnabled()}
              />
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-800">{t('create_modal.budget_hint_label')}</label>
                {marketSuggestion ? (
                  <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50/90 px-3 py-2.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-800">
                      {t('create_modal.market_suggestion_title')}
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      {t('create_modal.market_suggestion_range', {
                        min: marketSuggestion.min,
                        max: marketSuggestion.max,
                      })}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setBudgetType('fixed');
                        setBudgetMin(String(marketSuggestion.min));
                        setBudgetMax(String(marketSuggestion.max));
                      }}
                      className="mt-2 text-xs font-bold text-blue-700 underline-offset-2 hover:underline"
                    >
                      {t('create_modal.market_suggestion_apply')}
                    </button>
                  </div>
                ) : null}
                <div className="w-full max-w-full overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-3 sm:p-4 focus-within:border-blue-500">
                  <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div
                      className={`flex min-h-[52px] min-w-0 flex-1 items-center rounded-xl border px-3 ${
                        budgetType === 'fixed' && budgetMin
                          ? 'border-[#1565FF] bg-blue-50/60 ring-2 ring-blue-100'
                          : budgetType === 'negotiable'
                            ? 'border-slate-200 bg-slate-100/80'
                            : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <span className="mr-2 shrink-0 text-[10px] font-bold uppercase text-slate-500">{t('create_modal.budget_min_label')}</span>
                      <span className="shrink-0 text-sm font-black text-slate-900">CAD $</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        readOnly={budgetType === 'negotiable'}
                        tabIndex={budgetType === 'negotiable' ? -1 : 0}
                        aria-label={t('create_modal.budget_min_label')}
                        value={budgetMin}
                        onFocus={() => {
                          if (budgetType === 'negotiable') return;
                          setBudgetType('fixed');
                        }}
                        onClick={() => setBudgetType('fixed')}
                        onChange={(e) => {
                          setBudgetType('fixed');
                          setBudgetMin(parseBudgetInput(e.target.value));
                        }}
                        placeholder="50"
                        className="relative z-[2] min-w-0 flex-1 touch-manipulation bg-transparent px-2 text-base font-black text-slate-950 outline-none placeholder:text-slate-400 read-only:cursor-not-allowed read-only:text-slate-400 sm:text-lg"
                      />
                    </div>
                    <span className="hidden shrink-0 text-sm font-bold text-slate-400 sm:inline">{t('create_modal.budget_range_to')}</span>
                    <div
                      className={`flex min-h-[52px] min-w-0 flex-1 items-center rounded-xl border px-3 ${
                        budgetType === 'fixed' && budgetMax
                          ? 'border-[#1565FF] bg-blue-50/60 ring-2 ring-blue-100'
                          : budgetType === 'negotiable'
                            ? 'border-slate-200 bg-slate-100/80'
                            : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <span className="mr-2 shrink-0 text-[10px] font-bold uppercase text-slate-500">{t('create_modal.budget_max_label')}</span>
                      <span className="shrink-0 text-sm font-black text-slate-900">CAD $</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        readOnly={budgetType === 'negotiable'}
                        tabIndex={budgetType === 'negotiable' ? -1 : 0}
                        aria-label={t('create_modal.budget_max_label')}
                        value={budgetMax}
                        onFocus={() => {
                          if (budgetType === 'negotiable') return;
                          setBudgetType('fixed');
                        }}
                        onClick={() => setBudgetType('fixed')}
                        onChange={(e) => {
                          setBudgetType('fixed');
                          setBudgetMax(parseBudgetInput(e.target.value));
                        }}
                        placeholder="120"
                        className="relative z-[2] min-w-0 flex-1 touch-manipulation bg-transparent px-2 text-base font-black text-slate-950 outline-none placeholder:text-slate-400 read-only:cursor-not-allowed read-only:text-slate-400 sm:text-lg"
                      />
                    </div>
                  </div>
                  {rangeBudgetIsInvalid ? (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                      {t('create_modal.budget_range_invalid')}
                    </p>
                  ) : null}
                  {!budgetStepComplete && budgetType === 'fixed' && (budgetMin || budgetMax) ? (
                    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
                      {t('create_modal.budget_required')}
                    </p>
                  ) : null}
                  {rangeBudgetIsValid ? (
                    <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-950">
                      {budgetLabel}
                    </div>
                  ) : null}
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
                      {TRANSLATION_REQUEST_LANGUAGES.map((language) => (
                        <option key={language.legacyValue} value={language.legacyValue}>
                          {getSpokenLanguageLabel(language.code, t)}
                        </option>
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
                      {TRANSLATION_REQUEST_LANGUAGES.map((language) => (
                        <option key={language.legacyValue} value={language.legacyValue}>
                          {getSpokenLanguageLabel(language.code, t)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-800">{t('create_modal.activity_description_label')}</label>
                <p className="mb-2 text-xs font-medium text-slate-500">{t('create_modal.description_optional_hint')}</p>
                <textarea
                  aria-label={t('create_modal.activity_description_label')}
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
              language={language}
              preferredDateIso={preferredDateIso}
              setPreferredDateIso={setPreferredDateIso}
              preferredTimeSpecific={preferredTimeSpecific}
              setPreferredTimeSpecific={setPreferredTimeSpecific}
            />
          )}
          {step === 'review' && (
            <CreateRequestReviewStep
              t={t}
              displayGroup={getRequestCategoryGroup(selectedCategory)}
              otherServiceType={otherServiceType}
              additionalDetails={reviewDetails}
              onEdit={(target) => setStep(target)}
              disabled={publishing}
              selectedCategory={selectedCategory}
              selectedSubcategory={selectedSubcategory}
              postText={postText}
              budgetHint={budgetLabel}
              translationFromLanguage={translationFromLanguage}
              translationToLanguage={translationToLanguage}
              translationServiceMode={translationServiceMode}
              serviceMode={serviceMode}
              requestAddress={requestAddress}
              movePickupAddress={movePickupAddress}
              moveDeliveryAddress={moveDeliveryAddress}
              movePropertyType={movePropertyType}
              priority={priority}
              preferredTimeWindow=""
              preferredTimeSpecific={preferredExactTime ?? ''}
              preferredDateIso={preferredDateIso}
            />
          )}
        </div>
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white border-t border-gray-100 flex justify-between items-center gap-2 shrink-0 min-w-0 w-full max-w-full">
          {step === 'category' ? (
            <span />
          ) : (
            <button type="button" disabled={publishing} onClick={goBack} className="px-3 sm:px-5 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">
              {t('common.back')}
            </button>
          )}
          {step === 'review' ? (
            <button
              type="button"
              disabled={publishing}
              onClick={() => void handlePublish()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3.5 px-4 sm:px-8 rounded-xl ml-auto flex items-center gap-2"
            >
              {publishing ? <Icons.Loader2 className="w-5 h-5 animate-spin" /> : <Icons.Rocket className="w-5 h-5" />}
              {publishing ? t('request_flow.publishing') : t('request_flow.publish')}
            </button>
          ) : step === 'category' || step === 'subcategory' ? (
            <span />
          ) : (
            <div className="ml-auto flex min-w-0 max-w-full flex-col items-end gap-2">
              {continueDisabled && continueBlockedMessage ? (
                <p className="max-w-full text-right text-xs font-semibold text-amber-800 sm:text-sm">
                  {continueBlockedMessage}
                </p>
              ) : null}
              <button
                type="button"
                disabled={continueDisabled}
                onClick={goNext}
                className="bg-[#1565FF] hover:bg-[#0F55D9] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 px-8 rounded-xl flex items-center gap-2"
              >
                {t('common.continue')} <Icons.ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
      {draftDialog === 'resume' ? (
        <CreateRequestResumeDraftDialog
          t={t}
          onContinue={handleResumeContinue}
          onDiscard={handleResumeDiscard}
        />
      ) : null}
      {draftDialog === 'close' ? (
        <CreateRequestSaveDraftDialog
          t={t}
          onSave={handleCloseSaveDraft}
          onDiscard={handleCloseDiscard}
        />
      ) : null}
    </div>
  );
}
