import * as Icons from 'lucide-react';
import { ChoiceChipGroup } from '@/components/client/create-request/ChoiceChipGroup';
import {
  RequestAddressInput,
  type RequestAddressValue,
} from '@/components/client/create-request/RequestAddressInput';
import type { RequestPriority } from '@/utils/requestSchedule';
import { movingNeedsBuildingDetails } from '@/data/movingRequestConfig';
import { allowedServiceModes, getServiceModePolicy } from '@/config/serviceModePolicy';
import type { ServiceMode } from '@/config/baselineFinance';

export type MovePropertyType = 'house' | 'apartment' | 'office' | 'business' | '';

const FLOOR_OPTIONS = [
  { value: 'ground', labelKey: 'create_modal.cleaning_floor_ground' },
  { value: '1', labelKey: '1' },
  { value: '2', labelKey: '2' },
  { value: '3', labelKey: '3' },
  { value: '4', labelKey: '4' },
  { value: '5', labelKey: '5' },
  { value: '6+', labelKey: '6+' },
] as const;

type Props = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  selectedCategory: string;
  selectedSubcategory: string;
  priority: RequestPriority;
  setPriority: (p: RequestPriority) => void;
  requestAddress: RequestAddressValue;
  setRequestAddress: (v: RequestAddressValue) => void;
  movePropertyType: MovePropertyType;
  setMovePropertyType: (t: MovePropertyType) => void;
  movePickupAddress: RequestAddressValue;
  setMovePickupAddress: (v: RequestAddressValue) => void;
  moveDeliveryAddress: RequestAddressValue;
  setMoveDeliveryAddress: (v: RequestAddressValue) => void;
  movePickupFloor: string;
  setMovePickupFloor: (v: string) => void;
  movePickupElevator: string;
  setMovePickupElevator: (v: string) => void;
  moveDeliveryFloor: string;
  setMoveDeliveryFloor: (v: string) => void;
  moveDeliveryElevator: string;
  setMoveDeliveryElevator: (v: string) => void;
  cleaningHouseFloors: string;
  setCleaningHouseFloors: (v: string) => void;
  cleaningAptFloor: string;
  setCleaningAptFloor: (v: string) => void;
  cleaningHasElevator: string;
  setCleaningHasElevator: (v: string) => void;
  translationServiceMode: 'online' | 'in_person' | '';
  setTranslationServiceMode: (v: 'online' | 'in_person' | '') => void;
  serviceMode?: ServiceMode | '';
  setServiceMode?: (v: ServiceMode | '') => void;
  requireServiceMode?: boolean;
};

