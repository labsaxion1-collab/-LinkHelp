import type { ComponentType } from 'react';
import { NewHelperHero } from '@/components/hero/SmartphoneHelperHero';
import { HelperInicianteHero } from '@/components/hero/HelperInicianteHero';
import { HelperProfissionalHero } from '@/components/hero/HelperProfissionalHero';
import { HelperEliteHero } from '@/components/hero/HelperEliteHero';
import { TopHelperHero } from '@/components/hero/TopHelperHero';
import { HelperLendaHero } from '@/components/hero/HelperLendaHero';
import { ClientConfiavelhero } from '@/components/hero/ClientConfiavelhero';
import { ClientOuroHero } from '@/components/hero/ClientOuroHero';
import { ClientVipHero } from '@/components/hero/ClientVipHero';
import { ClientEliteHero } from '@/components/hero/ClientEliteHero';
import type { UserType } from '@/gamification/types/gamification';
import type { UserGamificationRecord } from '@/gamification/services/gamificationService';
import { DEFAULT_HERO_KEY, resolveHeroKey } from '@/gamification/config/heroKeys';

/** Props compartilhadas pelos componentes de hero existentes. */
type HeroSharedProps = {
  avatarUrl?: string | null;
  balance?: number | null;
  completedServices: number;
  connectedProfessionals: number;
  rating: number;
  satisfactionRate?: number | null;
};

/**
 * Registry de heroes por heroKey — a ÚNICA fonte da verdade visual.
 *
 * `gamification.heroKey` decide qual hero renderizar. Skins futuras
 * (ex.: 'helper_lenda_azul', 'hero_natal', 'hero_founder') entram aqui
 * como novas chaves, sem alterar nenhuma tela.
 */
const HERO_REGISTRY: Record<string, ComponentType<HeroSharedProps>> = {
  // Helper
  helper_novo: (props) => <NewHelperHero accountType="helper" {...props} />,
  helper_confiavel: HelperInicianteHero,
  helper_profissional: HelperProfissionalHero,
  helper_elite: HelperEliteHero,
  helper_top_helper: TopHelperHero,
  helper_lenda: HelperLendaHero,
  // Cliente
  client_novo: (props) => <NewHelperHero accountType="client" {...props} />,
  client_confiavel: ClientConfiavelhero,
  client_ouro: ClientOuroHero,
  client_vip: ClientVipHero,
  client_elite: ClientEliteHero,
};

type Props = HeroSharedProps & {
  userType: UserType;
  gamification?: UserGamificationRecord | null;
};

/**
 * Renderiza UMA única hero decidida por `gamification.heroKey`.
 * Fallbacks: sem gamification ou heroKey desconhecida → hero de nível 1
 * do papel; userType inválido → null.
 */
export function DynamicHeroRenderer({ userType, gamification, ...heroProps }: Props) {
  if (!DEFAULT_HERO_KEY[userType]) return null;

  const heroKey = resolveHeroKey(userType, gamification?.heroKey);
  const Hero = HERO_REGISTRY[heroKey] ?? HERO_REGISTRY[DEFAULT_HERO_KEY[userType]];

  return <Hero {...heroProps} />;
}
