import { ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';

import backgroundImage from '@/assets/hero/backgrounds/helper/bg-roxo.png';
import medalImage from '@/assets/hero/medals/helper/iniciante.png';
import pedestalImage from '@/assets/hero/pedestal/pedestal-azul.png';
import particlesImage from '@/assets/hero/particles/particulas.png';
import { HeroRankAnimation } from '@/components/hero/HeroRankAnimation';
import {
  HELPER_INICIANTE_LEVEL_VISUAL,
  HELPER_INICIANTE_SPARKLES,
} from '@/config/helperInicianteLevelVisual';
import { BRAND } from '@/utils/brandAssets';

type Props = {
  balance?: number | null;
  completedServices: number;
  connectedProfessionals: number;
  rating: number;
  satisfactionRate?: number | null;
};

export function HelperInicianteHero({ balance }: Props) {
  const visual = HELPER_INICIANTE_LEVEL_VISUAL;
  const displayBalance =
    balance == null ? '—' : Math.max(0, Math.round(balance)).toLocaleString('pt-BR');

  return (
    <section className="relative left-1/2 isolate mb-4 w-[100dvw] max-w-none -translate-x-1/2 overflow-hidden border-0 bg-[#02040a] text-white shadow-none ring-1 ring-blue-500/10 lg:left-auto lg:w-full lg:translate-x-0 lg:rounded-[1.75rem] lg:shadow-[0_22px_58px_rgba(0,7,30,0.32)]">
      <img
        src={backgroundImage}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(37,99,255,0.28),transparent_38%),linear-gradient(180deg,rgba(0,2,12,0.94),rgba(0,6,28,0.72)_38%,rgba(0,2,10,0.98)_82%)]" />
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
        {HELPER_INICIANTE_SPARKLES.map((sparkle, index) => (
          <span
            key={index}
            className="lh-hero-blue-sparkle"
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
          <p className="lh-hero-tag inline-flex min-w-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-blue-300 sm:text-xs sm:tracking-[0.18em]">
            <Sparkles className="lh-hero-sparkle-icon h-3.5 w-3.5 shrink-0" />
            {visual.journeyEyebrow}
          </p>
          <div className="lh-hero-balance flex min-w-0 items-center">
            <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-blue-400/25 bg-blue-950/40 px-2 py-1.5 backdrop-blur-md sm:min-w-[15rem] sm:gap-3 sm:px-5 sm:py-2.5">
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
              <span className="lh-hero-highlight-blue">{visual.headline.highlight}</span>
            </h1>
          </div>

          <div className="flex items-center justify-center py-5 sm:py-7">
            <div className="lh-hero-level-pill w-fit rounded-full border border-blue-300/35 bg-blue-500/10 px-5 py-1.5 shadow-[0_0_20px_rgba(59,130,246,0.18)] backdrop-blur-md">
              <p className="text-sm font-black uppercase tracking-[0.08em] text-blue-200 sm:text-base">
                {visual.currentLevel}
              </p>
            </div>
          </div>

          <div className="relative mx-auto min-h-[17.5rem] w-full max-w-[27rem] sm:min-h-[23rem] sm:max-w-[33rem]">
            <HeroRankAnimation
              medalSrc={medalImage}
              medalAlt={visual.medalAlt}
              pedestalSrc={pedestalImage}
              colorKey="azul"
              motionIntensity={visual.motionIntensity}
              className="absolute inset-0 z-[2]"
            />
          </div>
        </div>

        <div className="mx-auto w-fit -translate-y-2">
          <span className="lh-hero-nivel-badge-blue inline-flex min-w-[7.5rem] justify-center rounded-full border border-blue-300/35 bg-gradient-to-b from-blue-400 to-blue-900 px-4 py-1 text-sm font-black sm:min-w-[9rem] sm:text-base">
            {visual.levelLabel}
          </span>
        </div>

        <p className="lh-hero-description mx-auto -mt-1 max-w-[22rem] text-center text-sm font-medium leading-relaxed text-white/68 sm:max-w-[34rem] sm:text-base">
          {visual.description}
        </p>

        <div className="lh-hero-progress mx-auto mt-3 max-w-[45rem] rounded-2xl border border-blue-400/20 bg-blue-950/35 px-3 py-2.5 shadow-[0_8px_32px_rgba(37,99,255,0.12)] backdrop-blur-lg sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-blue-300/25 bg-blue-500/15 text-blue-300">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-white/65 sm:text-xs">{visual.nextLevelLabel}</p>
              <p className="truncate text-xs font-black uppercase text-blue-400 sm:text-base">
                {visual.nextLevel}
              </p>
            </div>
            <span className="text-lg font-black sm:text-xl">{visual.progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-300 shadow-[0_0_14px_rgba(59,130,246,0.36)]"
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