export function CreateRequestScheduleStep(props: Props) {
  const {
    t,
    selectedCategory,
    selectedSubcategory,
    requestAddress,
    setRequestAddress,
    movePickupAddress,
    setMovePickupAddress,
    moveDeliveryAddress,
    setMoveDeliveryAddress,
    movePickupFloor,
    setMovePickupFloor,
    movePickupElevator,
    setMovePickupElevator,
    moveDeliveryFloor,
    setMoveDeliveryFloor,
    moveDeliveryElevator,
    setMoveDeliveryElevator,
    cleaningHouseFloors,
    setCleaningHouseFloors,
    cleaningAptFloor,
    setCleaningAptFloor,
    cleaningHasElevator,
    setCleaningHasElevator,
    translationServiceMode,
    setTranslationServiceMode,
    serviceMode = '',
    setServiceMode,
    requireServiceMode = false,
  } = props;

  const floorOptions = FLOOR_OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.labelKey.startsWith('create_modal.') ? t(opt.labelKey) : opt.labelKey,
  }));

  const yesNoOptions = [
    { value: 'yes', label: t('create_modal.moving_yes') },
    { value: 'no', label: t('create_modal.moving_no') },
  ];

  const addressFields = (label: string, value: RequestAddressValue, onChange: (v: RequestAddressValue) => void) => (
    <div>
      <p className="text-sm font-bold text-gray-800 mb-2">{label}</p>
      <RequestAddressInput
        value={value}
        onChange={onChange}
        placeholder={t('create_modal.location_placeholder')}
        currentLocationLabel={t('create_modal.use_current_location')}
        currentLocationShortLabel={t('create_modal.current_location_short')}
        otherAddressLabel={t('create_modal.other_address')}
        mapsUnavailableLabel={t('create_modal.maps_unavailable')}
        coordsRequiredLabel={t('create_modal.coords_required')}
        manualStreetLabel={t('create_modal.manual_street')}
        manualNumberLabel={t('create_modal.manual_number')}
        manualComplementLabel={t('create_modal.manual_complement')}
        manualCityLabel={t('create_modal.manual_city')}
        manualRegionLabel={t('create_modal.manual_region')}
        manualPostalLabel={t('create_modal.manual_postal')}
        locatingLabel={t('create_modal.locating')}
      />
    </div>
  );

  const needsBuildingAccess = selectedCategory === 'moving' && movingNeedsBuildingDetails(selectedSubcategory);
  const policy = getServiceModePolicy(selectedCategory, selectedSubcategory);
  const resolvedMode: ServiceMode | '' =
    serviceMode ||
    (translationServiceMode === 'online'
      ? 'remote'
      : translationServiceMode === 'in_person'
        ? 'in_person'
        : '');
  /** Show modality for all policies when baseline finance is on (locked for single-option). */
  const showBaselineModeSection = requireServiceMode && selectedCategory !== 'translation';
  const modeLocked = policy === 'in_person_only' || policy === 'remote_only';
  const selectableModes = allowedServiceModes(selectedCategory, selectedSubcategory);
  const showAddress =
    selectedCategory === 'moving' ||
    resolvedMode !== 'remote' ||
    !requireServiceMode ||
    (selectedCategory === 'translation' && resolvedMode !== 'remote');

  const pickMode = (mode: ServiceMode) => {
    if (modeLocked && !selectableModes.includes(mode)) return;
    setServiceMode?.(mode);
    if (selectedCategory === 'translation') {
      setTranslationServiceMode(mode === 'remote' ? 'online' : 'in_person');
    }
  };

  const modeButtonClass = (selected: boolean, locked: boolean) =>
    `min-h-[48px] rounded-xl border-2 px-3 text-sm font-black transition-colors ${
      selected
        ? 'border-blue-600 bg-blue-50 text-blue-900'
        : 'border-gray-200 bg-white text-gray-700'
    } ${locked ? 'cursor-not-allowed opacity-95' : ''}`;

  return (
    <section className="space-y-5 animate-in fade-in duration-300">
      <div>
        <h4 className="text-2xl font-bold text-gray-900 mb-2">{t('create_modal.describe_simple')}</h4>
        <p className="text-gray-500 text-sm">{t('create_modal.describe_desc_short')}</p>
      </div>

      {selectedCategory === 'moving' ? (
        <div className="space-y-4 rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-4">
          <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Icons.Truck className="w-4 h-4 text-blue-600" />
            {t('create_modal.moving_details_title')}
          </p>
          {addressFields(t('create_modal.moving_pickup_address'), movePickupAddress, setMovePickupAddress)}
          {needsBuildingAccess && (
            <div className="space-y-3">
              <ChoiceChipGroup
                label={t('create_modal.moving_floor_pickup')}
                required
                value={movePickupFloor}
                onChange={setMovePickupFloor}
                options={floorOptions}
              />
              <ChoiceChipGroup
                label={t('create_modal.moving_elevator_label')}
                required
                value={movePickupElevator}
                onChange={setMovePickupElevator}
                options={yesNoOptions}
              />
            </div>
          )}
          {addressFields(t('create_modal.moving_delivery_address'), moveDeliveryAddress, setMoveDeliveryAddress)}
          {needsBuildingAccess && (
            <div className="space-y-3">
              <ChoiceChipGroup
                label={t('create_modal.moving_floor_delivery')}
                required
                value={moveDeliveryFloor}
                onChange={setMoveDeliveryFloor}
                options={floorOptions}
              />
              <ChoiceChipGroup
                label={t('create_modal.moving_elevator_delivery')}
                required
                value={moveDeliveryElevator}
                onChange={setMoveDeliveryElevator}
                options={yesNoOptions}
              />
            </div>
          )}
        </div>
      ) : selectedCategory === 'translation' ? (
        <div className="space-y-3 rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-4">
          <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Icons.Languages className="w-4 h-4 text-blue-600" />
            {t('create_modal.service_mode_title')}
          </p>
          <div
            className={`grid gap-2 ${
              (requireServiceMode ? selectableModes.length : 2) > 1 ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {(requireServiceMode ? selectableModes : (['remote', 'in_person'] as ServiceMode[])).map((mode) => {
              const legacy = mode === 'remote' ? 'online' : 'in_person';
              const selected =
                translationServiceMode === legacy || serviceMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={requireServiceMode && modeLocked}
                  onClick={() => {
                    if (requireServiceMode && modeLocked) return;
                    setTranslationServiceMode(legacy);
                    setServiceMode?.(mode);
                  }}
                  aria-pressed={selected}
                  className={modeButtonClass(selected, Boolean(requireServiceMode && modeLocked))}
                >
                  {mode === 'remote'
                    ? t('create_modal.service_mode_remote')
                    : t('create_modal.service_mode_in_person')}
                </button>
              );
            })}
          </div>
          {showAddress && (translationServiceMode || serviceMode)
            ? addressFields(t('create_modal.where'), requestAddress, setRequestAddress)
            : null}
        </div>
      ) : (
        <div className="space-y-3">
          {showBaselineModeSection ? (
            <div className="space-y-3 rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Icons.Laptop className="w-4 h-4 text-blue-600" />
                {t('create_modal.service_mode_title')}
              </p>
              <div className={`grid gap-2 ${selectableModes.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {selectableModes.map((mode) => {
                  const selected = serviceMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={modeLocked}
                      onClick={() => pickMode(mode)}
                      aria-pressed={selected}
                      className={modeButtonClass(selected, modeLocked)}
                    >
                      {mode === 'remote'
                        ? t('create_modal.service_mode_remote')
                        : t('create_modal.service_mode_in_person')}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {showAddress ? addressFields(t('create_modal.where'), requestAddress, setRequestAddress) : null}
        </div>
      )}

      {selectedCategory === 'cleaning' && selectedSubcategory === 'house' && (
        <ChoiceChipGroup
          label={t('create_modal.cleaning_house_floors')}
          required
          value={cleaningHouseFloors}
          onChange={setCleaningHouseFloors}
          options={[
            { value: '1', label: '1' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
            { value: '4+', label: '4+' },
          ]}
        />
      )}

      {selectedCategory === 'cleaning' && selectedSubcategory === 'apartment' && (
        <div>
          <ChoiceChipGroup
            label={t('create_modal.cleaning_apt_floor')}
            required
            value={cleaningAptFloor}
            onChange={setCleaningAptFloor}
            options={floorOptions}
          />
          <ChoiceChipGroup
            label={t('create_modal.cleaning_elevator')}
            required
            value={cleaningHasElevator}
            onChange={setCleaningHasElevator}
            options={yesNoOptions}
          />
        </div>
      )}
    </section>
  );
}
