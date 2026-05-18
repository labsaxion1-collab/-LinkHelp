import * as Icons from 'lucide-react';
import type { RequestAddressValue } from '@/components/client/create-request/RequestAddressInput';
import type { MovePropertyType } from '@/components/client/create-request/CreateRequestScheduleStep';
import type { PreferredDateMode, RequestPriority, TimeWindow } from '@/utils/requestSchedule';

type Props = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  selectedCategory: string;
  selectedSubcategory: string;
  postText: string;
  budgetHint: string;
  translationFromLanguage: string;
  translationToLanguage: string;
  requestAddress: RequestAddressValue;
  movePickupAddress: RequestAddressValue;
  moveDeliveryAddress: RequestAddressValue;
  movePropertyType: MovePropertyType;
  priority: RequestPriority;
  preferredTimeWindow: TimeWindow;
  preferredTimeSpecific: string;
  preferredDateMode: PreferredDateMode;
  preferredDateIso: string;
};

export function CreateRequestReviewStep({
  t,
  selectedCategory,
  selectedSubcategory,
  postText,
  budgetHint,
  translationFromLanguage,
  translationToLanguage,
  requestAddress,
  movePickupAddress,
  moveDeliveryAddress,
  movePropertyType,
  priority,
  preferredTimeWindow,
  preferredTimeSpecific,
  preferredDateMode,
  preferredDateIso,
}: Props) {
  const urgencyLabel =
    priority === 'emergency'
      ? t('urgency.emergency')
      : priority === 'urgent'
        ? t('urgency.urgent_asap')
        : priority === 'today'
          ? t('urgency.today_tomorrow')
          : t('urgency.flexible');

  const timeLabel = preferredTimeSpecific.trim()
    ? preferredTimeSpecific
    : preferredTimeWindow === 'morning'
      ? t('create_modal.time_morning')
      : preferredTimeWindow === 'afternoon'
        ? t('create_modal.time_afternoon')
        : preferredTimeWindow === 'evening'
          ? t('create_modal.time_evening')
          : '—';

  const dateLabel =
    priority === 'emergency'
      ? t('create_modal.date_today')
      : preferredDateMode === 'today'
        ? t('create_modal.date_today')
        : preferredDateMode === 'tomorrow'
          ? t('create_modal.date_tomorrow')
          : preferredDateIso || '—';

  const locationDisplay =
    selectedCategory === 'moving' ? movePickupAddress.display : requestAddress.display;

  return (
    <section>
      <h4 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Icons.CheckCircle2 className="w-7 h-7 text-green-500" />
        {t('create_modal.review')}
      </h4>
      <dl className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-5 text-sm">
        <div>
          <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.service_category')}</dt>
          <dd className="font-bold text-gray-900">
            {t(`categories.${selectedCategory}`)} → {t(`service_subs.${selectedCategory}.${selectedSubcategory}`)}
          </dd>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.preferred_date')}</dt>
            <dd className="font-bold">{dateLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.preferred_time')}</dt>
            <dd className="font-bold">{timeLabel}</dd>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.urgency')}</dt>
            <dd className="font-bold flex items-center gap-1">
              <Icons.Clock className="w-4 h-4" /> {urgencyLabel}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.location')}</dt>
            <dd className="font-bold flex items-center gap-1">
              <Icons.MapPin className="w-4 h-4" /> {locationDisplay}
            </dd>
          </div>
        </div>
        {selectedCategory === 'moving' ? (
          <div>
            <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.moving_delivery_address')}</dt>
            <dd className="font-bold">{moveDeliveryAddress.display}</dd>
          </div>
        ) : null}
        {selectedCategory === 'moving' && movePropertyType ? (
          <div>
            <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.moving_property_type')}</dt>
            <dd className="font-bold">{t(`create_modal.moving_property_${movePropertyType}`)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.budget_hint_label')}</dt>
          <dd className="font-bold text-gray-900">{budgetHint.trim() || t('jobs.value_negotiable')}</dd>
        </div>
        {selectedCategory === 'translation' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.translation_from_language')}</dt>
              <dd className="font-bold text-gray-900">{translationFromLanguage || '---'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.translation_to_language')}</dt>
              <dd className="font-bold text-gray-900">{translationToLanguage || '---'}</dd>
            </div>
          </div>
        ) : null}
        <div>
          <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.description')}</dt>
          <dd className="text-gray-800 whitespace-pre-wrap font-medium">{postText}</dd>
        </div>
      </dl>
    </section>
  );
}
