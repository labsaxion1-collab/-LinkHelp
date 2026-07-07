import { ChevronRight, Sparkles } from 'lucide-react';

import backgroundImage from '@/assets/hero/backgrounds/helper/bg-magenta.png';
import medalImage from '@/assets/hero/medals/helper/top.png';
import pedestalImage from '@/assets/hero/pedestal/pedestal-magenta.png';
import particlesImage from '@/assets/hero/particles/particulas.png';
import { HeroRankAnimation } from '@/components/hero/HeroRankAnimation';
import { GamificationHeroBody } from '@/components/hero/GamificationHeroBody';
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

      <div className="relative z-10 px-3 pb-3 pt-3 sm:px-8 sm:pb-5 sm:pt-5">
        <header className="flex items-center justify-between gap-3">
          <p className="lh-hero-tag inline-flex min-w-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-pink-200 sm:text-xs sm:tracking-[0.18em]">
            <Sparkles className="lh-hero-sparkle-icon h-3.5 w-3.5 shrink-0" />
            {visual.journeyEyebrow}
          </p>
          <div className="lh-hero-balance flex min-w-0 items-center">
            <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-pink-300/30 bg-black/55 px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md sm:min-w-[15rem] sm:gap-3 sm:px-5 sm:py-2.5">
              <img src={BRAND.linkCreditCoin} alt="" className="h-8 w-8 shrink-0 object-contain sm:h-11 sm:w-11" />
              <div className="min-w-0 sm:flex-1">
                <p className="hidden text-xs text-white sm:block">{visual.balanceLabel}</p>
                <p className="whitespace-nowrap text-sm font-black sm:text-xl">{displayBalance} LC</p>
              </div>
              <ChevronRight className="hidden h-6 w-6 text-white/35 sm:block" />
            </div>
          </div>
        </header>

        <GamificationHeroBody
          userType="helper"
          levelLabel={visual.currentLevel}
          description={visual.description}
          badgeVariant="magenta"
          headline={
            <h1 className="text-[1.85rem] font-black leading-[1.04] tracking-[-0.045em] min-[430px]:text-[2.15rem] sm:text-5xl">
              {visual.headline.beforeHighlight}{' '}
              <span className="lh-hero-highlight-magenta">{visual.headline.highlight}</span>
            </h1>
          }
          medal={
            <HeroRankAnimation
              medalSrc={medalImage}
              medalAlt={visual.medalAlt}
              pedestalSrc={pedestalImage}
              colorKey="magenta"
              motionIntensity={visual.motionIntensity}
              className="absolute inset-0 scale-[1.12] sm:scale-[1.09]"
            />
          }
        />
      </div>
    </section>
  );
}
