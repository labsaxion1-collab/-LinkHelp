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

/** Keep last resolved Hero component across remounts of the same key (refresh / SWR). */
const resolvedHeroByKey = new Map<string, HeroComponent>();

/**
 * Skeleton único até o chunk do Hero; PNGs completam por camada após montagem.
 * Mesmo heroKey não desmonta para skeleton se o componente já foi resolvido.
 */
export const GamificationHeroGate = memo(function GamificationHeroGate({
  userType,
  phase,
  heroKey,
  ...heroProps
}: Props) {
  const cached = heroKey ? resolvedHeroByKey.get(heroKey) ?? null : null;
  const [Hero, setHero] = useState<HeroComponent | null>(() =>
    phase === 'ready' ? cached : null,
  );
  const [visibleKey, setVisibleKey] = useState<string | null>(() =>
    phase === 'ready' && cached && heroKey ? heroKey : null,
  );
  const heroRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== 'ready' || !heroKey) {
      if (phase === 'loading') {
        // Keep previous Hero painted while gamification revalidates in background.
        return;
      }
      if (phase === 'error') {
        setHero(null);
        setVisibleKey(null);
      }
      return;
    }

    const fromCache = resolvedHeroByKey.get(heroKey);
    if (fromCache) {
      setHero(() => fromCache);
      setVisibleKey(heroKey);
      return;
    }

    const controller = new AbortController();
    setHero(null);
    setVisibleKey(null);
    heroPerfMark('record-resolved', heroKey);

    void loadHeroBundle(heroKey, userType, { signal: controller.signal })
      .then((Resolved) => {
        resolvedHeroByKey.set(heroKey, Resolved);
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

  if (phase === 'error' && !Hero) {
    return <GamificationHeroUnavailable userType={userType} />;
  }

  // During loading revalidation, keep last painted Hero if same key still visible.
  const heroReady = Boolean(Hero && visibleKey && (phase === 'ready' ? visibleKey === heroKey : true));

  if (!heroReady) {
    return <GamificationHeroSkeleton userType={userType} />;
  }

  return (
    <div ref={heroRootRef} className="lh-gamification-hero-progressive min-w-0">
      <Hero {...heroProps} />
    </div>
  );
});

/** Test-only */
export function resetResolvedHeroCacheForTests(): void {
  resolvedHeroByKey.clear();
}
