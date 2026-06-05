import type { RequestAddressValue } from '@/components/client/create-request/RequestAddressInput';
import type { MovePropertyType } from '@/components/client/create-request/CreateRequestScheduleStep';
import type { BudgetMode } from '@/utils/formatJobBudget';
import type { RequestPriority } from '@/utils/requestSchedule';

export type CreateRequestDraftStep = 'category' | 'subcategory' | 'description' | 'confirm' | 'review';

export type CreateRequestDraft = {
  version: 1;
  updatedAt: number;
  step: CreateRequestDraftStep;
  selectedCategory: string;
  selectedSubcategory: string;
  postText: string;
  budgetType: BudgetMode;
  budgetMin: string;
  budgetMax: string;
  translationFromLanguage: string;
  translationToLanguage: string;
  translationServiceMode: 'online' | 'in_person' | '';
  requestAddress: RequestAddressValue;
  priority: RequestPriority;
  preferredDateIso: string;
  preferredTimeSpecific: string;
  movePropertyType: MovePropertyType;
  movePickupAddress: RequestAddressValue;
  moveDeliveryAddress: RequestAddressValue;
  movePickupFloor: string;
  movePickupElevator: string;
  moveDeliveryFloor: string;
  moveDeliveryElevator: string;
  cleaningHouseFloors: string;
  cleaningAptFloor: string;
  cleaningHasElevator: string;
  lastBudgetSuggestionKey: string;
};

const DRAFT_VERSION = 1 as const;

export function createRequestDraftStorageKey(userId: string): string {
  return `linkhelp_create_request_draft:${userId}`;
}

function isDraftStep(value: unknown): value is CreateRequestDraftStep {
  return (
    value === 'category' ||
    value === 'subcategory' ||
    value === 'description' ||
    value === 'confirm' ||
    value === 'review'
  );
}

function normalizeAddress(raw: unknown): RequestAddressValue {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    address: typeof o.address === 'string' ? o.address : '',
    city: typeof o.city === 'string' ? o.city : '',
    region: typeof o.region === 'string' ? o.region : '',
    postalCode: typeof o.postalCode === 'string' ? o.postalCode : '',
    latitude: typeof o.latitude === 'number' ? o.latitude : null,
    longitude: typeof o.longitude === 'number' ? o.longitude : null,
    display: typeof o.display === 'string' ? o.display : '',
  };
}

function parseDraft(raw: string): CreateRequestDraft | null {
  try {
    const data = JSON.parse(raw) as Partial<CreateRequestDraft>;
    if (data.version !== DRAFT_VERSION || !isDraftStep(data.step)) return null;
    return {
      version: DRAFT_VERSION,
      updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
      step: data.step,
      selectedCategory: typeof data.selectedCategory === 'string' ? data.selectedCategory : '',
      selectedSubcategory: typeof data.selectedSubcategory === 'string' ? data.selectedSubcategory : '',
      postText: typeof data.postText === 'string' ? data.postText : '',
      budgetType:
        data.budgetType === 'fixed' || data.budgetType === 'negotiable' || data.budgetType === 'unset'
          ? data.budgetType
          : 'unset',
      budgetMin: typeof data.budgetMin === 'string' ? data.budgetMin : '',
      budgetMax: typeof data.budgetMax === 'string' ? data.budgetMax : '',
      translationFromLanguage: typeof data.translationFromLanguage === 'string' ? data.translationFromLanguage : '',
      translationToLanguage: typeof data.translationToLanguage === 'string' ? data.translationToLanguage : '',
      translationServiceMode:
        data.translationServiceMode === 'online' || data.translationServiceMode === 'in_person'
          ? data.translationServiceMode
          : '',
      requestAddress: normalizeAddress(data.requestAddress),
      priority:
        data.priority === 'emergency' ||
        data.priority === 'urgent' ||
        data.priority === 'today' ||
        data.priority === 'flexible'
          ? data.priority
          : 'flexible',
      preferredDateIso: typeof data.preferredDateIso === 'string' ? data.preferredDateIso : '',
      preferredTimeSpecific: typeof data.preferredTimeSpecific === 'string' ? data.preferredTimeSpecific : '',
      movePropertyType:
        data.movePropertyType === 'house' ||
        data.movePropertyType === 'apartment' ||
        data.movePropertyType === 'office' ||
        data.movePropertyType === 'business'
          ? data.movePropertyType
          : '',
      movePickupAddress: normalizeAddress(data.movePickupAddress),
      moveDeliveryAddress: normalizeAddress(data.moveDeliveryAddress),
      movePickupFloor: typeof data.movePickupFloor === 'string' ? data.movePickupFloor : '',
      movePickupElevator:
        data.movePickupElevator === 'yes' || data.movePickupElevator === 'no' ? data.movePickupElevator : '',
      moveDeliveryFloor: typeof data.moveDeliveryFloor === 'string' ? data.moveDeliveryFloor : '',
      moveDeliveryElevator:
        data.moveDeliveryElevator === 'yes' || data.moveDeliveryElevator === 'no' ? data.moveDeliveryElevator : '',
      cleaningHouseFloors: typeof data.cleaningHouseFloors === 'string' ? data.cleaningHouseFloors : '',
      cleaningAptFloor: typeof data.cleaningAptFloor === 'string' ? data.cleaningAptFloor : '',
      cleaningHasElevator:
        data.cleaningHasElevator === 'yes' || data.cleaningHasElevator === 'no' ? data.cleaningHasElevator : '',
      lastBudgetSuggestionKey:
        typeof data.lastBudgetSuggestionKey === 'string' ? data.lastBudgetSuggestionKey : '',
    };
  } catch {
    return null;
  }
}

export function loadCreateRequestDraft(userId: string): CreateRequestDraft | null {
  if (!userId || typeof window === 'undefined') return null;
  const raw = localStorage.getItem(createRequestDraftStorageKey(userId));
  if (!raw) return null;
  return parseDraft(raw);
}

export function saveCreateRequestDraft(userId: string, draft: CreateRequestDraft): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      createRequestDraftStorageKey(userId),
      JSON.stringify({ ...draft, version: DRAFT_VERSION, updatedAt: Date.now() }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearCreateRequestDraft(userId: string): void {
  if (!userId || typeof window === 'undefined') return;
  localStorage.removeItem(createRequestDraftStorageKey(userId));
}

export function hasMeaningfulCreateRequestDraft(draft: CreateRequestDraft): boolean {
  return Boolean(
    draft.selectedCategory ||
      draft.selectedSubcategory ||
      draft.postText.trim() ||
      draft.budgetMin ||
      draft.budgetMax ||
      draft.requestAddress.display.trim() ||
      draft.movePickupAddress.display.trim() ||
      draft.moveDeliveryAddress.display.trim() ||
      draft.translationFromLanguage ||
      draft.translationToLanguage ||
      draft.translationServiceMode ||
      draft.preferredDateIso ||
      draft.preferredTimeSpecific ||
      draft.step !== 'category',
  );
}
