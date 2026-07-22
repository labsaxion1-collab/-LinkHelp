import { createElement, type ComponentType } from 'react';
import type { UserType } from '@/gamification/types/gamification';
import { DEFAULT_HERO_KEY } from '@/gamification/config/heroKeys';

/** Props compartilhadas pelos componentes de hero existentes. */
export type HeroSharedProps = {
  avatarUrl?: string | null;
  balance?: number | null;
  completedServices: number;
  connectedProfessionals: number;
  rating: number;
  satisfactionRate?: number | null;
};

export type HeroComponent = ComponentType<HeroSharedProps>;

type HeroModuleLoader = () => Promise<{ default: HeroComponent }>;

/**
 * Import dinâmico por heroKey — cada entrada vira chunk separado no build.
 * Não importar heroes estaticamente em DynamicHeroRenderer.
 */
export const HERO_LAZY_LOADERS: Record<string, HeroModuleLoader> = {
  helper_novo: () =>
    import('@/components/hero/SmartphoneHelperHero').then((m) => ({
      default: (props) => createElement(m.NewHelperHero, { ...props, accountType: 'helper' }),
    })),
  client_novo: () =>
    import('@/components/hero/SmartphoneHelperHero').then((m) => ({
      default: (props) => createElement(m.NewHelperHero, { ...props, accountType: 'client' }),
    })),
  helper_confiavel: () =>
    import('@/components/hero/HelperInicianteHero').then((m) => ({ default: m.HelperInicianteHero })),
  helper_profissional: () =>
    import('@/components/hero/HelperProfissionalHero').then((m) => ({ default: m.HelperProfissionalHero })),
  helper_elite: () =>
    import('@/components/hero/HelperEliteHero').then((m) => ({ default: m.HelperEliteHero })),
  helper_top_helper: () =>
    import('@/components/hero/TopHelperHero').then((m) => ({ default: m.TopHelperHero })),
  helper_lenda: () =>
    import('@/components/hero/HelperLendaHero').then((m) => ({ default: m.HelperLendaHero })),
  client_confiavel: () =>
    import('@/components/hero/ClientConfiavelhero').then((m) => ({ default: m.ClientConfiavelhero })),
  client_ouro: () =>
    import('@/components/hero/ClientOuroHero').then((m) => ({ default: m.ClientOuroHero })),
  client_vip: () =>
    import('@/components/hero/ClientVipHero').then((m) => ({ default: m.ClientVipHero })),
  client_elite: () =>
    import('@/components/hero/ClientEliteHero').then((m) => ({ default: m.ClientEliteHero })),
};

const inflight = new Map<string, Promise<HeroComponent>>();

export function resolveHeroLoader(heroKey: string, userType: UserType): HeroModuleLoader {
  return HERO_LAZY_LOADERS[heroKey] ?? HERO_LAZY_LOADERS[DEFAULT_HERO_KEY[userType]];
}

export function loadHeroComponent(heroKey: string, userType: UserType): Promise<HeroComponent> {
  const key = HERO_LAZY_LOADERS[heroKey] ? heroKey : DEFAULT_HERO_KEY[userType];
  const existing = inflight.get(key);
  if (existing) return existing;

  const loader = resolveHeroLoader(key, userType);
  const promise = loader().then((mod) => {
    inflight.delete(key);
    return mod.default;
  });
  inflight.set(key, promise);
  return promise;
}

/** Test-only */
export function resetHeroLazyInflightForTests(): void {
  inflight.clear();
}
