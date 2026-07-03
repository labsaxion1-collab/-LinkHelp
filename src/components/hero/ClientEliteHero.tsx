import { ChevronRight, Crown, Sparkles } from 'lucide-react';

import backgroundImage from '@/assets/hero/backgrounds/client/bg-dourado-flare.png';
import medalImage from '@/assets/hero/medals/client/elite.png';
import pedestalImage from '@/assets/hero/pedestal/pedestal-dourado-elite.png';
import particlesImage from '@/assets/hero/particles/particulas.png';
import { HeroRankAnimation } from '@/components/hero/HeroRankAnimation';
import {
  CLIENT_ELITE_LEVEL_VISUAL,
  CLIENT_ELITE_ORBS,
  CLIENT_ELITE_SPARKLES,
} from '@/config/clientEliteLevelVisual';
import { BRAND } from '@/utils/brandAssets';

type Props = {
  balance?: number | null;
  completedServices: number;
  connectedProfessionals: number;
  rating: number;
  satisfactionRate?: number | null;
};

export function ClientEliteHero({ balance }: Props) {
  const visual = CLIENT_ELITE_LEVEL_VISUAL;
  const displayBalance =
    balance == null ? '—' : Math.max(0, Math.round(balance)).toLocaleString('pt-BR');

  return (
    <section className="relative left-1/2 isolate mb-4 w-[100dvw] max-w-none -translate-x-1/2 overflow-hidden border-0 bg-[#0a0602] text-white shadow-none ring-1 ring-amber-300/20 lg:left-auto lg:w-full lg:translate-x-0 lg:rounded-[1.75rem] lg:shadow-[0_24px_64px_rgba(80,45,0,0.38)]">
      <img
        src={backgroundImage}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,215,100,0.34),transparent_40%),radial-gradient(circle_at_50%_55%,rgba(251,191,36,0.12),transparent_50%),linear-gradient(180deg,rgba(12,7,0,0.92),rgba(40,22,0,0.74)_40%,rgba(8,4,0,0.98)_82%)]" />

      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
        {CLIENT_ELITE_ORBS.map((orb, index) => (
          <span
            key={`orb-${index}`}
            className="lh-hero-elite-orb"
            style={{
              left: orb.left,
              top: orb.top,
              width: orb.size,
              height: orb.size,
              animationDelay: orb.delay,
              animationDuration: orb.duration,
            }}
          />
        ))}
        {CLIENT_ELITE_SPARKLES.map((sparkle, index) => (
          <span
            key={`sparkle-${index}`}
            className="lh-hero-elite-sparkle"
            style={{
              left: sparkle.left,
              top: sparkle.top,
              width: sparkle.size,
              height: sparkle.size,
              animationDelay: sparkle.delay,
              animationDuration: sparkle.duration,
            }}
          />
        ))}
      </div>

      <img
        src={particlesImage}
        alt=""
        aria-hidden="true"
        className="lh-hero-particles pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-screen"
      />

      <div className="relative z-10 px-3 pb-3 pt-5 sm:px-8 sm:pb-5 sm:pt-7">
        <header className="flex items-center justify-between gap-3">
          <p className="lh-hero-tag inline-flex min-w-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-amber-200 sm:text-xs sm:tracking-[0.18em]">
            <Sparkles className="lh-hero-sparkle-icon h-3.5 w-3.5 shrink-0" />
            {visual.journeyEyebrow}
          </p>
          <div className="lh-hero-balance flex min-w-0 items-center">
            <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-950/45 px-2 py-1.5 shadow-[0_0_24px_rgba(251,191,36,0.12)] backdrop-blur-md sm:min-w-[15rem] sm:gap-3 sm:px-5 sm:py-2.5">
              <img
                src={BRAND.linkCreditCoin}
                alt=""
                className="h-8 w-8 shrink-0 object-contain sm:h-11 sm:w-11"
              />
              <div className="min-w-0 sm:flex-1">
                <p className="hidden text-xs text-white/70 sm:block">{visual.balanceLabel}</p>
                <p className="whitespace-nowrap text-sm font-black sm:text-xl">{displayBalance} LC</p>
              </div>
              <ChevronRight className="hidden h-6 w-6 text-white/35 sm:block" />
            </div>
          </div>
        </header>

        <div className="mx-auto mt-2 flex w-full max-w-[33rem] flex-col sm:mt-3">
          <div className="lh-hero-headline max-w-[25rem] self-center text-center">
            <h1 className="text-[1.85rem] font-black leading-[1.04] tracking-[-0.045em] min-[430px]:text-[2.15rem] sm:text-5xl">
              {visual.headline.beforeHighlight}{' '}
              <span className="lh-hero-highlight-elite">{visual.headline.highlight}</span>
            </h1>
          </div>

          <div className="flex items-center justify-center py-5 sm:py-7">
            <div className="lh-hero-level-pill w-fit rounded-full border border-amber-200/40 bg-amber-400/12 px-5 py-1.5 shadow-[0_0_28px_rgba(251,191,36,0.24)] backdrop-blur-md">
              <p className="text-sm font-black uppercase tracking-[0.08em] text-amber-100 sm:text-base">
                {visual.currentLevel}
              </p>
            </div>
          </div>

          <div className="relative mx-auto min-h-[18rem] w-full max-w-[27rem] sm:min-h-[24rem] sm:max-w-[33rem]">
            <div className="lh-hero-elite-core-pulse" aria-hidden="true" />

            <div className="lh-hero-elite-shockwave-wrap" aria-hidden="true">
              {visual.shockwaveDelays.map((delay) => (
                <span
                  key={delay}
                  className="lh-hero-elite-shockwave"
                  style={{
                    animationDelay: delay,
                    animationDuration: `${visual.shockwaveDurationS}s`,
                  }}
                />
              ))}
            </div>

            <HeroRankAnimation
              medalSrc={medalImage}
              medalAlt={visual.medalAlt}
              pedestalSrc={pedestalImage}
              colorKey="dourado"
              motionIntensity={visual.motionIntensity}
              className="absolute inset-0 z-[3]"
            />
          </div>
        </div>

        <div className="mx-auto w-fit -translate-y-2">
          <span className="lh-hero-nivel-badge-elite inline-flex min-w-[7.5rem] items-center justify-center gap-1.5 rounded-full border border-amber-100/50 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-900 px-4 py-1 text-sm font-black text-amber-950 sm:min-w-[9rem] sm:text-base">
            <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
            {visual.levelLabel}
          </span>
        </div>

        <p className="lh-hero-description mx-auto -mt-1 max-w-[22rem] text-center text-sm font-medium leading-relaxed text-white/70 sm:max-w-[34rem] sm:text-base">
          {visual.description}
        </p>

        <div className="lh-hero-progress mx-auto mt-3 max-w-[45rem] rounded-2xl border border-amber-300/25 bg-amber-950/30 px-3 py-3 shadow-[0_10px_40px_rgba(251,191,36,0.16)] backdrop-blur-lg sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-200/35 bg-amber-400/18 text-amber-200">
              <Crown className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-200/80 sm:text-xs">
                {visual.maxLevelMessage}
              </p>
              <p className="truncate text-xs font-black uppercase text-amber-300 sm:text-base">
                Cliente Elite — topo da jornada
              </p>
            </div>
            <span className="text-lg font-black text-amber-200 sm:text-xl">100%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <span className="block h-full w-full rounded-full bg-gradient-to-r from-amber-700 via-amber-400 to-yellow-100 shadow-[0_0_18px_rgba(251,191,36,0.5)]" />
          </div>
          <p className="mt-1.5 text-center text-[10px] text-amber-100/60 sm:text-xs">
            Você atingiu o nível máximo de reputação na Link Help
          </p>
        </div>
      </div>
    </section>
  );
}
