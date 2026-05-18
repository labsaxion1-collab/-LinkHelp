import * as Icons from 'lucide-react';
import { ChoiceChipGroup } from '@/components/client/create-request/ChoiceChipGroup';
import {
  RequestAddressInput,
  type RequestAddressValue,
} from '@/components/client/create-request/RequestAddressInput';
import type {
  PreferredDateMode,
  RequestPriority,
  TimeWindow,
} from '@/utils/requestSchedule';

export type MovePropertyType = 'house' | 'apartment' | 'office' | 'business' | '';

type Props = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  selectedCategory: string;
  selectedSubcategory: string;
  priority: RequestPriority;
  setPriority: (p: RequestPriority) => void;
  preferredDateMode: PreferredDateMode;
  setPreferredDateMode: (m: PreferredDateMode) => void;
  preferredDateIso: string;
  setPreferredDateIso: (v: string) => void;
  preferredTimeWindow: TimeWindow;
  setPreferredTimeWindow: (w: TimeWindow) => void;
  preferredTimeSpecific: string;
  setPreferredTimeSpecific: (v: string) => void;
  showSpecificTime: boolean;
  setShowSpecificTime: (v: boolean | ((prev: boolean) => boolean)) => void;
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
};

function needsBuilding(type: MovePropertyType) {
  return type === 'apartment' || type === 'office' || type === 'business';
}

