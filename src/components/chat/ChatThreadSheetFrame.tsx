import type { ReactNode } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  children: ReactNode;
  maxHeightClass?: string;
};

/** Anchor fixo abaixo da navbar — mesmo slot para detalhe do chamado e pré-contrato. */
export function ChatThreadSheetFrame({
  open,
  onClose,
  titleId,
  children,
  maxHeightClass = 'max-h-[min(calc(100dvh-env(safe-area-inset-top,0px)-5.5rem),720px)]',
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-slate-900/55 px-0 pb-4 pt-[calc(env(safe-area-inset-top,0px)+4.25rem)] backdrop-blur-sm md:pt-[calc(env(safe-area-inset-top,0px)+5.25rem)] sm:px-4"
      role="presentation"
      onClick={onClose}
    >
      <section
        className={`flex w-full ${maxHeightClass} max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </section>
    </div>
  );
}
