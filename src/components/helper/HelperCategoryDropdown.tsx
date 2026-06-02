import { memo, useCallback, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import type { ServiceCategoryId } from '@/data/serviceCategories';

/** Curated helper opportunity filters (order + labels). */
export const HELPER_OPPORTUNITY_FILTER_IDS: ServiceCategoryId[] = [
  'cleaning',
  'assembly',
  'moving',
  'translation',
  'outdoor',
  'beauty',
];

const CATEGORY_EMOJI: Partial<Record<ServiceCategoryId, string>> = {
  cleaning: '🧹',
  assembly: '🔨',
  moving: '🚚',
  translation: '🌎',
  outdoor: '📦',
  beauty: '💅',
};

type Props = {
  open: boolean;
  onToggle: () => void;
  selectedId: string;
  onSelect: (categoryId: string) => void;
  t: (key: string) => string;
  className?: string;
};

function HelperCategoryDropdownInner({ open, onToggle, selectedId, onSelect, t, className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  const handleOutside = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!open || !rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) onToggle();
    },
    [open, onToggle],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open, handleOutside]);

  const categoryLabel = (id: ServiceCategoryId) => {
    if (id === 'outdoor') return t('helper_dashboard.filter_category_entregas');
    return t(`categories.${id}`);
  };

  return (
    <div ref={rootRef} className={clsx('relative z-30 mb-2', className)}>
      <div className="flex min-h-[52px] items-start gap-2.5">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={t('helper_dashboard.category_filter_open')}
          onClick={onToggle}
          className={clsx(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 shadow-lg transition-colors',
            open
              ? 'border-blue-400 bg-blue-600 text-white shadow-blue-500/25'
              : 'border-blue-200 bg-white text-blue-700 shadow-slate-900/8 hover:bg-blue-50',
          )}
        >
          <Icons.LayoutGrid className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 pt-1">
          <p className="text-sm font-black text-slate-950">{t('helper_dashboard.filter_find_title')}</p>
          <p className="truncate text-[11px] font-semibold text-slate-500">
            {selectedId
              ? categoryLabel(selectedId as ServiceCategoryId)
              : t('helper_dashboard.all_categories')}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="listbox"
            aria-label={t('helper_dashboard.category_filter_open')}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-[calc(100%+0.35rem)] z-50 w-full max-w-[280px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/5"
          >
            <ul className="max-h-[min(22rem,60dvh)] overflow-y-auto overscroll-contain py-1.5">
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={!selectedId}
                  onClick={() => {
                    onSelect('');
                    onToggle();
                  }}
                  className={clsx(
                    'flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold transition-colors',
                    !selectedId ? 'bg-blue-50 text-blue-900' : 'text-slate-800 hover:bg-slate-50',
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-base">
                    ✨
                  </span>
                  <span>{t('helper_dashboard.all_categories')}</span>
                  {!selectedId ? <Icons.Check className="ml-auto h-4 w-4 text-blue-600" /> : null}
                </button>
              </li>
              {HELPER_OPPORTUNITY_FILTER_IDS.map((id) => {
                const active = selectedId === id;
                const emoji = CATEGORY_EMOJI[id] ?? '•';
                return (
                  <li key={id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onSelect(id);
                        onToggle();
                      }}
                      className={clsx(
                        'flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold transition-colors',
                        active ? 'bg-blue-50 text-blue-900' : 'text-slate-800 hover:bg-slate-50',
                      )}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-lg leading-none">
                        {emoji}
                      </span>
                      <span className="min-w-0 flex-1 leading-snug">{categoryLabel(id)}</span>
                      {active ? <Icons.Check className="ml-auto h-4 w-4 shrink-0 text-blue-600" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export const HelperCategoryDropdown = memo(HelperCategoryDropdownInner);
