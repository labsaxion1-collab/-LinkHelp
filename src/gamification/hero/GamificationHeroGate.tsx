import { memo, useEffect, useState } from 'react';
import type { UserType } from '@/gamification/types/gamification';
import { GamificationHeroSkeleton } from '@/gamification/components/GamificationHeroSkeleton';
import { GamificationHeroUnavailable } from '@/gamification/components/GamificationHeroUnavailable';
import {
  loadHeroBundle,
  type HeroComponent,
  type HeroSharedProps,
} from '@/gamification/hero/heroBundleLoader';
import { heroPerfMark } from '@/gamification/hero/heroPerformance';
import type { HeroDisplayPhase } from '@/gamification/utils/heroDisplayGate';

type Props = HeroSharedProps & {
  userType: UserType;
  phase: HeroDisplayPhase;
  heroKey: string | null;
};

/**
 * Um único skeleton contínuo: API + chunk + decode até o Hero montar.
 * Sem remount do skeleton entre fases; sem fade duplo no wrapper.
 */
export const GamificationHeroGate = memo(function GamificationHeroGate({
  userType,
  phase,
  heroKey,
  ...heroProps
}: Props) {
  const [Hero, setHero] = useState<HeroComponent | null>(null);
  const [visibleKey, setVisibleKey] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== 'ready' || !heroKey) {
      setHero(null);
      setVisibleKey(null);
      return;
    }

    const controller = new AbortController();
    setHero(null);
    setVisibleKey(null);
    heroPerfMark('record-resolved', heroKey);

    void loadHeroBundle(heroKey, userType, { signal: controller.signal })
      .then((Resolved) => {
        setHero(() => Resolved);
        setVisibleKey(heroKey);
        heroPerfMark('mount-ready', heroKey);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setHero(null);
        setVisibleKey(null);
      });

    return () => controller.abort();
  }, [phase, heroKey, userType]);

  if (phase === 'error') {
    return <GamificationHeroUnavailable userType={userType} />;
  }

  const heroReady = phase === 'ready' && Hero && visibleKey === heroKey;

  if (!heroReady) {
    return <GamificationHeroSkeleton userType={userType} />;
  }

  return <Hero {...heroProps} />;
});
