import { clsx } from 'clsx';
import { MAX_JOB_INTERESTED } from '@/utils/applicationInterest';

const TRACK_COLOR = '#E8ECF4';

/** Segment fills: slot 0 = blue, slot 1 = emerald, slot 2 = amber */
const SEGMENT_COLORS = ['#3B82F6', '#10B981', '#F59E0B'] as const;
/** Glow shadows when that slot is filled */
const SEGMENT_GLOW = [
  'drop-shadow(0 0 5px rgba(59,130,246,0.55))',
  'drop-shadow(0 0 5px rgba(16,185,129,0.55))',
  'drop-shadow(0 0 5px rgba(245,158,11,0.55))',
] as const;

const GAP_DEG = 22;
const SLOT_DEG = 360 / MAX_JOB_INTERESTED;
const ARC_DEG = SLOT_DEG - GAP_DEG;
const ROTATION_OFFSET = 60;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number): string {
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
  const strokeW = Math.max(4, Math.round(size * 0.075));
  const radius = (size - strokeW) / 2 - 2;

  const numberSize = Math.round(size * 0.33);
  const labelSize = Math.max(9, Math.round(size * 0.115));

  const filled = count > 0;

  const filledFilter = count > 0
    ? SEGMENT_GLOW[(count - 1) % SEGMENT_GLOW.length]
    : undefined;

  return (
    <div
      className={clsx('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${count} ${label}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        style={{ filter: filled ? filledFilter : undefined, transition: 'filter 0.35s ease' }}
      >
        {/* Background track segments */}
        {Array.from({ length: maxInterested }, (_, i) => {
          const startDeg = i * SLOT_DEG + GAP_DEG / 2 + ROTATION_OFFSET;
          return (
            <path
              key={`track-${i}`}
              d={arcPath(cx, cy, radius, startDeg, ARC_DEG)}
              fill="none"
              stroke={TRACK_COLOR}
              strokeWidth={strokeW}
              strokeLinecap="round"
            />
          );
        })}

        {/* Filled segments on top */}
        {Array.from({ length: maxInterested }, (_, i) => {
          if (i >= count) return null;
          const startDeg = i * SLOT_DEG + GAP_DEG / 2 + ROTATION_OFFSET;
          return (
            <path
              key={`fill-${i}`}
              d={arcPath(cx, cy, radius, startDeg, ARC_DEG)}
              fill="none"
              stroke={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
              strokeWidth={strokeW}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset,stroke] duration-500 ease-out"
            />
          );
        })}
      </svg>

      {!hideLabel && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className="tabular-nums leading-none text-[#0F172A]"
            style={{ fontSize: numberSize, fontWeight: 800, letterSpacing: '-0.01em' }}
          >
            {count}
          </span>
          <span
            className="mt-[2px] max-w-[92%] truncate leading-tight text-[#94A3B8] sm:mt-[3px] sm:max-w-[80%]"
            style={{ fontSize: labelSize, fontWeight: 500 }}
          >
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
