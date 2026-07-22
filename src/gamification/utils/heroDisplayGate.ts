import type { UserGamificationRecord } from '@/gamification/services/gamificationService';

export type HeroDisplayPhase = 'loading' | 'error' | 'ready';

/** When to render the dynamic rank hero (never guess level 1 while unresolved). */
export function resolveHeroDisplayPhase(input: {
  loading: boolean;
  error: boolean;
  record: UserGamificationRecord | null;
}): HeroDisplayPhase {
  if (input.loading) return 'loading';
  if (input.error || !input.record) return 'error';
  return 'ready';
}
