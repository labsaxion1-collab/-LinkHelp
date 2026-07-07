import { ChevronRight, Sparkles } from 'lucide-react';

import backgroundImage from '@/assets/hero/backgrounds/client/bg-dourado.png';
import medalImage from '@/assets/hero/medals/client/ouro.png';
import pedestalImage from '@/assets/hero/pedestal/pedestal-dourado.png';
import particlesImage from '@/assets/hero/particles/particulas.png';
import { HeroRankAnimation } from '@/components/hero/HeroRankAnimation';
import { GamificationHeroBody } from '@/components/hero/GamificationHeroBody';
import {
  CLIENT_OURO_LEVEL_VISUAL,
  CLIENT_OURO_SPARKLES,
} from '@/config/clientOuroLevelVisual';
import { BRAND } from '@/utils/brandAssets';

type Props = {
  balance?: number | null;
  completedServices: number;
  connectedProfessionals: number;
  rating: number;
  satisfactionRate?: number | null;
};

export function ClientOuroHero({ balance }: Props) {
  const visual = CLIENT_OURO_LEVEL_VISUAL;
  const displayBalance =
    balance == null ? '—' : Math.max(0, Math.round(balance)).toLocaleString('pt-BR');

  return (
    <section className="relative left-1/2 isolate mb-4 w-[100dvw] max-w-none -translate-x-1/2 overflow-hidden border-0 bg-[#090603] text-white shadow-none ring-1 ring-amber-400/15 lg:left-auto lg:w-full lg:translate-x-0 lg:rounded-[1.75rem] lg:shadow-[0_22px_58px_rgba(60,35,0,0.32)]">
      <img
        src={backgroundImage}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-34"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(251,191,36,0.30),transparent_38%),linear-gradient(180deg,rgba(12,7,0,0.94),rgba(35,20,0,0.70)_38%,rgba(8,4,0,0.98)_82%)]" />
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
        {CLIENT_OURO_SPARKLES.map((sparkle, index) => (
          <span
            key={index}
            className="lh-hero-gold-sparkle"
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
          <p className="lh-hero-tag inline-flex min-w-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-amber-300 sm:text-xs sm:tracking-[0.18em]">
            <Sparkles className="lh-hero-sparkle-icon h-3.5 w-3.5 shrink-0" />
            {visual.journeyEyebrow}
          </p>
          <div className="lh-hero-balance flex min-w-0 items-center">
            <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-950/35 px-2 py-1.5 backdrop-blur-md sm:min-w-[15rem] sm:gap-3 sm:px-5 sm:py-2.5">
              <img src={BRAND.linkCreditCoin} alt="" className="h-8 w-8 shrink-0 object-contain sm:h-11 sm:w-11" />
              <div className="min-w-0 sm:flex-1">
                <p className="hidden text-xs text-white/70 sm:block">{visual.balanceLabel}</p>
                <p className="whitespace-nowrap text-sm font-black sm:text-xl">{displayBalance} LC</p>
              </div>
              <ChevronRight className="hidden h-6 w-6 text-white/35 sm:block" />
            </div>
          </div>
        </header>

        <GamificationHeroBody
          userType="client"
          levelLabel={visual.currentLevel}
          description={visual.description}
          badgeVariant="gold"
          headline={
            <h1 className="text-[1.85rem] font-black leading-[1.04] tracking-[-0.045em] min-[430px]:text-[2.15rem] sm:text-5xl">
              {visual.headline.beforeHighlight}{' '}
              <span className="lh-hero-highlight-gold">{visual.headline.highlight}</span>
            </h1>
          }
          medal={
            <HeroRankAnimation
              medalSrc={medalImage}
              medalAlt={visual.medalAlt}
              pedestalSrc={pedestalImage}
              colorKey="dourado"
              motionIntensity={visual.motionIntensity}
              className="absolute inset-0 scale-[1.12] sm:scale-[1.09]"
            />
          }
        />
      </div>
    </section>
  );
}
