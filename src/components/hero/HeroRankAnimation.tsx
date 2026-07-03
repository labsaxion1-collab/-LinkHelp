import { useEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import pedestalVerdeImage from '@/assets/hero/pedestal/pedestal-verde.png';

// ─── Color theme system ───────────────────────────────────────────────────────
export type HeroColorKey = 'verde' | 'azul';

const COLOR_THEME = {
  verde: {
    particle: '#a3ff45',
    particleRgb: '145,255,66',
    bgGlow: 'rgba(113,255,32,0.12)',
    mainGlowA: 'rgba(130,255,48,0.48)',
    mainGlowB: 'rgba(73,186,22,0.08)',
    medalRgb: '126,255,43',
    pedestalGlowA: 'rgba(153,255,79,0.65)',
    pedestalGlowB: 'rgba(71,177,24,0.12)',
  },
  azul: {
    particle: '#7cb9ff',
    particleRgb: '66,145,255',
    bgGlow: 'rgba(28,99,255,0.14)',
    mainGlowA: 'rgba(48,130,255,0.48)',
    mainGlowB: 'rgba(22,73,186,0.08)',
    medalRgb: '43,126,255',
    pedestalGlowA: 'rgba(79,153,255,0.65)',
    pedestalGlowB: 'rgba(22,71,177,0.12)',
  },
} as const;

type CompositionProps = {
  medalSrc: string;
  medalAlt: string;
  pedestalSrc?: string;
  colorKey?: HeroColorKey;
  motionIntensity?: number;
  reducedMotion?: boolean;
};

type HeroRankAnimationProps = {
  medalSrc: string;
  medalAlt: string;
  pedestalSrc?: string;
  colorKey?: HeroColorKey;
  motionIntensity?: number;
  className?: string;
};

const PARTICLES = [
  { angle: 0.1, radiusX: 31, radiusY: 22, size: 7, depth: 0.8 },
  { angle: 0.8, radiusX: 39, radiusY: 27, size: 6, depth: 1.2 },
  { angle: 1.55, radiusX: 34, radiusY: 24, size: 9, depth: 0.65 },
  { angle: 2.2, radiusX: 42, radiusY: 30, size: 6, depth: 0.95 },
  { angle: 2.9, radiusX: 29, radiusY: 20, size: 7, depth: 1.35 },
  { angle: 3.6, radiusX: 38, radiusY: 26, size: 5, depth: 0.75 },
  { angle: 4.25, radiusX: 44, radiusY: 31, size: 8, depth: 1.1 },
  { angle: 4.95, radiusX: 33, radiusY: 23, size: 6, depth: 0.9 },
  { angle: 5.55, radiusX: 41, radiusY: 28, size: 9, depth: 1.25 },
  { angle: 6.05, radiusX: 28, radiusY: 19, size: 5, depth: 0.7 },
] as const;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  return reduced;
}

