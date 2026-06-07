import { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import type { ServiceCategoryId } from '@/data/serviceCategories';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import { getCategoryLucideIcon } from '@/utils/categoryIcons';
import {
  filterValidSkillKeys,
  groupSkillKeysByServiceCategory,
  parseSkillKey,
  skillKey,
} from '@/data/helperSkillsCatalog';
import { deriveHelperCategoriesFromSkillKeys } from '@/utils/helperCategoryPreferences';
import { HELPER_CATEGORY_ACCENTS } from '@/utils/helperCategoryPreferences';
import { HelperCategoryPickerSheet } from '@/components/helper/HelperCategoryPickerSheet';

type TFn = (key: string, options?: Record<string, string | number>) => string;

type CategoryOverride = { primary: ServiceCategoryId; secondary: ServiceCategoryId[] };

type Props = {
  t: TFn;
  skillIds: string[];
  primaryCategory: ServiceCategoryId;
  secondaryCategories: ServiceCategoryId[];
  onSkillsChange: (ids: string[]) => void;
  onCategoriesChange: (primary: ServiceCategoryId, secondary: ServiceCategoryId[]) => void;
  onSaveAsync?: (ids: string[], categoryOverride?: CategoryOverride) => Promise<void>;
};

export function HelperCategoriesManager({
  t,
  skillIds,
  primaryCategory,
  secondaryCategories,
  onSkillsChange,
  onCategoriesChange,
  onSaveAsync,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<ServiceCategoryId | null>(null);
  const [menuCategory, setMenuCategory] = useState<ServiceCategoryId | null>(null);
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => groupSkillKeysByServiceCategory(skillIds), [skillIds]);
  const categoryOrder = useMemo(() => {
    const ids = [...grouped.keys()] as ServiceCategoryId[];
    const primaryFirst = [primaryCategory, ...secondaryCategories.filter((id) => id !== primaryCategory)];
    const ordered = primaryFirst.filter((id) => ids.includes(id));
    for (const id of ids) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered;
  }, [grouped, primaryCategory, secondaryCategories]);

  const existingCategoryIds = useMemo(() => new Set(grouped.keys()), [grouped]);

  const persistSkills = async (next: string[], categoryOverride?: CategoryOverride) => {
    const valid = filterValidSkillKeys(next);
    onSkillsChange(valid);
    if (onSaveAsync) {
      setSaving(true);
      try {
        await onSaveAsync(valid, categoryOverride);
      } finally {
        setSaving(false);
      }
    }
  };

  const syncCategoriesFromSkills = (keys: string[], preferredPrimary?: ServiceCategoryId) => {
    const { primary, secondary } = deriveHelperCategoriesFromSkillKeys(keys, preferredPrimary ?? primaryCategory);
    onCategoriesChange(primary, secondary);
  };

  const handleCategoryComplete = async (categoryId: ServiceCategoryId, subKeys: string[]) => {
    const withoutCategory = skillIds.filter((key) => {
      const parsed = parseSkillKey(key);
      return parsed?.primary !== categoryId;
    });
    const added = subKeys.map((sub) => skillKey(categoryId, sub));
    const next = [...withoutCategory, ...added];
    const preferredPrimary =
      grouped.size === 0 && !editCategory ? categoryId : primaryCategory;
    const { primary, secondary } = deriveHelperCategoriesFromSkillKeys(next, preferredPrimary);
    onCategoriesChange(primary, secondary);
    await persistSkills(next, { primary, secondary });
    setEditCategory(null);
  };

  const removeCategory = async (categoryId: ServiceCategoryId) => {
    const next = skillIds.filter((key) => parseSkillKey(key)?.primary !== categoryId);
    const { primary, secondary } = deriveHelperCategoriesFromSkillKeys(next);
    onCategoriesChange(primary, secondary);
    await persistSkills(next, { primary, secondary });
    setMenuCategory(null);
  };

  const setAsPrimary = (categoryId: ServiceCategoryId) => {
    const secondary = categoryOrder.filter((id) => id !== categoryId);
    onCategoriesChange(categoryId, secondary);
    setMenuCategory(null);
    void persistSkills(skillIds, { primary: categoryId, secondary });
  };

  const openAdd = () => {
    setEditCategory(null);
    setPickerOpen(true);
  };

  const openEdit = (categoryId: ServiceCategoryId) => {
    setEditCategory(categoryId);
    setMenuCategory(null);
    setPickerOpen(true);
  };

  const editInitialSubs = editCategory
    ? (grouped.get(editCategory) ?? [])
        .map((key) => parseSkillKey(key)?.sub)
        .filter((s): s is string => Boolean(s))
    : [];

  return (
    <div className="relative space-y-2">
      <div className="flex flex-wrap gap-2 pr-12">
        {categoryOrder.map((catId) => {
          const meta = SERVICE_CATEGORIES.find((c) => c.id === catId);
          if (!meta) return null;
          const Icon = getCategoryLucideIcon(meta.icon);
          const count = grouped.get(catId)?.length ?? 0;
          const isPrimary = catId === primaryCategory;
          const accent = HELPER_CATEGORY_ACCENTS[catId];
          return (
            <div key={catId} className="relative">
              <button
                type="button"
                onClick={() => setMenuCategory(menuCategory === catId ? null : catId)}
                className={clsx(
                  'inline-flex min-h-[34px] max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-xs font-black transition-colors',
                  isPrimary
                    ? `${accent.active} shadow-sm`
                    : clsx('border-slate-200 bg-white text-slate-800', accent.cardHover),
                )}
              >
                <span
                  className={clsx(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    isPrimary ? accent.icon : accent.iconInactive,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="truncate">{t(`categories.${catId}`)}</span>
                <span className="shrink-0 text-[10px] font-bold text-slate-500">• {count}</span>
                {isPrimary ? (
                  <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-800">
                    {t('helper_categories.primary_badge')}
                  </span>
                ) : null}
              </button>

              {menuCategory === catId ? (
                <div className="absolute left-0 top-full z-20 mt-1 min-w-[10.5rem] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => openEdit(catId)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-800 hover:bg-slate-50"
                  >
                    <Icons.Pencil className="h-3.5 w-3.5" />
                    {t('helper_categories.edit_subs')}
                  </button>
                  {!isPrimary ? (
                    <button
                      type="button"
                      onClick={() => setAsPrimary(catId)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-800 hover:bg-slate-50"
                    >
                      <Icons.Star className="h-3.5 w-3.5 text-amber-500" />
                      {t('helper_categories.set_primary')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void removeCategory(catId)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-rose-700 hover:bg-rose-50"
                  >
                    <Icons.Trash2 className="h-3.5 w-3.5" />
                    {t('helper_categories.remove')}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={openAdd}
        disabled={saving || existingCategoryIds.size >= SERVICE_CATEGORIES.length}
        title={t('helper_categories.add_category')}
        aria-label={t('helper_categories.add_category')}
        className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-600 text-white shadow-md transition-transform hover:bg-blue-700 active:scale-95 disabled:opacity-50"
      >
        {saving ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Plus className="h-5 w-5" />}
      </button>

      {categoryOrder.length === 0 ? (
        <p className="text-xs font-medium text-slate-500">{t('helper_categories.empty_hint')}</p>
      ) : null}

      <HelperCategoryPickerSheet
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setEditCategory(null);
        }}
        t={t}
        existingCategoryIds={existingCategoryIds}
        editCategoryId={editCategory}
        initialSubs={editInitialSubs}
        onComplete={(catId, subs) => void handleCategoryComplete(catId, subs)}
      />
    </div>
  );
}
