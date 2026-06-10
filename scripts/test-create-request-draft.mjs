import {
  createRequestDraftStorageKey,
  hasMeaningfulCreateRequestDraft,
  saveCreateRequestDraft,
  loadCreateRequestDraft,
  clearCreateRequestDraft,
} from '../src/utils/createRequestDraft.ts';

const userId = 'test-user-123';
const key = createRequestDraftStorageKey(userId);
const storage = new Map();

globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, v),
  removeItem: (k) => storage.delete(k),
};

const emptyDraft = {
  version: 1,
  updatedAt: Date.now(),
  step: 'category',
  selectedCategory: '',
  selectedSubcategory: '',
  postText: '',
  budgetType: 'unset',
  budgetMin: '',
  budgetMax: '',
  translationFromLanguage: '',
  translationToLanguage: '',
  translationServiceMode: '',
  requestAddress: { address: '', city: '', region: '', postalCode: '', latitude: null, longitude: null, display: '' },
  priority: 'flexible',
  preferredDateIso: '',
  preferredTimeSpecific: '',
  movePropertyType: '',
  movePickupAddress: { address: '', city: '', region: '', postalCode: '', latitude: null, longitude: null, display: '' },
  moveDeliveryAddress: { address: '', city: '', region: '', postalCode: '', latitude: null, longitude: null, display: '' },
  movePickupFloor: '',
  movePickupElevator: '',
  moveDeliveryFloor: '',
  moveDeliveryElevator: '',
  cleaningHouseFloors: '',
  cleaningAptFloor: '',
  cleaningHasElevator: '',
  lastBudgetSuggestionKey: '',
};

const draft = {
  ...emptyDraft,
  step: 'description',
  selectedCategory: 'translation',
  selectedSubcategory: 'government',
  postText: 'Preciso traduzir documento',
  budgetType: 'fixed',
  budgetMin: '80',
  budgetMax: '120',
  preferredDateIso: '2026-06-10',
  preferredTimeSpecific: '14:30',
};

assert(!hasMeaningfulCreateRequestDraft(emptyDraft), 'empty draft not meaningful');
assert(hasMeaningfulCreateRequestDraft(draft), 'filled draft meaningful');

saveCreateRequestDraft(userId, draft);
assert(storage.has(key), 'saved to localStorage key');

const loaded = loadCreateRequestDraft(userId);
assert(loaded?.selectedCategory === 'translation', 'restored category');
assert(loaded?.step === 'description', 'restored step');
assert(loaded?.budgetMin === '80', 'restored budget');

clearCreateRequestDraft(userId);
assert(!storage.has(key), 'cleared after publish');

console.log('PASS create request draft storage');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}