export function HeroRankComposition({ medalSrc, medalAlt, pedestalSrc, colorKey = 'verde', motionIntensity = 1, reducedMotion = false }: CompositionProps) {
  const theme = COLOR_THEME[colorKey];
  const pedestal = pedestalSrc ?? pedestalVerdeImage;
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;
  const phase = progress * Math.PI * 2;
  const motionScale = reducedMotion ? 0.18 : motionIntensity;

  // Integer harmonics only — guarantee perfect loop with no position jump on restart
  const floatY = (Math.sin(phase) * 15 + Math.sin(phase * 3) * 4) * motionScale;
  const floatX = (Math.cos(phase) * 8 + Math.sin(phase * 2) * 3) * motionScale;
  const rotateY = (Math.sin(phase) * 6 + Math.sin(phase * 2) * 2.5) * motionScale;
  const rotateX = (Math.cos(phase) * 3 + Math.cos(phase * 2) * 1.2) * motionScale;
  const rotateZ = Math.sin(phase * 2 + 1.0) * 2.2 * motionScale;
  const glowOpacity = interpolate(
    Math.sin(phase) * 0.5 + 0.5,
    [0, 1],
    reducedMotion ? [0.55, 0.63] : [0.42, 0.82],
  );
  const pedestalGlow = interpolate(
    Math.sin(phase + Math.PI / 2) * 0.5 + 0.5,
    [0, 1],
    reducedMotion ? [0.48, 0.56] : [0.36, 0.68],
  );

  const particlePositions = useMemo(
    () =>
      PARTICLES.map((particle, index) => {
        const direction = index % 3 === 0 ? -1 : 1;
        const particlePhase = (reducedMotion ? 0 : phase * direction) + particle.angle;
        return {
          ...particle,
          left: 50 + Math.cos(particlePhase) * particle.radiusX,
          top: 42 + Math.sin(particlePhase) * particle.radiusY,
          opacity: 0.35 + (Math.sin(particlePhase * 1.7) * 0.5 + 0.5) * 0.55,
        };
      }),
    [phase, reducedMotion],
  );

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background: `radial-gradient(circle at 50% 42%, ${theme.bgGlow}, transparent 33%)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '42%',
          width: '72%',
          aspectRatio: '1',
          transform: `translate(-50%, -50%) scale(${0.96 + glowOpacity * 0.05})`,
          opacity: glowOpacity * 0.48,
          filter: 'blur(22px)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.mainGlowA}, ${theme.mainGlowB} 48%, transparent 70%)`,
          willChange: 'transform, opacity',
        }}
      />

      {particlePositions.map((particle, index) => (
        <span
          key={index}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: particle.size,
            height: particle.size,
            borderRadius: '50%',
            opacity: particle.opacity,
            background: theme.particle,
            boxShadow: `0 0 ${particle.size * 2}px rgba(${theme.particleRgb},0.85)`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      <div
        className="sm:!w-[58%]"
        style={{
          position: 'absolute',
          left: '50%',
          top: '38%',
          width: '64%',
          transform: `translate(-50%, -50%) translateX(${floatX}px) translateY(${floatY}px) perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
          filter: `drop-shadow(0 0 ${24 + glowOpacity * 22}px rgba(${theme.medalRgb},${glowOpacity}))`,
          transformStyle: 'preserve-3d',
          willChange: 'transform, filter',
          zIndex: 3,
        }}
      >
        <img src={medalSrc} alt={medalAlt} style={{ display: 'block', width: '100%', height: 'auto' }} />
      </div>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '6%',
          width: '68%',
          height: '18%',
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          opacity: pedestalGlow,
          filter: 'blur(18px)',
          background: `radial-gradient(ellipse, ${theme.pedestalGlowA}, ${theme.pedestalGlowB} 48%, transparent 72%)`,
        }}
      />
      <img
        src={pedestal}
        alt=""
        aria-hidden="true"
        className="sm:!w-[102%]"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '3%',
          width: '112%',
          maxWidth: 'none',
          transform: 'translateX(-50%)',
          filter: `drop-shadow(0 20px 30px rgba(0,0,0,0.85)) brightness(${0.96 + pedestalGlow * 0.1})`,
          willChange: 'filter',
          zIndex: 2,
        }}
      />
    </AbsoluteFill>
  );
}

export function HeroRankAnimation({ medalSrc, medalAlt, pedestalSrc, colorKey = 'verde', motionIntensity = 1, className }: HeroRankAnimationProps) {
  const reducedMotion = usePrefersReducedMotion();
  const playerRef = useRef<PlayerRef>(null);

  useEffect(() => {
    const ensurePlaying = () => {
      if (document.visibilityState === 'visible' && playerRef.current && !playerRef.current.isPlaying()) {
        playerRef.current.play();
      }
    };

    ensurePlaying();
    const startTimer = window.setTimeout(ensurePlaying, 150);
    document.addEventListener('visibilitychange', ensurePlaying);
    return () => {
      window.clearTimeout(startTimer);
      document.removeEventListener('visibilitychange', ensurePlaying);
    };
  }, []);

  return (
    <div className={className} aria-label={medalAlt}>
      <Player
        ref={playerRef}
        component={HeroRankComposition}
        inputProps={{ medalSrc, medalAlt, pedestalSrc, colorKey, motionIntensity, reducedMotion }}
        durationInFrames={180}
        compositionWidth={720}
        compositionHeight={620}
        fps={30}
        autoPlay
        loop
        controls={false}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      />
    </div>
  );
}
