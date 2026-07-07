import type { ReactNode } from 'react';
import type { UserType } from '@/gamification/types/gamification';
import {
  GamificationLevelButton,
  GamificationProgressCard,
  type HeroBadgeVariant,
} from '@/gamification/components/GamificationProgressCard';

type Props = {
  userType: UserType;
  levelLabel: string;
  description: string;
  headline: ReactNode;
  medal: ReactNode;
  badgeVariant?: HeroBadgeVariant;
  medalMinHeightClass?: string;
};

/**
 * Corpo padrão das heroes com gamificação — mesmo layout da hero Cliente Iniciante:
 * headline centralizado, medalha à esquerda + descrição à direita, botão de nível e card de progresso.
 */
export function GamificationHeroBody({
  userType,
  levelLabel,
  description,
  headline,
  medal,
  badgeVariant = 'verde',
  medalMinHeightClass = 'min-h-[9.75rem] min-[390px]:min-h-[11rem] sm:min-h-[14.5rem]',
}: Props) {
  return (
    <>
      <div className="lh-hero-headline mx-auto mt-1 max-w-[25rem] text-center sm:mt-2">{headline}</div>

      <div className="mx-auto -mt-2 grid w-full max-w-[41rem] grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] items-center gap-1 sm:-mt-1 sm:gap-5">
        <div className={`relative min-w-0 ${medalMinHeightClass}`}>{medal}</div>
        <p className="lh-hero-description min-w-0 pr-1 text-left text-[11px] font-medium leading-[1.7] text-white/68 min-[390px]:text-xs sm:pr-3 sm:text-base sm:leading-relaxed">
          {description}
        </p>
      </div>

      <GamificationLevelButton userType={userType} label={levelLabel} badgeVariant={badgeVariant} />
      <GamificationProgressCard
        userType={userType}
        variant="hero"
        className="lh-hero-progress mx-auto mt-3 max-w-[45rem]"
      />
    </>
  );
}
