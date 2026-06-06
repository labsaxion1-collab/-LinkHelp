import { clsx } from 'clsx';
import { MAX_JOB_INTERESTED } from '@/utils/applicationInterest';

const EMPTY_COLOR = '#D1D5DB';

/** Filled segment colors — bottom blue, left green, top-right yellow */
const FILLED_COLORS = ['#2563EB', '#22C55E', '#FBBF24'] as const;

const GAP_DEG = 10;
const SLOT_DEG = 360 / MAX_JOB_INTERESTED;
const ARC_DEG = SLOT_DEG - GAP_DEG;
/** Rotates gaps to bottom (6h), ~10h and ~2h — matches reference */
const ROTATION_OFFSET = 60;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcStrokePath(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number): string {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, startDeg + sweepDeg);
  const largeArc = sweepDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export type InterestedRingProps = {
  interestedCount: number;
  maxInterested?: number;
  size?: number;
  label?: string;
  className?: string;
  hideLabel?: boolean;
};

export function InterestedRing({
  interestedCount,
  maxInterested = MAX_JOB_INTERESTED,
  size = 84,
  label = 'interessados',
  className,
  hideLabel = false,
}: InterestedRingProps) {
  const count = Math.max(0, Math.min(maxInterested, interestedCount));
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = size * 0.145;
  const radius = (size - strokeWidth) / 2;
  const numberSize = Math.round(size * 0.36);
  const labelSize = Math.max(9, Math.round(size * 0.118));

  return (
    <div
      className={clsx('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${count} ${label}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {Array.from({ length: maxInterested }, (_, index) => {
          const filled = index < count;
          const startDeg = index * SLOT_DEG + GAP_DEG / 2 + ROTATION_OFFSET;
          return (
            <path
              key={index}
              d={arcStrokePath(cx, cy, radius, startDeg, ARC_DEG)}
              fill="none"
              stroke={filled ? FILLED_COLORS[index % FILLED_COLORS.length] : EMPTY_COLOR}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
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
            className="mt-0.5 max-w-[88%] font-normal leading-tight text-[#64748B]"
            style={{ fontSize: labelSize }}
          >
            {label}
          </span>
        </div>
      ) : null}
    </div>
  );
}
