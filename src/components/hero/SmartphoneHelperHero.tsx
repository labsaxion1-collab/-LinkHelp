import { ChevronRight, LockKeyhole, ShieldCheck, Sparkles, Zap } from 'lucide-react';

import backgroundImage from '@/assets/hero/backgrounds/helper/bg-verde.png';
import medalImage from '@/assets/hero/medals/helper/novo helper.png';
import clientMedalImage from '@/assets/hero/medals/client/iniciante.png';
import particlesImage from '@/assets/hero/particles/particulas.png';
import { HeroRankAnimation } from '@/components/hero/HeroRankAnimation';
import { BRAND } from '@/utils/brandAssets';
import { CLIENT_BEGINNER_LEVEL_VISUAL } from '@/config/clientBeginnerLevelVisual';

type Props = {
  accountType?: 'helper' | 'client';
  avatarUrl?: string | null;
  balance?: number | null;
  completedServices: number;
  connectedProfessionals: number;
  rating: number;
  satisfactionRate?: number | null;
};

export function NewHelperHero({ accountType = 'helper', balance, completedServices, connectedProfessionals, rating, satisfactionRate }: Props) {
  const displayBalance = balance == null ? '—' : Math.max(0, Math.round(balance)).toLocaleString('pt-BR');
  const isClient = accountType === 'client';
  const clientVisual = CLIENT_BEGINNER_LEVEL_VISUAL;
  const currentLevel = isClient ? clientVisual.currentLevel : 'Novo Helper';
  const nextLevel = isClient ? clientVisual.nextLevel : '2. Helper Confiável';
  const journeyDescription = isClient
    ? clientVisual.description
    : 'Continue aprendendo, oferecendo excelentes serviços e conquistando a confiança dos clientes.';
  const journeyEyebrow = isClient ? clientVisual.journeyEyebrow : 'Sua jornada começa aqui';
  const levelLabel = isClient ? clientVisual.levelLabel : 'Nível 1';
  const progressPercent = isClient ? clientVisual.progressPercent : 35;
  const pointsRemaining = isClient ? clientVisual.pointsRemaining : 130;

  return (
    <section className="relative left-1/2 isolate mb-4 w-[100dvw] max-w-none -translate-x-1/2 overflow-hidden border-0 bg-[#020804] text-white shadow-none lg:left-auto lg:w-full lg:translate-x-0 lg:rounded-[1.75rem] lg:shadow-[0_22px_58px_rgba(0,20,7,0.32)]">
      <img src={backgroundImage} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-95" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(99,230,28,0.2),transparent_34%),linear-gradient(180deg,rgba(0,5,2,0.91),rgba(1,12,4,0.66)_36%,rgba(0,5,2,0.95)_82%)]" />
      <img src={particlesImage} alt="" aria-hidden="true" className="lh-hero-particles pointer-events-none absolute inset-0 h-full w-full object-cover mix-blend-screen" />

      <div className="relative z-10 px-3 pb-3 pt-3 sm:px-8 sm:pb-5 sm:pt-5">
        <header className="flex items-center justify-between gap-3">
          <p className="lh-hero-tag inline-flex min-w-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-lime-300 sm:text-xs sm:tracking-[0.18em]">
            <Sparkles className="lh-hero-sparkle-icon h-3.5 w-3.5 shrink-0" /> {journeyEyebrow}
          </p>
          <div className="lh-hero-balance flex min-w-0 items-center">
            <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-lime-400/20 bg-black/30 px-2 py-1.5 backdrop-blur-md sm:min-w-[15rem] sm:gap-3 sm:px-5 sm:py-2.5">
              <img src={BRAND.linkCreditCoin} alt="" className="h-8 w-8 shrink-0 object-contain sm:h-11 sm:w-11" />
              <div className="min-w-0 sm:flex-1">
                <p className="hidden text-xs text-white/70 sm:block">{isClient ? clientVisual.balanceLabel : 'Saldo disponível'}</p>
                <p className="whitespace-nowrap text-sm font-black sm:text-xl">{displayBalance} LC</p>
              </div>
              <ChevronRight className="hidden h-6 w-6 text-white/35 sm:block" />
            </div>
          </div>
        </header>

        <div className="lh-hero-headline mx-auto mt-1 max-w-[25rem] text-center sm:mt-2">
          <h1 className="text-[1.85rem] font-black leading-[1.04] tracking-[-0.045em] min-[430px]:text-[2.15rem] sm:text-5xl">
            {isClient ? clientVisual.headline.beforeHighlight : 'Toda grande jornada começa com o'} <span className="lh-hero-highlight-shimmer">{isClient ? clientVisual.headline.highlight : 'primeiro passo.'}</span>
          </h1>
        </div>

        <div className="lh-hero-level-pill mx-auto mt-3 w-fit rounded-full border border-lime-300/30 bg-lime-400/10 px-5 py-1.5 backdrop-blur-md">
          <p className="text-sm font-black uppercase tracking-[0.08em] text-lime-200 sm:text-base">{currentLevel}</p>
        </div>
        <div className="relative mx-auto min-h-[17.5rem] w-full max-w-[27rem] sm:min-h-[23rem] sm:max-w-[33rem]">
          <HeroRankAnimation medalSrc={isClient ? clientMedalImage : medalImage} medalAlt={isClient ? 'Medalha Novo Cliente' : 'Medalha Novo Helper'} className="absolute inset-0" />
        </div>
        <div className="mx-auto w-fit -translate-y-2">
          <span className="lh-hero-nivel-badge inline-flex min-w-[7.5rem] justify-center rounded-full border border-lime-300/35 bg-gradient-to-b from-lime-400 to-green-800 px-4 py-1 text-sm font-black sm:min-w-[9rem] sm:text-base">{levelLabel}</span>
        </div>

        <p className="lh-hero-description mx-auto -mt-1 max-w-[22rem] text-center text-sm font-medium leading-relaxed text-white/68 sm:max-w-[34rem] sm:text-base">
          {journeyDescription}
        </p>

        <div className="lh-hero-progress mx-auto mt-3 max-w-[45rem] rounded-2xl border border-lime-400/15 bg-black/40 px-3 py-2.5 backdrop-blur-lg sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-blue-300/20 bg-blue-500/15 text-blue-300"><ShieldCheck className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1"><p className="text-[10px] text-white/65 sm:text-xs">{isClient ? clientVisual.nextLevelLabel : 'Próximo nível'}</p><p className="truncate text-xs font-black uppercase text-lime-400 sm:text-base">{nextLevel}</p></div>
            <span className="text-lg font-black sm:text-xl">{progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]"><span className="block h-full rounded-full bg-gradient-to-r from-lime-500 to-lime-300 shadow-[0_0_14px_rgba(163,230,53,0.36)]" style={{ width: `${progressPercent}%` }} /></div>
          <p className="mt-1.5 text-center text-[10px] text-white/55 sm:text-xs">Mais {pointsRemaining} pontos para alcançar o próximo nível</p>
        </div>
      </div>
    </section>
  );
}
