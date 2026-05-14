import React, { useCallback, useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

type Props = {
  title: string;
  /** Optional count badge next to title */
  badge?: string;
  /** localStorage key fragment — persisted open/closed between visits */
  storageKey: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function HelperSidebarDisclosure({ title, badge, storageKey, defaultOpen = false, children, className }: Props) {
  const fullKey = `linkhelp_sidebar_acc_${storageKey}`;
  const panelId = useId();
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const v = localStorage.getItem(fullKey);
      if (v === '1') setOpen(true);
      else if (v === '0') setOpen(false);
    } catch {
      /* ignore */
    }
  }, [fullKey]);

  const persist = useCallback(
    (next: boolean) => {
      setOpen(next);
      try {
        localStorage.setItem(fullKey, next ? '1' : '0');
      } catch {
        /* ignore */
      }
    },
    [fullKey],
  );

  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-200/90 bg-white/90 shadow-sm ring-1 ring-slate-100/60 overflow-hidden',
        className,
      )}
    >
      <button
        type="button"
        id={`${panelId}-btn`}
        aria-expanded={open}
        aria-controls={`${panelId}-panel`}
        onClick={() => persist(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50/80 transition-colors duration-200"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-600 truncate">{title}</span>
          {badge ? (
            <span className="shrink-0 text-[10px] font-bold tabular-nums text-sky-700 bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded-md">
              {badge}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={clsx('w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ease-out', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      <div
        id={`${panelId}-panel`}
        role="region"
        aria-labelledby={`${panelId}-btn`}
        className={clsx(
          'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-slate-100/90 bg-slate-50/30 px-3 py-3 animate-in fade-in duration-150">{children}</div>
        </div>
      </div>
    </div>
  );
}
