import { clsx } from 'clsx';
import * as Icons from 'lucide-react';
import { MAX_JOB_INTERESTED } from '@/utils/applicationInterest';
import {
  CLIENT_ACTIVITY_RING_TRACK,
  CLIENT_ACTIVITY_VIP_GOLD,
} from '@/utils/clientActivityCandidateRing';

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

function fullRingPath(cx: number, cy: number, r: number): string {
  // Nearly full circle (SVG arc cannot be exactly 360°)
  return arcPath(cx, cy, r, 0, 359.9);
}

export type ClientActivityCandidateRingProps = {
  /** Up to 3 colors — null = empty/neutral slot. Ignored when exclusiveFullColor is set. */
  segmentColors: Array<string | null>;
  /** When set, draw one continuous ring in this rank color (VIP/exclusive lock). */
  exclusiveFullColor?: string | null;
  size?: number;
  count?: number;
  ariaLabel: string;
  onActivate: () => void;
  className?: string;
  disabled?: boolean;
};

/**
 * Client-activities-only candidate arc.
 * Does not change Helper feed InterestedRing.
 */
export function ClientActivityCandidateRing({
  segmentColors,
  exclusiveFullColor = null,
  size = 68,
  count = 0,
  ariaLabel,
  onActivate,
  className,
  disabled = false,
}: ClientActivityCandidateRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const strokeW = Math.max(4, Math.round(size * 0.075));
  const radius = (size - strokeW) / 2 - 2;
  const numberSize = Math.round(size * 0.28);
  const isExclusive = Boolean(exclusiveFullColor);
  const displayCount = Math.max(0, Math.min(MAX_JOB_INTERESTED, count));
  const glowColor = exclusiveFullColor ?? segmentColors.find((c) => c != null) ?? null;

  return (
    <button
      type="button"
      data-testid="client-activity-candidate-ring"
      data-ring-mode={isExclusive ? 'exclusive' : 'segments'}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onActivate();
      }}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-opacity',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2',
        disabled ? 'cursor-default opacity-70' : 'cursor-pointer hover:opacity-95 active:scale-[0.98]',
        className,
      )}
    >
      <div
        className="relative shrink-0 rounded-full"
        style={{
          width: size,
          height: size,
          ...(isExclusive && exclusiveFullColor
            ? {
                boxShadow: `0 0 0 2px ${exclusiveFullColor}`,
              }
            : null),
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden
          style={{
            filter: glowColor
              ? `drop-shadow(0 0 5px ${glowColor}88)`
              : undefined,
            transition: 'filter 0.35s ease',
          }}
        >
          {isExclusive && exclusiveFullColor ? (
            <>
              <path
                d={fullRingPath(cx, cy, radius)}
                fill="none"
                stroke={CLIENT_ACTIVITY_RING_TRACK}
                strokeWidth={strokeW}
                strokeLinecap="round"
              />
              <path
                d={fullRingPath(cx, cy, radius)}
                fill="none"
                stroke={exclusiveFullColor}
                strokeWidth={strokeW}
                strokeLinecap="round"
                className="transition-[stroke] duration-500 ease-out"
              />
            </>
          ) : (
            <>
              {Array.from({ length: MAX_JOB_INTERESTED }, (_, i) => {
                const startDeg = i * SLOT_DEG + GAP_DEG / 2 + ROTATION_OFFSET;
                return (
                  <path
                    key={`track-${i}`}
                    d={arcPath(cx, cy, radius, startDeg, ARC_DEG)}
                    fill="none"
                    stroke={CLIENT_ACTIVITY_RING_TRACK}
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                  />
                );
              })}
              {Array.from({ length: MAX_JOB_INTERESTED }, (_, i) => {
                const color = segmentColors[i];
                if (!color) return null;
                const startDeg = i * SLOT_DEG + GAP_DEG / 2 + ROTATION_OFFSET;
                return (
                  <path
                    key={`fill-${i}`}
                    d={arcPath(cx, cy, radius, startDeg, ARC_DEG)}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                    data-testid={`client-activity-ring-segment-${i}`}
                    data-segment-color={color}
                    className="transition-[stroke] duration-500 ease-out"
                  />
                );
              })}
            </>
          )}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {isExclusive ? (
            <span
              data-testid="client-activity-ring-vip-center"
              className="flex h-[42%] w-[42%] items-center justify-center rounded-full border-2 shadow-sm"
              style={{
                backgroundColor: `${CLIENT_ACTIVITY_VIP_GOLD}22`,
                borderColor: CLIENT_ACTIVITY_VIP_GOLD,
                boxShadow: `0 0 10px ${CLIENT_ACTIVITY_VIP_GOLD}55`,
              }}
            >
              <Icons.Crown
                className="h-[55%] w-[55%]"
                style={{ color: CLIENT_ACTIVITY_VIP_GOLD }}
                aria-hidden
              />
            </span>
          ) : (
            <span
              className="tabular-nums leading-none text-[#0F172A]"
              style={{ fontSize: numberSize, fontWeight: 800, letterSpacing: '-0.01em' }}
              data-testid="client-activity-ring-count"
            >
              {displayCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
