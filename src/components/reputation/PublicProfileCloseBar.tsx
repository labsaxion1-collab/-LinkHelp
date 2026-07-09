import { X } from 'lucide-react';
import { clsx } from 'clsx';

type Props = {
  onClose: () => void;
  closeLabel: string;
  className?: string;
};

export function PublicProfileCloseBar({ onClose, closeLabel, className }: Props) {
  return (
    <div
      className={clsx(
        'sticky top-0 z-20 -mx-1 mb-2 flex shrink-0 items-center justify-end border-b border-slate-100/90 bg-white/95 py-1.5 backdrop-blur-sm',
        className,
      )}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
