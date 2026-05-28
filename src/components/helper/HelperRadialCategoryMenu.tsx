import { memo, useCallback, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import type { SERVICE_CATEGORIES } from '@/data/serviceCategories';

type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
import { getCategoryLucideIcon } from '@/utils/categoryIcons';
import { HELPER_CATEGORY_ACCENTS } from '@/utils/helperCategoryPreferences';

type Props = {
  open: boolean;
  onToggle: () => void;
  categories: ServiceCategory[];
  primaryCategoryId: string;
  selectedId: string;
  onSelect: (categoryId: string) => void;
  t: (key: string) => string;
};

function polarPosition(index: number, total: number, radius: number) {
  const start = -160;
  const end = -20;
  const angle = total <= 1 ? -90 : start + ((end - start) * index) / (total - 1);
  const rad = (angle * Math.PI) / 180;
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

function HelperRadialCategoryMenuInner({
  open,
  onToggle,
  categories,
  primaryCategoryId,
  selectedId,
  onSelect,
  t,
}: Props) {
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

  const ordered = [
    ...categories.filter((c) => c.id === primaryCategoryId),
    ...categories.filter((c) => c.id !== primaryCategoryId),
  ];

  return (
    <div
      ref={rootRef}
      className={clsx(
        'relative z-20 mb-2 flex min-h-[52px] items-start gap-2 transition-[min-height] duration-200',
        open && 'min-h-[11rem] pt-2',
      )}
    >
      <motion.button
        type="button"
        aria-expanded={open}
        aria-label={t('helper_dashboard.radial_filter_open')}
        onClick={onToggle}
        whileTap={{ scale: 0.94 }}
        className={clsx(
          'relative z-30 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 shadow-lg transition-colors',
          open
            ? 'border-blue-400 bg-blue-600 text-white shadow-blue-500/30'
            : 'border-blue-200 bg-white text-blue-700 shadow-slate-900/10 hover:bg-blue-50',
        )}
      >
        <Icons.Radar className="h-5 w-5" />
      </motion.button>

      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm font-black text-slate-950">{t('helper_dashboard.filter_find_title')}</p>
        <p className="truncate text-[11px] font-semibold text-slate-500">
          {selectedId
            ? t(`categories.${selectedId}`)
            : t('helper_dashboard.all_categories')}
        </p>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute left-0 top-10 z-40 h-48 w-52"
          >
            <motion.button
              type="button"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26, delay: 0.02 }}
              style={{ left: 24, top: 40 }}
              className="pointer-events-auto absolute flex h-11 min-w-[4.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white px-2 text-[10px] font-black text-slate-700 shadow-md"
              onClick={() => {
                onSelect('');
                onToggle();
              }}
            >
              {t('helper_dashboard.all_categories')}
            </motion.button>

            {ordered.map((cat, i) => {
              const pos = polarPosition(i, ordered.length, 78);
              const accent = HELPER_CATEGORY_ACCENTS[cat.id];
              const Icon = getCategoryLucideIcon(cat.icon);
              const active = selectedId === cat.id;
              return (
                <motion.button
                  key={cat.id}
                  type="button"
                  initial={{ scale: 0, opacity: 0, x: 24, y: 40 }}
                  animate={{ scale: 1, opacity: 1, x: 24 + pos.x, y: 40 + pos.y }}
                  exit={{ scale: 0, opacity: 0, x: 24, y: 40 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 24, delay: 0.04 + i * 0.03 }}
                  className={clsx(
                    'pointer-events-auto absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border text-[9px] font-black leading-none shadow-md',
                    active ? accent.active : 'border-slate-200 bg-white text-slate-700',
                  )}
                  onClick={() => {
                    onSelect(cat.id);
                    onToggle();
                  }}
                  title={t(`categories.${cat.id}`)}
                >
                  <Icon className="h-4 w-4" />
                </motion.button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export const HelperRadialCategoryMenu = memo(HelperRadialCategoryMenuInner);
