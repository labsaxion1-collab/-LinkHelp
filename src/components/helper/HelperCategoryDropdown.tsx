import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { SERVICE_CATEGORIES, type ServiceCategoryId } from '@/data/serviceCategories';

type Props = {
  open: boolean;
  onToggle: () => void;
  selectedIds: string[];
  onToggleCategory: (categoryId: string) => void;
  onClear: () => void;
  t: (key: string) => string;
  className?: string;
  buttonLabel?: string;
  inline?: boolean;
};

function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = Icons[icon as keyof typeof Icons] as React.ComponentType<{ className?: string; strokeWidth?: number }> | undefined;
  const Component = Icon ?? Icons.CircleHelp;
  return <Component className={className} strokeWidth={2.2} />;
}

function HelperCategoryDropdownInner({
  open,
  onToggle,
  selectedIds,
  onToggleCategory,
  onClear,
  t,
  className,
  buttonLabel,
  inline = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

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

  useEffect(() => {
    if ((!open && !inline) || !scrollRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, inline]);

  const categoryLabel = (id: ServiceCategoryId) => {
    if (id === 'outdoor') return t('helper_dashboard.filter_category_entregas');
    return t(`categories.${id}`);
  };

  if (inline) {
    return (
      <section className={clsx('relative z-20 w-full', className)} aria-label={t('helper_dashboard.category_filter_open')}>
        <div
          ref={scrollRef}
          className="overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="grid w-max auto-cols-[8.6rem] grid-flow-col grid-rows-2 gap-2 px-[calc(50%_-_4.3rem)]">
            {SERVICE_CATEGORIES.map((category) => {
              const id = category.id as ServiceCategoryId;
              const active = selectedSet.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleCategory(id)}
                  className={clsx(
                    'flex min-h-[4.9rem] flex-col items-center justify-center gap-1.5 rounded-[1.15rem] border px-2 text-center text-[11px] font-black transition-all active:scale-[0.98]',
                    active
                      ? 'border-blue-400 bg-blue-600 text-white shadow-[0_10px_22px_rgba(37,99,255,0.24)]'
                      : 'border-white bg-white/88 text-slate-800 shadow-[0_12px_28px_rgba(15,23,42,0.055)] hover:border-blue-200 hover:bg-blue-50',
                  )}
                >
                  <span
                    className={clsx(
                      'flex h-8 w-8 items-center justify-center rounded-full',
                      active ? 'bg-white/18 text-white' : 'bg-[#EEF4FF] text-blue-600',
                    )}
                  >
                    <CategoryIcon icon={category.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="line-clamp-2 leading-tight">{categoryLabel(id)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div
      ref={rootRef}
      className={clsx(
        'relative z-30 mx-auto mb-2 w-full max-w-[28rem] transition-[margin] duration-200',
        open && 'mb-[min(11rem,30vh)]',
        className,
      )}
    >
      <div className="flex min-h-[52px] items-center justify-center">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={t('helper_dashboard.category_filter_open')}
          onClick={onToggle}
          className={clsx(
            'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border-2 px-5 text-sm font-black shadow-lg transition-colors',
            open
              ? 'border-blue-400 bg-blue-600 text-white shadow-blue-500/25'
              : 'border-blue-200 bg-white text-blue-700 shadow-slate-900/8 hover:bg-blue-50',
          )}
        >
          <Icons.LayoutGrid className="h-5 w-5" />
          <span>{buttonLabel ?? t('helper_dashboard.filter_find_title')}</span>
          {selectedIds.length > 0 ? (
            <span
              className={clsx(
                'flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-black',
                open ? 'bg-white text-blue-700' : 'bg-blue-600 text-white',
              )}
            >
              {selectedIds.length}
            </span>
          ) : null}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label={t('helper_dashboard.category_filter_open')}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 top-[calc(100%+0.65rem)] z-50 w-[min(92vw,28rem)] -translate-x-1/2 overflow-hidden rounded-[1.45rem] border border-slate-200/90 bg-white p-3 shadow-[0_18px_54px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/5"
          >
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                {selectedIds.length ? `${selectedIds.length} filtros ativos` : t('helper_dashboard.all_categories')}
              </span>
              {selectedIds.length ? (
                <button
                  type="button"
                  onClick={onClear}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-600 transition-colors hover:bg-slate-200"
                >
                  Limpar
                </button>
              ) : null}
            </div>

            <div
              ref={scrollRef}
              className="overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="grid w-max auto-cols-[8.6rem] grid-flow-col grid-rows-2 gap-2 px-[calc(50%_-_4.3rem)]">
                {SERVICE_CATEGORIES.map((category) => {
                  const id = category.id as ServiceCategoryId;
                  const active = selectedSet.has(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onToggleCategory(id)}
                      className={clsx(
                        'flex min-h-[4.9rem] flex-col items-center justify-center gap-1.5 rounded-[1.15rem] border px-2 text-center text-[11px] font-black transition-all active:scale-[0.98]',
                        active
                          ? 'border-blue-400 bg-blue-600 text-white shadow-[0_10px_22px_rgba(37,99,255,0.24)]'
                          : 'border-slate-200 bg-slate-50/80 text-slate-800 hover:border-blue-200 hover:bg-blue-50',
                      )}
                    >
                      <span
                        className={clsx(
                          'flex h-8 w-8 items-center justify-center rounded-full',
                          active ? 'bg-white/18 text-white' : 'bg-white text-blue-600',
                        )}
                      >
                        <CategoryIcon icon={category.icon} className="h-[18px] w-[18px]" />
                      </span>
                      <span className="line-clamp-2 leading-tight">{categoryLabel(id)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export const HelperCategoryDropdown = memo(HelperCategoryDropdownInner);
