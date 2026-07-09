import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { lockBodyScroll, PUBLIC_PROFILE_SCROLL_ATTR } from '@/utils/lockBodyScroll';

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Mobile: sheet anchored to bottom of the safe slot. Desktop: vertically centered. */
  mobileAlign?: 'bottom' | 'start';
  panelClassName?: string;
};

/** Attribute for the internal scroll container — use on the single overflow-y-auto child. */
export { PUBLIC_PROFILE_SCROLL_ATTR };

/** Fixed overlay slot below app navbar — public profile / dossier modals. */
export function PublicProfileSheetFrame({
  open,
  onClose,
  children,
  mobileAlign = 'start',
  panelClassName,
}: Props) {
  useEffect(() => {
    if (!open) return;
    return lockBodyScroll();
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={clsx(
        'fixed inset-x-0 z-[45] flex min-h-0 overflow-hidden overscroll-none px-2 sm:px-0',
        'top-[calc(env(safe-area-inset-top,0px)+60px)]',
        'bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)]',
        'bg-slate-900/55 backdrop-blur-sm',
        mobileAlign === 'bottom' ? 'items-stretch justify-center' : 'items-start justify-center',
        'md:items-center md:justify-center md:px-4',
        'md:top-[calc(env(safe-area-inset-top,0px)+72px)]',
        'md:bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)]',
      )}
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        className={clsx(
          'flex min-h-0 w-full min-w-0 flex-col overflow-hidden',
          mobileAlign === 'bottom' ? 'h-full max-h-full' : 'max-h-full',
          'md:max-h-[min(calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-72px-2rem),90vh)]',
          'md:max-w-lg',
          panelClassName,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </section>
    </div>,
    document.body,
  );
}
