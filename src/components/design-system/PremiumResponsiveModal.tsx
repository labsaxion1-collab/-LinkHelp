import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Accent for primary confirm button: default blue, cancel uses amber */
  variant?: 'default' | 'danger';
};

export function PremiumResponsiveModal({
  open,
  onClose,
  title,
  children,
  footer,
  variant = 'default',
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/55 backdrop-blur-sm md:items-center md:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          'relative w-full max-w-[480px] bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.18)]',
          'rounded-t-[1.75rem] md:rounded-[1.75rem]',
          'max-h-[min(92dvh,640px)] flex flex-col',
          'pb-[max(env(safe-area-inset-bottom),0.75rem)] md:pb-0',
          'animate-in slide-in-from-bottom-6 fade-in duration-300 md:zoom-in-95',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 md:hidden">
          <span className="h-1 w-10 rounded-full bg-slate-200" aria-hidden />
        </div>

        <header className="flex items-start gap-3 border-b border-slate-100 px-5 pb-4 pt-2 md:pt-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black leading-snug text-slate-950">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <footer
            className={clsx(
              'border-t border-slate-100 px-5 py-4',
              variant === 'danger' ? '' : '',
            )}
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
