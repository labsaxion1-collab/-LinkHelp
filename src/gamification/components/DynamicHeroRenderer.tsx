import type { UserType } from '@/gamification/types/gamification';
import type { UserGamificationRecord } from '@/gamification/services/gamificationService';
import { DEFAULT_HERO_KEY, resolveHeroKey } from '@/gamification/config/heroKeys';
import { GamificationHeroGate } from '@/gamification/hero/GamificationHeroGate';
import type { HeroSharedProps } from '@/gamification/hero/heroLazyRegistry';
import { resolveHeroDisplayPhase } from '@/gamification/utils/heroDisplayGate';

type Props = HeroSharedProps & {
  userType: UserType;
  gamification?: UserGamificationRecord | null;
  gamificationLoading?: boolean;
  gamificationError?: boolean;
};

/**
 * Renderiza UMA única hero decidida por `gamification.heroKey` da API.
 * Lazy load por nível + skeleton único até Hero pronto.
 */
export function DynamicHeroRenderer({
  userType,
  gamification,
  gamificationLoading = false,
  gamificationError = false,
  ...heroProps
}: Props) {
  if (!DEFAULT_HERO_KEY[userType]) return null;

  const phase = resolveHeroDisplayPhase({
    loading: gamificationLoading,
    error: gamificationError,
    record: gamification ?? null,
  });

  const heroKey =
    phase === 'ready' ? resolveHeroKey(userType, gamification!.heroKey) : null;

  return (
    <GamificationHeroGate
      userType={userType}
      phase={phase}
      heroKey={heroKey}
      {...heroProps}
    />
  );
}
