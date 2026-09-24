import { Check, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { REQUEST_CATEGORY_GROUPS, getRequestGroupCategories, type RequestCategoryGroupId } from '@/data/requestCategoryGroups';
import type { ServiceCategoryId } from '@/data/serviceCategories';
import { getCategoryLucideIcon } from '@/utils/categoryIcons';
import { getCategoryAccent } from '@/utils/categoryFeedTheme';
import { isOtherServiceTypeValid } from '@/utils/requestOtherService';

type Translate = (key: string) => string;
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transition-none';

export function CreateRequestCategoryStep({ t, selectedGroup, onSelect }: {
  t: Translate;
  selectedGroup: RequestCategoryGroupId | '';
  onSelect: (group: RequestCategoryGroupId) => void;
}) {
  return <section aria-labelledby="request-category-heading">
    <h4 id="request-category-heading" className="text-2xl font-bold text-gray-900 mb-5">{t('request_flow.category_title')}</h4>
    <div className="grid grid-cols-2 gap-3">
      {REQUEST_CATEGORY_GROUPS.map((group) => {
        const Icon = getCategoryLucideIcon(group.icon);
        const accent = getCategoryAccent(group.categories[0]);
        const selected = selectedGroup === group.id;
        return <button key={group.id} type="button" aria-pressed={selected} onClick={() => onSelect(group.id)}
          className={clsx('relative min-h-[104px] rounded-2xl border-2 p-3 sm:p-4 flex flex-col items-center justify-center gap-2 text-center transition-colors active:bg-blue-100', focus,
            group.id === 'other' && 'col-span-2 min-h-[56px] flex-row',
            selected ? 'border-blue-600 bg-blue-50' : ['bg-white', accent.cardBorder, accent.cardHover])}>
          <span className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent.icon)}><Icon className="h-5 w-5" aria-hidden="true" /></span>
          <span className="text-sm font-bold text-gray-900">{t(`request_groups.${group.id}`)}</span>
          {selected && <Check className="absolute right-2 top-2 h-4 w-4 text-blue-600" aria-hidden="true" />}
        </button>;
      })}
    </div>
  </section>;
}

export function CreateRequestServiceStep({ t, group, category, subcategory, otherServiceType, onOtherServiceTypeChange, onSelect }: {
  t: Translate;
  group: RequestCategoryGroupId;
  category: string;
  subcategory: string;
  otherServiceType: string;
  onOtherServiceTypeChange: (value: string) => void;
  onSelect: (category: ServiceCategoryId, subcategory: string) => void;
}) {
  return <section aria-labelledby="request-service-heading" className="space-y-4">
    <div><h4 id="request-service-heading" className="text-2xl font-bold text-gray-900">{t('request_flow.service_title')}</h4>
      <p className="mt-2 text-sm text-gray-600">{t(`request_groups.${group}`)}</p></div>
    {group === 'other' ? <div className="space-y-3">
      <label htmlFor="request-other-service" className="block font-bold text-gray-900">{t('request_flow.other_label')}</label>
      <input id="request-other-service" value={otherServiceType} maxLength={80} autoComplete="off"
        onChange={(event) => onOtherServiceTypeChange(event.target.value)} aria-describedby="request-other-hint"
        className={`min-h-[48px] w-full rounded-xl border-2 border-gray-200 px-4 py-3 ${focus}`} />
      <p id="request-other-hint" className="text-sm text-gray-600">{t('request_flow.other_hint')}</p>
      <button type="button" disabled={!isOtherServiceTypeValid(otherServiceType)} onClick={() => onSelect('other', 'other')}
        className={`min-h-[48px] rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:bg-gray-200 disabled:text-gray-500 ${focus}`}>{t('common.continue')}</button>
    </div> : getRequestGroupCategories(group).map((cat) => <div key={cat.id} className="space-y-2">
      <h5 className="text-sm font-bold text-gray-600">{t(`categories.${cat.id}`)}</h5>
      {cat.subKeys.map((subKey) => {
        const selected = category === cat.id && subcategory === subKey;
        return <button key={subKey} type="button" aria-pressed={selected} onClick={() => onSelect(cat.id, subKey)}
          className={clsx('min-h-[52px] w-full flex items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition-colors active:bg-blue-100', focus,
            selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300')}>
          <span className="min-w-0 font-bold text-gray-900">{t(`service_subs.${cat.id}.${subKey}`)}</span>
          {selected ? <Check className="h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" /> : <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />}
        </button>;
      })}
    </div>)}
  </section>;
}
