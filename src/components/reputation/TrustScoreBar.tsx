import { clsx } from 'clsx';
import { getRatingBarColor } from '@/utils/reputationRatingBar';

type Props = {
  score: number;
  className?: string;
  heightClass?: string;
};

export function TrustScoreBar({ score, className, heightClass = 'h-1' }: Props) {
  const value = Math.min(100, Math.max(0, score));
  const color = getRatingBarColor(value / 20);

  return (
    <div
      className={clsx('w-full overflow-hidden rounded-full bg-slate-200/90', heightClass, className)}
      role="presentation"
      aria-hidden
    >
      <div
        className="h-full rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
}
