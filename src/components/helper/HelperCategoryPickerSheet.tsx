import { useEffect, useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { SERVICE_CATEGORIES, type ServiceCategoryId } from '@/data/serviceCategories';
import { getCategoryLucideIcon } from '@/utils/categoryIcons';
import { getServiceCategorySubs, parseSkillKey, skillKey } from '@/data/helperSkillsCatalog';
import { HELPER_CATEGORY_ACCENTS } from '@/utils/helperCategoryPreferences';

type TFn = (key: string, options?: Record<string, string | number>) => string;

type Props = {
  open: boolean;
  onClose: () => void;
  t: TFn;
  existingCategoryIds: Set<string>;
  editCategoryId?: ServiceCategoryId | null;
  initialSubs?: string[];
  onComplete: (categoryId: ServiceCategoryId, subKeys: string[]) => void;
};

export function HelperCategoryPickerSheet({
  open,
  onClose,
  t,
  existingCategoryIds,
  editCategoryId = null,
  initialSubs = [],
  onComplete,
}: Props) {
  const [step, setStep] = useState<'primary' | 'subs'>('primary');
  const [activeCategory, setActiveCategory] = useState<ServiceCategoryId | null>(editCategoryId);
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(() => new Set(initialSubs));
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editCategoryId) {
      setStep('subs');
      setActiveCategory(editCategoryId);
      setSelectedSubs(new Set(initialSubs));
    } else {
      setStep('primary');
      setActiveCategory(null);
      setSelectedSubs(new Set());
    }
    setQ('');
  }, [open, editCategoryId, initialSubs]);

  const needle = q.trim().toLowerCase();
  const availableCategories = useMemo(
    () =>
      SERVICE_CATEGORIES.filter((cat) => editCategoryId === cat.id || !existingCategoryIds.has(cat.id)),
    [existingCategoryIds, editCategoryId],
  );

  const filteredCategories = useMemo(() => {
    if (!needle) return availableCategories;
    return availableCategories.filter((cat) => {
      const label = t(`categories.${cat.id}`).toLowerCase();
      return cat.id.includes(needle) || label.includes(needle);
    });
  }, [availableCategories, needle, t]);

  const subs = activeCategory ? getServiceCategorySubs(activeCategory) : [];
  const filteredSubs = useMemo(() => {
    if (!needle || step !== 'subs') return subs;
    return subs.filter((sub) => {
      const label = t(`service_subs.${activeCategory}.${sub}`).toLowerCase();
      return sub.includes(needle) || label.includes(needle);
    });
  }, [subs, needle, step, activeCategory, t]);

  const toggleSub = (sub: string) => {
    setSelectedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(sub)) next.delete(sub);
      else next.add(sub);
      return next;
    });
  };

  const finishSubs = () => {
    if (!activeCategory || selectedSubs.size === 0) return;
    onComplete(activeCategory, [...selectedSubs]);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="relative z-10 flex max-h-[min(88dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-200" />
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-slate-950">
              {step === 'primary' ? t('helper_categories.picker_title') : t(`categories.${activeCategory}`)}
            </h3>
            <p className="text-xs font-medium text-slate-500">
              {step === 'primary' ? t('helper_categories.picker_sub') : t('helper_categories.picker_subs_hint')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-600"
            aria-label={t('common.close')}
          >
            <Icons.X className="h-5 w-5" />
          </button>
        </header>

        <div className="border-b border-slate-100 px-4 py-2">
          <div className="relative">
            <Icons.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('helper_categories.search')}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {step === 'primary' ? (
            <ul className="space-y-1.5">
              {filteredCategories.map((cat) => {
                const Icon = getCategoryLucideIcon(cat.icon);
                const accent = HELPER_CATEGORY_ACCENTS[cat.id];
                return (
                  <li key={cat.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategory(cat.id);
                        setSelectedSubs(new Set());
                        setStep('subs');
                        setQ('');
                      }}
                      className="flex w-full min-h-[52px] items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/60"
                    >
                      <span
                        className={clsx(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white',
                          accent.icon,
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="flex-1 text-sm font-black text-slate-900">{t(`categories.${cat.id}`)}</span>
                      <Icons.ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <>
              {!editCategoryId ? (
                <button
                  type="button"
                  onClick={() => {
                    setStep('primary');
                    setActiveCategory(null);
                    setQ('');
                  }}
                  className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700"
                >
                  <Icons.ChevronLeft className="h-4 w-4" />
                  {t('helper_categories.back_categories')}
                </button>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {filteredSubs.map((sub) => {
                  const on = selectedSubs.has(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => toggleSub(sub)}
                      className={clsx(
                        'min-h-[40px] rounded-xl border px-3 text-xs font-bold transition-all active:scale-[0.97]',
                        on
                          ? 'border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-500/20'
                          : 'border-slate-200 bg-white text-slate-700',
                      )}
                    >
                      {on ? <Icons.Check className="mr-1 inline h-3.5 w-3.5" /> : null}
                      {t(`service_subs.${activeCategory}.${sub}`)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {step === 'subs' ? (
          <footer className="shrink-0 border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              disabled={selectedSubs.size === 0}
              onClick={finishSubs}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white disabled:opacity-40"
            >
              {t('helper_categories.save_category', { count: selectedSubs.size })}
            </button>
          </footer>
        ) : null}
      </motion.div>
    </div>
  );
}
