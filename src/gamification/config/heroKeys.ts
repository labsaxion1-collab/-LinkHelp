// Resolução pura do heroKey — separada do DynamicHeroRenderer para ser
// testável sem carregar os componentes de hero (Remotion, assets, etc.).

import type { UserType } from '../types/gamification';
import { HELPER_LEVELS } from './helperLevels';
import { CLIENT_LEVELS } from './clientLevels';

/** Todas as hero keys conhecidas hoje (derivadas dos configs de nível). */
export const KNOWN_HERO_KEYS: readonly string[] = [
  ...HELPER_LEVELS.map((level) => level.heroKey),
  ...CLIENT_LEVELS.map((level) => level.heroKey),
];

/** Hero de nível 1 de cada papel — fallback quando não há gamification data. */
export const DEFAULT_HERO_KEY: Record<UserType, string> = {
  helper: HELPER_LEVELS[0].heroKey,
  client: CLIENT_LEVELS[0].heroKey,
};

/**
 * Decide qual hero key renderizar. Sempre retorna exatamente UMA key válida:
 * - sem gamification data → hero de nível 1 do papel;
 * - heroKey desconhecida (registro antigo/corrompido) → hero de nível 1.
 *
 * Skins futuras (ex.: 'helper_lenda_azul', 'hero_natal') passam a ser
 * conhecidas quando entrarem nos configs/registry — nenhuma tela muda.
 */
export function resolveHeroKey(userType: UserType, heroKey?: string | null): string {
  const fallback = DEFAULT_HERO_KEY[userType];
  if (!heroKey || !KNOWN_HERO_KEYS.includes(heroKey)) return fallback;
  return heroKey;
}
