import { ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';

import backgroundImage from '@/assets/hero/backgrounds/helper/bg-magenta.png';
import medalImage from '@/assets/hero/medals/helper/top.png';
import pedestalImage from '@/assets/hero/pedestal/pedestal-magenta.png';
import particlesImage from '@/assets/hero/particles/particulas.png';
import { HeroRankAnimation } from '@/components/hero/HeroRankAnimation';
import {
  TOP_HELPER_LEVEL_VISUAL,
  TOP_HELPER_SPARKLES,
} from '@/config/topHelperLevelVisual';
import { BRAND } from '@/utils/brandAssets';

type Props = {
  balance?: number | null;
  completedServices: number;
  connectedProfessionals: number;
  rating: number;
  satisfactionRate?: number | null;
};

export function TopHelperHero({ balance }: Props) {
  const visual = TOP_HELPER_LEVEL_VISUAL;
  const displayBalance =
    balance == null ? '—' : Math.max(0, Math.round(balance)).toLocaleString('pt-BR');

  return (
    <section className="relative left-1/2 isolate mb-4 w-[100dvw] max-w-none -translate-x-1/2 overflow-hidden border-0 bg-[#080106] text-white shadow-none ring-1 ring-pink-400/15 lg:left-auto lg:w-full lg:translate-x-0 lg:rounded-[1.75rem] lg:shadow-[0_22px_58px_rgba(80,0,45,0.42)]">
      <img
        src={backgroundImage}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-42"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(236,72,153,0.36),transparent_40%),linear-gradient(180deg,rgba(8,1,6,0.92),rgba(48,3,28,0.66)_38%,rgba(5,0,4,0.98)_84%)]" />
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
        {TOP_HELPER_SPARKLES.map((sparkle, index) => (
          <span
            key={index}
            className="lh-hero-magenta-sparkle"
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
        className="lh-hero-particles pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45 mix-blend-screen"
      />

      <div className="relative z-10 px-3 pb-3 pt-5 sm:px-8 sm:pb-5 sm:pt-7">
        <header className="flex items-center justify-between gap-3">
          <p className="lh-hero-tag inline-flex min-w-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-pink-200 sm:text-xs sm:tracking-[0.18em]">
            <Sparkles className="lh-hero-sparkle-icon h-3.5 w-3.5 shrink-0" />
            {visual.journeyEyebrow}
          </p>
          <div className="lh-hero-balance flex min-w-0 items-center">
            <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-pink-300/30 bg-black/55 px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md sm:min-w-[15rem] sm:gap-3 sm:px-5 sm:py-2.5">
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
              <span className="lh-hero-highlight-magenta">{visual.headline.highlight}</span>
            </h1>
          </div>

          <div className="flex items-center justify-center py-5 sm:py-7">
            <div className="lh-hero-level-pill w-fit rounded-full border border-pink-300/40 bg-pink-500/10 px-5 py-1.5 shadow-[0_0_24px_rgba(236,72,153,0.28)] backdrop-blur-md">
              <p className="text-sm font-black uppercase tracking-[0.08em] text-pink-100 sm:text-base">
                {visual.currentLevel}
              </p>
            </div>
          </div>

          <div className="relative mx-auto min-h-[17.5rem] w-full max-w-[27rem] sm:min-h-[23rem] sm:max-w-[33rem]">
            <HeroRankAnimation
              medalSrc={medalImage}
              medalAlt={visual.medalAlt}
              pedestalSrc={pedestalImage}
              colorKey="magenta"
              motionIntensity={visual.motionIntensity}
              className="absolute inset-0 z-[2]"
            />
          </div>
        </div>

        <div className="mx-auto w-fit -translate-y-2">
          <span className="lh-hero-nivel-badge-magenta inline-flex min-w-[7.5rem] justify-center rounded-full border border-pink-200/45 bg-gradient-to-b from-pink-300 via-fuchsia-500 to-pink-950 px-4 py-1 text-sm font-black shadow-[0_0_22px_rgba(236,72,153,0.38)] sm:min-w-[9rem] sm:text-base">
            {visual.levelLabel}
          </span>
        </div>

        <p className="lh-hero-description mx-auto -mt-1 max-w-[22rem] text-center text-sm font-medium leading-relaxed text-white/68 sm:max-w-[34rem] sm:text-base">
          {visual.description}
        </p>

        <div className="lh-hero-progress mx-auto mt-3 max-w-[45rem] rounded-2xl border border-pink-300/20 bg-black/55 px-3 py-2.5 shadow-[0_8px_34px_rgba(236,72,153,0.16)] backdrop-blur-lg sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-pink-300/30 bg-pink-500/15 text-pink-200">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-white/65 sm:text-xs">{visual.nextLevelLabel}</p>
              <p className="truncate text-xs font-black uppercase text-pink-300 sm:text-base">
                {visual.nextLevel}
              </p>
            </div>
            <span className="text-lg font-black sm:text-xl">{visual.progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-pink-800 via-fuchsia-500 to-pink-300 shadow-[0_0_16px_rgba(236,72,153,0.56)]"
              style={{ width: `${visual.progressPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-center text-[10px] text-white/55 sm:text-xs">
            Mais {visual.pointsRemaining} pontos para alcançar o próximo nível
          </p>
        </div>
      </div>
    </section>
  );
}
