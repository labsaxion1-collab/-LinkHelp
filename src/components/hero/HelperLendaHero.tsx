import { ChevronRight, Crown, Sparkles } from 'lucide-react';

import backgroundImage from '@/assets/hero/backgrounds/helper/bg-dourado-flare.png';
import medalImage from '@/assets/hero/medals/helper/lenda.png';
import pedestalImage from '@/assets/hero/pedestal/pedestal-dourado-elite.png';
import particlesImage from '@/assets/hero/particles/particulas.png';
import { HeroRankAnimation } from '@/components/hero/HeroRankAnimation';
import {
  HELPER_LENDA_LEVEL_VISUAL,
  HELPER_LENDA_SPARKLES,
} from '@/config/helperLendaLevelVisual';
import { BRAND } from '@/utils/brandAssets';

type Props = {
  balance?: number | null;
  completedServices: number;
  connectedProfessionals: number;
  rating: number;
  satisfactionRate?: number | null;
};

export function HelperLendaHero({ balance }: Props) {
  const visual = HELPER_LENDA_LEVEL_VISUAL;
  const displayBalance =
    balance == null ? '—' : Math.max(0, Math.round(balance)).toLocaleString('pt-BR');

  return (
    <section className="relative left-1/2 isolate mb-4 w-[100dvw] max-w-none -translate-x-1/2 overflow-hidden border-0 bg-[#080603] text-white shadow-none ring-1 ring-amber-400/15 lg:left-auto lg:w-full lg:translate-x-0 lg:rounded-[1.75rem] lg:shadow-[0_22px_58px_rgba(70,40,0,0.38)]">
      <img
        src={backgroundImage}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-48"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(251,191,36,0.30),transparent_40%),linear-gradient(180deg,rgba(8,5,0,0.92),rgba(28,16,0,0.64)_38%,rgba(5,3,0,0.97)_84%)]" />
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
        {HELPER_LENDA_SPARKLES.map((sparkle, index) => (
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

      <div className="relative z-10 px-3 pb-3 pt-5 sm:px-8 sm:pb-5 sm:pt-7">
        <header className="flex items-center justify-between gap-3">
          <p className="lh-hero-tag inline-flex min-w-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-amber-200 sm:text-xs sm:tracking-[0.18em]">
            <Sparkles className="lh-hero-sparkle-icon h-3.5 w-3.5 shrink-0" />
            {visual.journeyEyebrow}
          </p>
          <div className="lh-hero-balance flex min-w-0 items-center">
            <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-amber-300/30 bg-black/55 px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.42)] backdrop-blur-md sm:min-w-[15rem] sm:gap-3 sm:px-5 sm:py-2.5">
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
              <span className="lh-hero-highlight-gold">{visual.headline.highlight}</span>
            </h1>
          </div>

          <div className="flex items-center justify-center py-5 sm:py-7">
            <div className="lh-hero-level-pill w-fit rounded-full border border-amber-300/40 bg-amber-400/10 px-5 py-1.5 shadow-[0_0_22px_rgba(251,191,36,0.22)] backdrop-blur-md">
              <p className="text-sm font-black uppercase tracking-[0.08em] text-amber-100 sm:text-base">
                {visual.currentLevel}
              </p>
            </div>
          </div>

          <div className="relative mx-auto min-h-[17.5rem] w-full max-w-[27rem] sm:min-h-[23rem] sm:max-w-[33rem]">
            <HeroRankAnimation
              medalSrc={medalImage}
              medalAlt={visual.medalAlt}
              pedestalSrc={pedestalImage}
              colorKey="dourado"
              motionIntensity={visual.motionIntensity}
              className="absolute inset-0 z-[2]"
              legendMode
            />
          </div>
        </div>

        <div className="mx-auto w-fit -translate-y-2">
          <span className="lh-hero-nivel-badge-gold inline-flex min-w-[7.5rem] justify-center rounded-full border border-amber-200/50 bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-800 px-4 py-1 text-sm font-black text-amber-950 shadow-[0_0_20px_rgba(251,191,36,0.30)] sm:min-w-[9rem] sm:text-base">
            {visual.levelLabel}
          </span>
        </div>

        <p className="lh-hero-description mx-auto -mt-1 max-w-[22rem] text-center text-sm font-medium leading-relaxed text-white/68 sm:max-w-[34rem] sm:text-base">
          {visual.description}
        </p>

        <div className="lh-hero-progress mx-auto mt-3 max-w-[45rem] rounded-2xl border border-amber-300/20 bg-black/55 px-3 py-2.5 shadow-[0_8px_34px_rgba(251,191,36,0.12)] backdrop-blur-lg sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-300/30 bg-amber-400/15 text-amber-200">
              <Crown className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-white/65 sm:text-xs">{visual.nextLevelLabel}</p>
              <p className="truncate text-xs font-black uppercase text-amber-300 sm:text-base">
                {visual.nextLevel}
              </p>
            </div>
            <span className="text-lg font-black sm:text-xl">{visual.progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-amber-700 via-amber-400 to-yellow-200 shadow-[0_0_16px_rgba(251,191,36,0.48)]"
              style={{ width: `${visual.progressPercent}%` }}
            />
          </div>
          <p className="hidden">
            Mais {visual.pointsRemaining} pontos para alcançar o próximo nível
          </p>
          <p className="mt-1.5 text-center text-[10px] font-semibold text-amber-100/80 sm:text-xs">
            Parabens! Voce atingiu o nivel maximo de excelencia.
          </p>
        </div>
      </div>
    </section>
  );
}
