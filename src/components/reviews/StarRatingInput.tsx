import { Star } from 'lucide-react';
import { clsx } from 'clsx';

type Props = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md';
  align?: 'start' | 'center' | 'end';
};

const iconSizeClass: Record<NonNullable<Props['size']>, string> = {
  xs: 'h-5 w-5',
  sm: 'h-6 w-6',
  md: 'h-9 w-9',
};

const alignClass: Record<NonNullable<Props['align']>, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
};

export function StarRatingInput({
  value,
  onChange,
  disabled = false,
  size = 'md',
  align = 'center',
}: Props) {
  const iconClass = iconSizeClass[size];
  const gapClass = size === 'xs' ? 'gap-0' : size === 'sm' ? 'gap-1' : 'gap-1.5';
  const groupTightClass = size === 'xs' ? '-space-x-1' : '';
  const padClass = size === 'xs' ? 'p-0.5' : 'p-1';

  return (
    <div
      className={clsx('flex shrink-0 items-center', gapClass, groupTightClass, alignClass[align])}
      role="radiogroup"
      aria-label="Rating"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            className={clsx(
              'rounded-md transition-transform active:scale-95 disabled:opacity-50',
              padClass,
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
