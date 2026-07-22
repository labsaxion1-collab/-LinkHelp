import { memo, useEffect, useRef, useState } from 'react';
import type { UserType } from '@/gamification/types/gamification';
import { GamificationHeroSkeleton } from '@/gamification/components/GamificationHeroSkeleton';
import { GamificationHeroUnavailable } from '@/gamification/components/GamificationHeroUnavailable';
import {
  loadHeroBundle,
  type HeroComponent,
  type HeroSharedProps,
} from '@/gamification/hero/heroBundleLoader';
import { heroPerfMark } from '@/gamification/hero/heroPerformance';
import { useHeroProgressiveImages } from '@/gamification/hero/useHeroProgressiveImages';
import type { HeroDisplayPhase } from '@/gamification/utils/heroDisplayGate';

type Props = HeroSharedProps & {
  userType: UserType;
  phase: HeroDisplayPhase;
  heroKey: string | null;
};

/**
 * Skeleton único até o chunk do Hero; PNGs completam por camada após montagem.
 */
export const GamificationHeroGate = memo(function GamificationHeroGate({
  userType,
  phase,
  heroKey,
  ...heroProps
}: Props) {
  const [Hero, setHero] = useState<HeroComponent | null>(null);
  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  const heroRootRef = useRef<HTMLDivElement>(null);

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
        heroPerfMark('hero-mounted', heroKey);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setHero(null);
        setVisibleKey(null);
      });

    return () => controller.abort();
  }, [phase, heroKey, userType]);

  useHeroProgressiveImages(heroRootRef, visibleKey);

  if (phase === 'error') {
    return <GamificationHeroUnavailable userType={userType} />;
  }

  const heroReady = phase === 'ready' && Hero && visibleKey === heroKey;

  if (!heroReady) {
    return <GamificationHeroSkeleton userType={userType} />;
  }

  return (
    <div ref={heroRootRef} className="lh-gamification-hero-progressive min-w-0">
      <Hero {...heroProps} />
    </div>
  );
});
