import * as Icons from 'lucide-react';
import type { RequestAddressValue } from '@/components/client/create-request/RequestAddressInput';
import type { MovePropertyType } from '@/components/client/create-request/CreateRequestScheduleStep';
import type { RequestPriority, TimeWindow } from '@/utils/requestSchedule';
import { formatPreferredDateTimeLabel } from '@/utils/requestSchedule';
import { formatTranslationRequestLanguage } from '@/data/spokenLanguages';

type Props = {
  t: (key: string, vars?: Record<string, string | number>) => string;
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
        {t('create_modal.review')}
      </h4>
      <dl className="bg-gray-50 rounded-3xl p-5 sm:p-6 border border-gray-100 space-y-4 text-sm">
        <div>
          <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.service_category')}</dt>
          <dd className="font-bold text-gray-900">
            {t(`categories.${selectedCategory}`)} - {t(`service_subs.${selectedCategory}.${selectedSubcategory}`)}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.description')}</dt>
          <dd className="text-gray-800 whitespace-pre-wrap font-medium">{postText}</dd>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.service_mode_title')}</dt>
            <dd className="font-bold text-gray-900">{modalityLabel || '—'}</dd>
          </div>
          {resolvedMode === 'remote' ? null : (
            <div>
              <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.location')}</dt>
              <dd className="font-bold flex items-center gap-1">
                <Icons.MapPin className="w-4 h-4" /> {locationDisplay}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.preferred_date')}</dt>
            <dd className="font-bold">{scheduleLabel}</dd>
          </div>
        </div>

        <div>
          <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.budget_hint_label')}</dt>
          <dd className="font-bold text-gray-900">{budgetHint.trim() || t('jobs.value_negotiable')}</dd>
        </div>

        <div>
          <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('client_credits.publish_cost_label')}</dt>
          <dd className="font-bold text-gray-900">{t('client_credits.publish_cost_value')}</dd>
        </div>

        {selectedCategory === 'translation' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.translation_from_language')}</dt>
              <dd className="font-bold text-gray-900">{translationFromLanguage ? formatTranslationRequestLanguage(translationFromLanguage, t) : '---'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-gray-400 uppercase mb-1">{t('create_modal.translation_to_language')}</dt>
              <dd className="font-bold text-gray-900">{translationToLanguage ? formatTranslationRequestLanguage(translationToLanguage, t) : '---'}</dd>
            </div>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
