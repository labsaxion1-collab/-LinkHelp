import { clsx } from 'clsx';
import { MAX_JOB_INTERESTED } from '@/utils/applicationInterest';

const SEGMENT_COLORS = ['#2563EB', '#22C55E', '#FBBF24'] as const;
const EMPTY_COLOR = '#D1D5DB';

export type InterestedRingProps = {
  interestedCount: number;
  maxInterested?: number;
  size?: number;
  label?: string;
  className?: string;
  /** Hide center caption (useful for feed legend). */
  hideLabel?: boolean;
};

export function InterestedRing({
  interestedCount,
  maxInterested = MAX_JOB_INTERESTED,
  size = 110,
  label = 'interessados',
  className,
  hideLabel = false,
}: InterestedRingProps) {
  const count = Math.max(0, Math.min(maxInterested, interestedCount));
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = Math.max(8, Math.round(size * 0.088));
  const r = (size - strokeWidth) / 2 - 1.5;
  const circumference = 2 * Math.PI * r;
  const gapDeg = 5;
  const segmentDeg = 360 / maxInterested;
  const arcDeg = segmentDeg - gapDeg;
  const arcLength = (arcDeg / 360) * circumference;
  const dashGap = circumference - arcLength;
  /** Clockwise from top-right */
  const startRotation = -30;

  const numberSize = Math.round(size * 0.309);
  const labelSize = Math.round(size * 0.118);

  return (
    <div
      className={clsx(
        'relative inline-flex shrink-0 items-center justify-center transition-shadow duration-300',
        'group-hover/card:drop-shadow-[0_0_14px_rgba(37,99,235,0.22)]',
        className,
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${count} ${label}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        aria-hidden
      >
        <circle cx={cx} cy={cy} r={Math.max(0, r - strokeWidth / 2 - 0.5)} fill="#FFFFFF" />
        {Array.from({ length: maxInterested }, (_, index) => {
          const filled = index < count;
          return (
            <circle
              key={index}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={filled ? SEGMENT_COLORS[index] : EMPTY_COLOR}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${dashGap}`}
              transform={`rotate(${startRotation + index * segmentDeg} ${cx} ${cy})`}
              className="transition-[stroke] duration-300 ease-out"
            />
          );
        })}
      </svg>
      {!hideLabel ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className="tabular-nums leading-none text-[#0F172A]"
            style={{ fontSize: numberSize, fontWeight: 700 }}
          >
            {count}
          </span>
          <span
            className="mt-0.5 max-w-[88%] truncate font-medium leading-tight text-[#64748B]"
            style={{ fontSize: labelSize }}
          >
            {label}
          </span>
        </div>
      ) : null}
    </div>
  );
}
