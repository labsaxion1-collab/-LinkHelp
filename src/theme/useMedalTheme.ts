import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useGamification } from '@/gamification/hooks/useGamification';
import type { UserType } from '@/gamification/types/gamification';
import {
  applyMedalTheme,
  getDefaultMedalLevelKey,
  readCachedMedalThemeKey,
  resolveMedalTheme,
  writeCachedMedalThemeKey,
  type MedalThemeTokens,
} from '@/theme/medalThemes';

export type UseMedalThemeResult = {
  levelKey: string;
  heroKey: string;
  theme: MedalThemeTokens;
  loading: boolean;
};

/**
 * Lê a gamificação do usuário e aplica o tema da medalha no `documentElement`.
 * Atualiza automaticamente via realtime do `useGamification`.
 *
 * Anti-flash: aplica a última chave válida do localStorage antes do fetch oficial.
 */
export function useMedalTheme(userType?: UserType | null): UseMedalThemeResult {
  const { profile, user } = useAuth();
  const resolvedType: UserType =
    userType ?? (profile?.role === 'helper' ? 'helper' : 'client');

  const { levelKey, heroKey, loading, record } = useGamification(resolvedType);
  const cachedBootstrapped = useRef<string | null>(null);

  const theme = useMemo(
    () => resolveMedalTheme(heroKey || levelKey, resolvedType),
    [heroKey, levelKey, resolvedType],
  );

  // 1) Anti-flash: última chave salva (só nível/hero, sem dados sensíveis).
  useEffect(() => {
    if (!user?.id) {
      applyMedalTheme(getDefaultMedalLevelKey('helper'), 'helper');
      cachedBootstrapped.current = null;
      return;
    }

    const bootKey = `${user.id}:${resolvedType}`;
    if (cachedBootstrapped.current === bootKey) return;
    cachedBootstrapped.current = bootKey;

    const cached = readCachedMedalThemeKey(user.id, resolvedType);
    applyMedalTheme(cached ?? getDefaultMedalLevelKey(resolvedType), resolvedType);
  }, [user?.id, resolvedType]);

  // 2) Fonte oficial: gamificação (API + realtime).
  useEffect(() => {
    if (!user?.id) return;

    // Enquanto carrega sem record, manter cache/fallback já aplicado.
    if (loading && !record) return;

    const officialKey = heroKey || levelKey || getDefaultMedalLevelKey(resolvedType);
    applyMedalTheme(officialKey, resolvedType);
    writeCachedMedalThemeKey(user.id, resolvedType, officialKey);
  }, [user?.id, heroKey, levelKey, resolvedType, loading, record]);

  return {
    levelKey,
    heroKey,
    theme: user?.id ? theme : resolveMedalTheme(getDefaultMedalLevelKey('helper'), 'helper'),
    loading: Boolean(user?.id) && loading,
  };
}
