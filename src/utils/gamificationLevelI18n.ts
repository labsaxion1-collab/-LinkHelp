import type { UserType } from '@/gamification/types/gamification';

/**
 * Maps gamification levelKey → official ranking.* translation keys.
 * Helper level `confiavel` is presented as product “Iniciante” / Beginner Help.
 */
export function gamificationLevelLabelKey(userType: UserType, levelKey: string): string {
  if (userType === 'helper') {
    const map: Record<string, string> = {
      novo: 'ranking.helper.novo_helper',
      confiavel: 'ranking.helper.iniciante',
      profissional: 'ranking.helper.profissional',
      elite: 'ranking.helper.elite',
      top_helper: 'ranking.helper.top_helper',
      lenda: 'ranking.helper.lenda',
    };
    return map[levelKey] ?? 'ranking.helper.novo_helper';
  }

  const map: Record<string, string> = {
    novo: 'ranking.client.novo_cliente',
    confiavel: 'ranking.client.confiavel',
    ouro: 'ranking.client.ouro',
    vip: 'ranking.client.vip',
    elite: 'ranking.client.cliente_elite',
  };
  return map[levelKey] ?? 'ranking.client.novo_cliente';
}

export function translateGamificationLevelName(
  userType: UserType,
  levelKey: string,
  t: (key: string) => string,
): string {
  return t(gamificationLevelLabelKey(userType, levelKey));
}
