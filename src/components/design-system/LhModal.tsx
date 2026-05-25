import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { premium } from './premiumClasses';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'full';
  className?: string;
};

const sizes = {
  md: 'max-w-2xl',
  lg: 'max-w-5xl',
  full: 'max-w-[min(100%,64rem)]',
};

export function LhModal({ open, onClose, title, children, footer, size = 'md', className }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    bodyRef.current?.scrollTo(0, 0);
  }, [open, title]);

  if (!open) return null;

  return (
    <div className={premium.modalOverlay} onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(premium.modalPanel, sizes[size], className)}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <header className={premium.modalHeader}>
            <div className="min-w-0 flex-1 text-lg font-black text-white">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-[#F2F4F7]/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
        ) : null}
        <div ref={bodyRef} className={premium.modalBody}>
          {children}
        </div>
        {footer ? <footer className={premium.modalFooter}>{footer}</footer> : null}
      </div>
    </div>
  );
}