export function CreateRequestScheduleStep(props: Props) {
  const {
    t,
    selectedCategory,
    selectedSubcategory,
    priority,
    setPriority,
    preferredDateMode,
    setPreferredDateMode,
    preferredDateIso,
    setPreferredDateIso,
    preferredTimeWindow,
    setPreferredTimeWindow,
    preferredTimeSpecific,
    setPreferredTimeSpecific,
    showSpecificTime,
    setShowSpecificTime,
    requestAddress,
    setRequestAddress,
    movePropertyType,
    setMovePropertyType,
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
  } = props;

  const addressFields = (label: string, value: RequestAddressValue, onChange: (v: RequestAddressValue) => void) => (
    <div>
      <p className="text-sm font-bold text-gray-800 mb-2">{label}</p>
      <RequestAddressInput
        value={value}
        onChange={onChange}
        placeholder={t('create_modal.location_placeholder')}
        currentLocationLabel={t('create_modal.current_location')}
        currentLocationShortLabel={t('create_modal.current_location_short')}
        locatingLabel={t('create_modal.locating')}
      />
    </div>
  );

  return (
    <section className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h4 className="text-2xl font-bold text-gray-900 mb-2">{t('create_modal.schedule_step_title')}</h4>
        <p className="text-gray-500 text-sm">{t('create_modal.schedule_step_desc')}</p>
      </div>

      <div>
        <p className="text-sm font-bold text-gray-800 mb-3">{t('create_modal.when')}</p>
        <div className="grid grid-cols-2 gap-2">
          {(['urgent', 'flexible'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`min-h-[64px] p-3 rounded-2xl border-2 text-left text-sm font-bold transition-all ${
                priority === p ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {p === 'urgent' ? t('urgency.urgent_asap') : t('urgency.flexible')}
            </button>
          ))}
        </div>
      </div>

      {priority === 'flexible' && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-gray-800">{t('create_modal.preferred_date')}</p>
          <div className="flex flex-wrap gap-2">
            {(['today', 'tomorrow', 'pick'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPreferredDateMode(mode)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold border-2 ${
                  preferredDateMode === mode ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                {mode === 'today'
                  ? t('create_modal.date_today')
                  : mode === 'tomorrow'
                    ? t('create_modal.date_tomorrow')
                    : t('create_modal.date_pick')}
              </button>
            ))}
          </div>
          {preferredDateMode === 'pick' && (
            <input
              type="date"
              value={preferredDateIso}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setPreferredDateIso(e.target.value)}
              className="w-full min-h-[48px] border-2 border-gray-200 rounded-xl px-4 text-base"
            />
          )}
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-bold text-gray-800">{t('create_modal.preferred_time')}</p>
        <div className="flex flex-wrap gap-2">
          {(['morning', 'afternoon', 'evening'] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => {
                setPreferredTimeWindow(w);
                setShowSpecificTime(false);
              }}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold border-2 ${
                preferredTimeWindow === w && !showSpecificTime ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              {w === 'morning'
                ? t('create_modal.time_morning')
                : w === 'afternoon'
                  ? t('create_modal.time_afternoon')
                  : t('create_modal.time_evening')}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowSpecificTime((v) => !v)}
          className="text-sm font-bold text-blue-600"
        >
          {t('create_modal.time_specific_toggle')}
        </button>
        {showSpecificTime && (
          <input
            type="time"
            value={preferredTimeSpecific}
            onChange={(e) => {
              setPreferredTimeSpecific(e.target.value);
              setPreferredTimeWindow('');
            }}
            className="w-full min-h-[48px] border-2 border-gray-200 rounded-xl px-4"
          />
        )}
      </div>

      {selectedCategory === 'moving' ? (
        <div className="space-y-4 rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-4">
          <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Icons.Truck className="w-4 h-4 text-blue-600" />
            {t('create_modal.moving_details_title')}
          </p>
          <ChoiceChipGroup
            label={t('create_modal.moving_property_type')}
            required
            value={movePropertyType}
            onChange={(v) => setMovePropertyType(v as MovePropertyType)}
            options={[
              { value: 'house', label: t('create_modal.moving_property_house') },
              { value: 'apartment', label: t('create_modal.moving_property_apartment') },
              { value: 'office', label: t('create_modal.moving_property_office') },
              { value: 'business', label: t('create_modal.moving_property_business') },
            ]}
          />
          {addressFields(t('create_modal.moving_pickup_address'), movePickupAddress, setMovePickupAddress)}
          {needsBuilding(movePropertyType) && (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                {t('create_modal.moving_floor_pickup')} *
              </label>
              <input
                value={movePickupFloor}
                onChange={(e) => setMovePickupFloor(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-3"
                placeholder={t('create_modal.moving_floor_placeholder')}
              />
              <label className="block text-xs font-bold text-gray-500 mb-1">
                {t('create_modal.moving_elevator_label')} *
              </label>
              <select
                value={movePickupElevator}
                onChange={(e) => setMovePickupElevator(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold"
              >
                <option value="">—</option>
                <option value="yes">{t('create_modal.moving_yes')}</option>
                <option value="no">{t('create_modal.moving_no')}</option>
              </select>
            </div>
          )}
          {addressFields(t('create_modal.moving_delivery_address'), moveDeliveryAddress, setMoveDeliveryAddress)}
          {needsBuilding(movePropertyType) && (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">
                {t('create_modal.moving_floor_delivery')} *
              </label>
              <input
                value={moveDeliveryFloor}
                onChange={(e) => setMoveDeliveryFloor(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-3"
                placeholder={t('create_modal.moving_floor_placeholder')}
              />
              <label className="block text-xs font-bold text-gray-500 mb-1">
                {t('create_modal.moving_elevator_delivery')} *
              </label>
              <select
                value={moveDeliveryElevator}
                onChange={(e) => setMoveDeliveryElevator(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold"
              >
                <option value="">—</option>
                <option value="yes">{t('create_modal.moving_yes')}</option>
                <option value="no">{t('create_modal.moving_no')}</option>
              </select>
            </div>
          )}
        </div>
      ) : (
        addressFields(t('create_modal.where'), requestAddress, setRequestAddress)
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
            options={[
              { value: 'ground', label: t('create_modal.cleaning_floor_ground') },
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
              { value: '5', label: '5' },
              { value: '6+', label: '6+' },
            ]}
          />
          <ChoiceChipGroup
            label={t('create_modal.cleaning_elevator')}
            required
            value={cleaningHasElevator}
            onChange={setCleaningHasElevator}
            options={[
              { value: 'yes', label: t('create_modal.moving_yes') },
              { value: 'no', label: t('create_modal.moving_no') },
            ]}
          />
        </div>
      )}
    </section>
  );
}
