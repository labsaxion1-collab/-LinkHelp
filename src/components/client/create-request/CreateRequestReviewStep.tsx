import * as Icons from 'lucide-react';
import type { RequestAddressValue } from '@/components/client/create-request/RequestAddressInput';
import type { MovePropertyType } from '@/components/client/create-request/CreateRequestScheduleStep';
import type { RequestPriority, TimeWindow } from '@/utils/requestSchedule';
import { formatPreferredDateTimeLabel } from '@/utils/requestSchedule';
import { formatTranslationRequestLanguage } from '@/data/spokenLanguages';

type Props = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  displayGroup?: string;
  otherServiceType?: string;
  additionalDetails?: { label: string; value: string }[];
  onEdit?: (step: 'category' | 'description' | 'confirm') => void;
  disabled?: boolean;
  selectedCategory: string;
  selectedSubcategory: string;
  postText: string;
  budgetHint: string;
  translationFromLanguage: string;
  translationToLanguage: string;
  translationServiceMode?: 'online' | 'in_person' | '';
  serviceMode?: 'remote' | 'in_person' | '';
  requestAddress: RequestAddressValue;
  movePickupAddress: RequestAddressValue;
  moveDeliveryAddress: RequestAddressValue;
  movePropertyType: MovePropertyType;
  priority: RequestPriority;
  preferredTimeWindow: TimeWindow;
  preferredTimeSpecific: string;
  preferredDateIso: string;
};

export function CreateRequestReviewStep({
  t,
  displayGroup,
  otherServiceType,
  additionalDetails = [],
  onEdit,
  disabled = false,
  selectedCategory,
  selectedSubcategory,
  postText,
  budgetHint,
  translationFromLanguage,
  translationToLanguage,
  translationServiceMode = '',
  serviceMode = '',
  requestAddress,
  movePickupAddress,
  preferredDateIso,
  preferredTimeSpecific,
  preferredTimeWindow,
}: Props) {
  const scheduleLabel = formatPreferredDateTimeLabel(
    { preferredDateIso, preferredTimeSpecific, preferredTimeWindow },
    t,
  );
  const locationDisplay =
    selectedCategory === 'moving' ? movePickupAddress.display : requestAddress.display || t('jobs.remote');
  const resolvedMode =
    serviceMode === 'remote' || serviceMode === 'in_person'
      ? serviceMode
      : translationServiceMode === 'online'
        ? 'remote'
        : translationServiceMode === 'in_person'
          ? 'in_person'
          : '';
  const modalityLabel =
    resolvedMode === 'remote'
      ? t('create_modal.service_mode_remote')
      : resolvedMode === 'in_person'
        ? t('create_modal.service_mode_in_person')
        : '';

  return (
    <section>
      <h4 className="text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2">
        <Icons.CheckCircle2 className="w-7 h-7 text-green-500" />
        {t('request_flow.review_title')}
      </h4>
      {onEdit && <div className="mb-4 flex flex-wrap gap-2">
        {(['category', 'details', 'schedule'] as const).map((section) => <button key={section} type="button" disabled={disabled}
          onClick={() => onEdit(section === 'category' ? 'category' : section === 'schedule' ? 'confirm' : 'description')}
          className="min-h-[44px] rounded-xl border border-blue-200 px-3 py-2 text-sm font-bold text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50">
          {t('request_flow.edit_' + section)}
        </button>)}
      </div>}
      <dl className="bg-gray-50 rounded-3xl p-5 sm:p-6 border border-gray-100 space-y-4 text-sm">
        <div>
          <dt className="text-xs font-bold text-gray-500 uppercase mb-1">{t('create_modal.service_category')}</dt>
          {displayGroup && <dd className="mb-1 font-bold text-blue-700">{t('request_groups.' + displayGroup)}</dd>}
          <dd className="font-bold text-gray-900">
            {t(`categories.${selectedCategory}`)} - {t(`service_subs.${selectedCategory}.${selectedSubcategory}`)}
          </dd>
        </div>

        {selectedCategory === 'other' && otherServiceType && <div>
          <dt className="text-xs font-bold text-gray-500 uppercase mb-1">{t('request_flow.service_type')}</dt>
          <dd className="font-bold text-gray-900 break-words">{otherServiceType}</dd>
        </div>}
        <div>
          <dt className="text-xs font-bold text-gray-500 uppercase mb-1">{t('create_modal.description')}</dt>
          <dd className="text-gray-800 whitespace-pre-wrap font-medium">{postText}</dd>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-bold text-gray-500 uppercase mb-1">{t('create_modal.service_mode_title')}</dt>
            <dd className="font-bold text-gray-900">{modalityLabel || '—'}</dd>
          </div>
          {resolvedMode === 'remote' ? null : (
            <div>
              <dt className="text-xs font-bold text-gray-500 uppercase mb-1">{t('create_modal.location')}</dt>
              <dd className="font-bold flex items-center gap-1">
                <Icons.MapPin className="w-4 h-4" /> {locationDisplay}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-bold text-gray-500 uppercase mb-1">{t('create_modal.preferred_date')}</dt>
            <dd className="font-bold">{scheduleLabel}</dd>
          </div>
        </div>

        <div>
          <dt className="text-xs font-bold text-gray-500 uppercase mb-1">{t('create_modal.budget_hint_label')}</dt>
          <dd className="font-bold text-gray-900">{budgetHint.trim() || t('jobs.value_negotiable')}</dd>
        </div>

        <div>
          <dt className="text-xs font-bold text-gray-500 uppercase mb-1">{t('client_credits.publish_cost_label')}</dt>
          <dd className="font-bold text-gray-900">{t('client_credits.publish_cost_value')}</dd>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/90 p-4 text-xs leading-relaxed text-amber-950">
          <p className="mb-2 font-bold">{t('create_modal.publish_finance_notice_title')}</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>{t('create_modal.publish_finance_notice_publish_1lc')}</li>
            <li>{t('create_modal.publish_finance_notice_cancel_7lc')}</li>
            <li>{t('create_modal.publish_finance_notice_debt_blocks')}</li>
            <li>{t('create_modal.publish_finance_notice_expires_7d')}</li>
          </ul>
        </div>

        {additionalDetails.map(({ label, value }) => <div key={label}>
          <dt className="text-xs font-bold text-gray-500 uppercase mb-1">{label}</dt>
          <dd className="font-bold text-gray-900 break-words">{value || '—'}</dd>
        </div>)}
        {selectedCategory === 'translation' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-bold text-gray-500 uppercase mb-1">{t('create_modal.translation_from_language')}</dt>
              <dd className="font-bold text-gray-900">{translationFromLanguage ? formatTranslationRequestLanguage(translationFromLanguage, t) : '---'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-gray-500 uppercase mb-1">{t('create_modal.translation_to_language')}</dt>
              <dd className="font-bold text-gray-900">{translationToLanguage ? formatTranslationRequestLanguage(translationToLanguage, t) : '---'}</dd>
            </div>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
