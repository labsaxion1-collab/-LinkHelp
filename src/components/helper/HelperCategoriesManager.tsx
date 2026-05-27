import { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';
import type { ServiceCategoryId } from '@/data/serviceCategories';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import { getCategoryLucideIcon } from '@/utils/categoryIcons';
import {
  groupSkillKeysByServiceCategory,
  parseSkillKey,
  skillKey,
} from '@/data/helperSkillsCatalog';
import { HELPER_CATEGORY_ACCENTS } from '@/utils/helperCategoryPreferences';
import { HelperCategoryPickerSheet } from '@/components/helper/HelperCategoryPickerSheet';

type TFn = (key: string, options?: Record<string, string | number>) => string;

type Props = {
  t: TFn;
  skillIds: string[];
  primaryCategory: ServiceCategoryId;
  secondaryCategories: ServiceCategoryId[];
  onSkillsChange: (ids: string[]) => void;
  onCategoriesChange: (primary: ServiceCategoryId, secondary: ServiceCategoryId[]) => void;
  onSaveAsync?: (ids: string[]) => Promise<void>;
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
    const ids = [...grouped.keys()];
    const primaryFirst = [primaryCategory, ...secondaryCategories.filter((id) => id !== primaryCategory)];
    const ordered = primaryFirst.filter((id) => ids.includes(id));
    for (const id of ids) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered;
  }, [grouped, primaryCategory, secondaryCategories]);

  const existingCategoryIds = useMemo(() => new Set(grouped.keys()), [grouped]);

  const persistSkills = async (next: string[]) => {
    onSkillsChange(next);
    if (onSaveAsync) {
      setSaving(true);
      try {
        await onSaveAsync(next);
      } finally {
        setSaving(false);
      }
    }
  };

  const syncCategoriesFromSkills = (keys: string[]) => {
    const cats = [...groupSkillKeysByServiceCategory(keys).keys()] as ServiceCategoryId[];
    if (cats.length === 0) return;
    let primary = primaryCategory;
    if (!cats.includes(primary)) primary = cats[0];
    const secondary = cats.filter((id) => id !== primary);
    onCategoriesChange(primary, secondary);
  };

  const handleCategoryComplete = async (categoryId: ServiceCategoryId, subKeys: string[]) => {
    const withoutCategory = skillIds.filter((key) => {
      const parsed = parseSkillKey(key);
      return parsed?.primary !== categoryId;
    });
    const added = subKeys.map((sub) => skillKey(categoryId, sub));
    const next = [...withoutCategory, ...added];
    const cats = [...groupSkillKeysByServiceCategory(next).keys()] as ServiceCategoryId[];
    if (cats.length === 1) {
      onCategoriesChange(categoryId, []);
    } else if (!cats.includes(primaryCategory)) {
      onCategoriesChange(categoryId, cats.filter((id) => id !== categoryId));
    } else {
      syncCategoriesFromSkills(next);
    }
    await persistSkills(next);
    setEditCategory(null);
  };

  const removeCategory = async (categoryId: ServiceCategoryId) => {
    const next = skillIds.filter((key) => parseSkillKey(key)?.primary !== categoryId);
    await persistSkills(next);
    const cats = [...groupSkillKeysByServiceCategory(next).keys()] as ServiceCategoryId[];
    if (cats.length === 0) {
      onCategoriesChange('cleaning', []);
    } else if (primaryCategory === categoryId) {
      onCategoriesChange(cats[0], cats.slice(1));
    } else {
      onCategoriesChange(primaryCategory, secondaryCategories.filter((id) => id !== categoryId));
    }
    setMenuCategory(null);
  };

  const setAsPrimary = (categoryId: ServiceCategoryId) => {
    const secondary = [...secondaryCategories, primaryCategory].filter(
      (id) => id !== categoryId && id !== primaryCategory,
    );
    const uniqueSecondary = [...new Set(secondary.filter((id) => grouped.has(id)))];
    onCategoriesChange(categoryId, uniqueSecondary);
    setMenuCategory(null);
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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
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
                  'inline-flex min-h-[36px] max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-left text-xs font-black transition-colors',
                  isPrimary
                    ? `${accent.active} shadow-sm`
                    : 'border-slate-200 bg-white text-slate-800 hover:border-blue-200',
                )}
              >
                <span
                  className={clsx(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    isPrimary ? accent.icon : 'bg-slate-100 text-slate-500',
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
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 text-sm font-black text-blue-800 transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
      >
        {saving ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Plus className="h-4 w-4" />}
        {t('helper_categories.add_category')}
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
