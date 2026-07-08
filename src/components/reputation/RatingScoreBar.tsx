import { clsx } from 'clsx';
import { getRatingBarColor, ratingBarFillPercent } from '@/utils/reputationRatingBar';

type Props = {
  score: number;
  className?: string;
  heightClass?: string;
};

export function RatingScoreBar({ score, className, heightClass = 'h-1.5' }: Props) {
  const fill = ratingBarFillPercent(score);
  const color = getRatingBarColor(score);

  return (
    <div
      className={clsx('w-full overflow-hidden rounded-full bg-slate-200/90', heightClass, className)}
      role="presentation"
      aria-hidden
    >
      <div
        className="h-full rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${fill}%`, backgroundColor: color }}
      />
    </div>
  );
}
