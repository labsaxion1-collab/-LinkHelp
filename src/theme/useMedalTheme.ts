import { useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useGamification } from '@/gamification/hooks/useGamification';
import type { UserType } from '@/gamification/types/gamification';
import {
  applyMedalTheme,
  getDefaultMedalLevelKey,
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
 * Não aplica nível padrão nem cache de outra sessão antes da gamificação resolver.
 */
export function useMedalTheme(userType?: UserType | null): UseMedalThemeResult {
  const { profile, user } = useAuth();
  const resolvedType: UserType =
    userType ?? (profile?.role === 'helper' ? 'helper' : 'client');

  const { levelKey, heroKey, loading, record } = useGamification(resolvedType);

  const theme = useMemo(() => {
    if (heroKey || levelKey) {
      return resolveMedalTheme(heroKey || levelKey!, resolvedType);
    }
    if (user?.id && loading) {
      return resolveMedalTheme(getDefaultMedalLevelKey('helper'), 'helper');
    }
    return resolveMedalTheme(getDefaultMedalLevelKey(resolvedType), resolvedType);
  }, [heroKey, levelKey, resolvedType, loading, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      applyMedalTheme(getDefaultMedalLevelKey('helper'), 'helper');
      return;
    }

    if (loading && !record) return;

    const officialKey = heroKey || levelKey;
    if (!officialKey) return;

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
