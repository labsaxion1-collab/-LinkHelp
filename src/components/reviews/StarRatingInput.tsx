import { Star } from 'lucide-react';
import { clsx } from 'clsx';

type Props = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
};

export function StarRatingInput({ value, onChange, disabled = false, size = 'md' }: Props) {
  const iconClass = size === 'sm' ? 'h-6 w-6' : 'h-9 w-9';

  return (
    <div className="flex items-center justify-center gap-1.5" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            className={clsx(
              'rounded-lg p-1 transition-transform active:scale-95 disabled:opacity-50',
              active ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300',
            )}
            aria-label={`${star}`}
            aria-pressed={active}
          >
            <Star className={clsx(iconClass, active && 'fill-amber-400')} strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}

export function StarRatingDisplay({ rating, className = '' }: { rating: number; className?: string }) {
  if (!rating || rating <= 0) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 text-amber-600 ${className}`}>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="text-[11px] font-bold tabular-nums">{rating.toFixed(1)}</span>
    </span>
  );
}
