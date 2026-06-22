import { useMemo, type CSSProperties } from 'react';
import { clsx } from 'clsx';

type Props = {
  active: boolean;
};

const CONFETTI_COLORS = ['#2563FF', '#60A5FA', '#FBBF24', '#FFFFFF', '#93C5FD'] as const;

/** Três zonas de explosão — moeda, presente, lateral direita */
const CELEBRATION_BURSTS = [
  { id: 'coin', left: '50%', top: '36%', delayOffset: 0 },
  { id: 'gift', left: '26%', top: '45%', delayOffset: 0.04 },
  { id: 'spark', left: '74%', top: '40%', delayOffset: 0.07 },
] as const;

const CONFETTI_PER_BURST = 9;
const GLITTER_PER_BURST = 5;

function buildConfettiParticles(burstIndex: number) {
  return Array.from({ length: CONFETTI_PER_BURST }, (_, index) => {
    const seed = burstIndex * 31 + index * 17;
    return {
      id: `${burstIndex}-${index}`,
      drift: ((seed * 13) % 148) - 74,
      lift: -42 - (index % 5) * 16 - burstIndex * 4,
      drop: 32 + (index % 4) * 12 + burstIndex * 6,
      delay: (index % 6) * 0.025 + CELEBRATION_BURSTS[burstIndex].delayOffset,
      duration: 1.8 + (index % 3) * 0.1,
      spin: ((seed * 23) % 480) - 240,
      size: 4 + ((index + burstIndex) % 5),
      variant: (index + burstIndex) % 4,
      color: CONFETTI_COLORS[(index + burstIndex * 2) % CONFETTI_COLORS.length],
    };
  });
}

function buildGlitterParticles(burstIndex: number) {
  return Array.from({ length: GLITTER_PER_BURST }, (_, index) => {
    const seed = burstIndex * 19 + index * 11;
    return {
      id: `${burstIndex}-${index}`,
      offsetX: ((seed * 7) % 72) - 36,
      offsetY: ((seed * 5) % 48) - 24,
      delay: (index % 5) * 0.06 + CELEBRATION_BURSTS[burstIndex].delayOffset,
      duration: 1.25 + (index % 3) * 0.1,
      size: 2 + ((index + burstIndex) % 3),
    };
  });
}

function ConfettiShape({ variant, color }: { variant: number; color: string }) {
  if (variant === 0) {
    return <span className="block h-full w-[140%] rounded-sm" style={{ backgroundColor: color }} />;
  }
  if (variant === 1) {
    return (
      <span
        className="block h-full w-full"
        style={{
          backgroundColor: color,
          clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
        }}
      />
    );
  }
  if (variant === 2) {
    return <span className="block h-full w-full rounded-[1px]" style={{ backgroundColor: color }} />;
  }
  return <span className="block h-full w-full rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />;
}

function CelebrationBurst({
  left,
  top,
  confetti,
  glitter,
  showGiftGlow = false,
}: {
  left: string;
  top: string;
  confetti: ReturnType<typeof buildConfettiParticles>;
  glitter: ReturnType<typeof buildGlitterParticles>;
  showGiftGlow?: boolean;
}) {
  return (
    <>
      <div className="absolute h-0 w-0 -translate-x-1/2 -translate-y-1/2" style={{ left, top }}>
        {confetti.map((particle) => (
          <span
            key={particle.id}
            className="lh-tutorial-confetti-particle absolute left-0 top-0 opacity-0"
            style={
              {
                width: particle.size,
                height: particle.variant === 0 ? particle.size * 2.6 : particle.size,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
                '--lh-confetti-drift': `${particle.drift}px`,
                '--lh-confetti-lift': `${particle.lift}px`,
                '--lh-confetti-drop': `${particle.drop}px`,
                '--lh-confetti-spin': `${particle.spin}deg`,
              } as CSSProperties
            }
          >
            <ConfettiShape variant={particle.variant} color={particle.color} />
          </span>
        ))}
      </div>

      <div className="absolute h-0 w-0 -translate-x-1/2 -translate-y-1/2" style={{ left, top }}>
        {glitter.map((spark) => (
          <span
            key={spark.id}
            className="lh-tutorial-glitter-particle absolute rounded-full bg-white"
            style={
              {
                width: spark.size,
                height: spark.size,
                left: spark.offsetX,
                top: spark.offsetY,
                animationDelay: `${spark.delay}s`,
                animationDuration: `${spark.duration}s`,
                boxShadow: '0 0 8px rgba(255,255,255,0.95), 0 0 14px rgba(96,165,250,0.55)',
              } as CSSProperties
            }
          />
        ))}
      </div>

      {showGiftGlow ? (
        <div
          className={clsx('lh-tutorial-gift-bounce absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2')}
          style={{ left, top }}
        />
      ) : null}
    </>
  );
}

export function TutorialCelebrationEffects({ active }: Props) {
  const bursts = useMemo(
    () =>
      CELEBRATION_BURSTS.map((origin, burstIndex) => ({
        ...origin,
        confetti: buildConfettiParticles(burstIndex),
        glitter: buildGlitterParticles(burstIndex),
      })),
    [],
  );

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[15] overflow-hidden" aria-hidden>
      {bursts.map((burst) => (
        <CelebrationBurst
          key={burst.id}
          left={burst.left}
          top={burst.top}
          confetti={burst.confetti}
          glitter={burst.glitter}
          showGiftGlow={burst.id === 'gift'}
        />
      ))}
    </div>
  );
}
