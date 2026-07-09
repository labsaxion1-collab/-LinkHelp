import { ChevronRight, Sparkles } from 'lucide-react';

import backgroundImage from '@/assets/hero/backgrounds/helper/bg-verde.png';
import medalImage from '@/assets/hero/medals/helper/novo helper.png';
import clientMedalImage from '@/assets/hero/medals/client/novo cliente.png';
import particlesImage from '@/assets/hero/particles/particulas.png';
import { HeroRankAnimation } from '@/components/hero/HeroRankAnimation';
import { GamificationHeroBody } from '@/components/hero/GamificationHeroBody';
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

export function NewHelperHero({ accountType = 'helper', balance }: Props) {
  const displayBalance = balance == null ? '—' : Math.max(0, Math.round(balance)).toLocaleString('pt-BR');
  const isClient = accountType === 'client';
  const clientVisual = CLIENT_BEGINNER_LEVEL_VISUAL;
  const currentLevel = isClient ? clientVisual.currentLevel : 'Novo Helper';
  const journeyDescription = isClient
    ? clientVisual.description
    : 'Continue aprendendo, oferecendo excelentes serviços e conquistando a confiança dos clientes.';
  const journeyEyebrow = isClient ? clientVisual.journeyEyebrow : 'Sua jornada começa aqui';

  return (
    <section className={`relative left-1/2 isolate mb-4 w-[100dvw] max-w-none -translate-x-1/2 overflow-hidden border-0 bg-[#020804] text-white shadow-none lg:left-auto lg:w-full lg:translate-x-0 lg:rounded-[1.75rem] lg:shadow-[0_22px_58px_rgba(0,20,7,0.32)] ${isClient ? '' : 'lh-helper-hero'}`}>
      <img src={backgroundImage} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-95" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(99,230,28,0.2),transparent_34%),linear-gradient(180deg,rgba(0,5,2,0.91),rgba(1,12,4,0.66)_36%,rgba(0,5,2,0.95)_82%)]" />
      <img src={particlesImage} alt="" aria-hidden="true" className="lh-hero-particles pointer-events-none absolute inset-0 h-full w-full object-cover mix-blend-screen" />

      <div className="relative z-10 px-3 pb-3 pt-3 sm:px-8 sm:pb-5 sm:pt-5">
        <header className="flex items-center justify-between gap-3">
          <p className={`lh-hero-tag inline-flex min-w-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.13em] sm:text-xs sm:tracking-[0.18em] ${isClient ? 'text-lime-300' : 'rounded-full border border-lime-300/20 bg-black/55 px-2.5 py-1 text-lime-300 shadow-[0_6px_22px_rgba(0,0,0,0.42),0_0_16px_rgba(163,230,53,0.12)] backdrop-blur-md'}`}>
            <Sparkles className="lh-hero-sparkle-icon h-3.5 w-3.5 shrink-0" /> {journeyEyebrow}
          </p>
          <div className="lh-hero-balance flex min-w-0 items-center">
            <div className={`flex min-w-0 items-center gap-1.5 rounded-full px-2 py-1.5 backdrop-blur-md sm:min-w-[15rem] sm:gap-3 sm:px-5 sm:py-2.5 ${isClient ? 'border border-lime-400/20 bg-black/30' : 'border border-white/20 bg-black/65 shadow-[0_8px_28px_rgba(0,0,0,0.48)]'}`}>
              <img src={BRAND.linkCreditCoin} alt="" className="h-8 w-8 shrink-0 object-contain sm:h-11 sm:w-11" />
              <div className="min-w-0 sm:flex-1">
                <p className="hidden text-xs text-white/70 sm:block">{isClient ? clientVisual.balanceLabel : 'Saldo disponível'}</p>
                <p className={`whitespace-nowrap text-sm font-black sm:text-xl ${isClient ? '' : 'text-white drop-shadow-[0_1px_5px_rgba(0,0,0,0.9)]'}`}>{displayBalance} LC</p>
              </div>
              <ChevronRight className="hidden h-6 w-6 text-white/35 sm:block" />
            </div>
          </div>
        </header>

        <GamificationHeroBody
          userType={accountType}
          levelLabel={currentLevel}
          description={journeyDescription}
          badgeVariant="verde"
          headline={
            <h1 className={`text-[1.85rem] font-black leading-[1.04] tracking-[-0.045em] min-[430px]:text-[2.15rem] sm:text-5xl ${isClient ? '' : 'text-white [text-shadow:0_3px_18px_rgba(0,0,0,0.95)]'}`}>
              {isClient ? clientVisual.headline.beforeHighlight : 'Toda grande jornada começa com o'}{' '}
              <span className="lh-hero-highlight-shimmer">{isClient ? clientVisual.headline.highlight : 'primeiro passo.'}</span>
            </h1>
          }
          medal={
            <HeroRankAnimation
              medalSrc={isClient ? clientMedalImage : medalImage}
              medalAlt={isClient ? 'Medalha Novo Cliente' : 'Medalha Novo Helper'}
              className="absolute inset-0 scale-[1.12] sm:scale-[1.09]"
            />
          }
        />
      </div>
    </section>
  );
}
