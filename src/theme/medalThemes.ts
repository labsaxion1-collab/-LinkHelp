import type { LevelKey, UserType } from '@/gamification/types/gamification';

/**
 * Tokens visuais por medalha/nível.
 * Fonte única para CSS variables `--medal-*` aplicadas no documentElement.
 */
export type MedalThemeTokens = {
  primary: string;
  primarySoft: string;
  primaryLight: string;
  gradient: string;
  glow: string;
  border: string;
  text: string;
  badgeBg: string;
};

export type MedalThemeId =
  | 'helper_novo'
  | 'helper_iniciante'
  | 'helper_profissional'
  | 'helper_elite'
  | 'helper_top_helper'
  | 'helper_lenda'
  | 'client_basico'
  | 'client_confiavel'
  | 'client_ouro'
  | 'client_vip'
  | 'client_elite';

export const MEDAL_CSS_VARS = {
  primary: '--medal-primary',
  primarySoft: '--medal-primary-soft',
  primaryLight: '--medal-primary-light',
  gradient: '--medal-gradient',
  glow: '--medal-glow',
  border: '--medal-border',
  text: '--medal-text',
  badgeBg: '--medal-badge-bg',
} as const;

/** Verde — Helper Novo / Cliente Básico (fallback padrão). */
export const MEDAL_THEME_GREEN: MedalThemeTokens = {
  primary: '#84cc16',
  primarySoft: 'rgba(132, 204, 22, 0.18)',
  primaryLight: '#ecfccb',
  gradient: 'linear-gradient(90deg, #65a30d 0%, #84cc16 45%, #a3e635 100%)',
  glow: '0 0 18px rgba(163, 230, 53, 0.36)',
  border: 'rgba(163, 230, 53, 0.35)',
  text: '#65a30d',
  badgeBg: 'linear-gradient(180deg, #a3e635 0%, #166534 100%)',
};

/** Azul — Helper Iniciante (confiável) / Cliente Confiável. */
export const MEDAL_THEME_BLUE: MedalThemeTokens = {
  primary: '#0047FF',
  primarySoft: 'rgba(0, 71, 255, 0.16)',
  primaryLight: '#E7EEFF',
  gradient: 'linear-gradient(90deg, #001BFF 0%, #0047FF 50%, #006DFF 100%)',
  glow: '0 0 20px rgba(0, 71, 255, 0.58)',
  border: 'rgba(0, 71, 255, 0.40)',
  text: '#003BFF',
  badgeBg: 'linear-gradient(180deg, #60a5fa 0%, #1e3a8a 100%)',
};

/** Dourado — Helper Profissional / Cliente Ouro. */
export const MEDAL_THEME_GOLD: MedalThemeTokens = {
  primary: '#d97706',
  primarySoft: 'rgba(245, 158, 11, 0.16)',
  primaryLight: '#fffbeb',
  gradient: 'linear-gradient(90deg, #b45309 0%, #d97706 45%, #fbbf24 100%)',
  glow: '0 0 18px rgba(251, 191, 36, 0.34)',
  border: 'rgba(251, 191, 36, 0.40)',
  text: '#b45309',
  badgeBg: 'linear-gradient(180deg, #fcd34d 0%, #b45309 55%, #78350f 100%)',
};

/** Roxo — Helper Elite / Cliente VIP. */
export const MEDAL_THEME_PURPLE: MedalThemeTokens = {
  primary: '#7c3aed',
  primarySoft: 'rgba(124, 58, 237, 0.16)',
  primaryLight: '#f5f3ff',
  gradient: 'linear-gradient(90deg, #6d28d9 0%, #7c3aed 45%, #c084fc 100%)',
  glow: '0 0 18px rgba(168, 85, 247, 0.38)',
  border: 'rgba(167, 139, 250, 0.40)',
  text: '#6d28d9',
  badgeBg: 'linear-gradient(180deg, #d8b4fe 0%, #7c3aed 55%, #4c1d95 100%)',
};

/** Vermelho/rosa — Top Helper. */
export const MEDAL_THEME_MAGENTA: MedalThemeTokens = {
  primary: '#ec4899',
  primarySoft: 'rgba(236, 72, 153, 0.16)',
  primaryLight: '#fdf2f8',
  gradient: 'linear-gradient(90deg, #db2777 0%, #ec4899 45%, #f0abfc 100%)',
  glow: '0 0 18px rgba(236, 72, 153, 0.40)',
  border: 'rgba(244, 114, 182, 0.42)',
  text: '#be185d',
  badgeBg: 'linear-gradient(180deg, #f9a8d4 0%, #ec4899 55%, #831843 100%)',
};

/** Verde premium — Lenda LinkHelp. */
export const MEDAL_THEME_LENDA: MedalThemeTokens = {
  primary: '#16a34a',
  primarySoft: 'rgba(22, 163, 74, 0.18)',
  primaryLight: '#dcfce7',
  gradient: 'linear-gradient(90deg, #15803d 0%, #22c55e 40%, #a3e635 100%)',
  glow: '0 0 22px rgba(34, 197, 94, 0.42)',
  border: 'rgba(74, 222, 128, 0.45)',
  text: '#15803d',
  badgeBg: 'linear-gradient(180deg, #86efac 0%, #16a34a 50%, #14532d 100%)',
};

/** Elite cliente — dourado premium. */
export const MEDAL_THEME_ELITE_GOLD: MedalThemeTokens = {
  primary: '#b77905',
  primarySoft: 'rgba(217, 119, 6, 0.16)',
  primaryLight: '#fefce8',
  gradient: 'linear-gradient(90deg, #92400e 0%, #b77905 40%, #fde68a 100%)',
  glow: '0 0 22px rgba(251, 191, 36, 0.42)',
  border: 'rgba(253, 230, 138, 0.45)',
  text: '#92400e',
  badgeBg: 'linear-gradient(180deg, #fde68a 0%, #f59e0b 45%, #92400e 100%)',
};

export const DEFAULT_MEDAL_THEME = MEDAL_THEME_GREEN;

/**
 * Temas nomeados conforme o brief (aliases de produto).
 * Mapeiam para level_key/hero_key reais do motor de gamificação.
 */
export const MEDAL_THEMES: Record<MedalThemeId, MedalThemeTokens> = {
  helper_novo: MEDAL_THEME_GREEN,
  helper_iniciante: MEDAL_THEME_BLUE,
  helper_profissional: MEDAL_THEME_GOLD,
  helper_elite: MEDAL_THEME_PURPLE,
  helper_top_helper: MEDAL_THEME_MAGENTA,
  helper_lenda: MEDAL_THEME_LENDA,
  client_basico: MEDAL_THEME_GREEN,
  client_confiavel: MEDAL_THEME_BLUE,
  client_ouro: MEDAL_THEME_GOLD,
  client_vip: MEDAL_THEME_PURPLE,
  client_elite: MEDAL_THEME_ELITE_GOLD,
};

/** Níveis de produto esperados no MVP (para testes / docs). */
export const HELPER_MEDAL_LEVELS = [
  'novo',
  'iniciante',
  'profissional',
  'elite',
  'top_helper',
  'lenda',
] as const;

export const CLIENT_MEDAL_LEVELS = [
  'basico',
  'confiavel',
  'ouro',
  'vip',
  'elite',
] as const;

/** hero_key → tema (fonte preferida quando disponível). */
const HERO_KEY_TO_THEME: Record<string, MedalThemeTokens> = {
  helper_novo: MEDAL_THEMES.helper_novo,
  helper_confiavel: MEDAL_THEMES.helper_iniciante,
  helper_profissional: MEDAL_THEMES.helper_profissional,
  helper_elite: MEDAL_THEMES.helper_elite,
  helper_top_helper: MEDAL_THEMES.helper_top_helper,
  helper_lenda: MEDAL_THEMES.helper_lenda,
  client_novo: MEDAL_THEMES.client_basico,
  client_confiavel: MEDAL_THEMES.client_confiavel,
  client_ouro: MEDAL_THEMES.client_ouro,
  client_vip: MEDAL_THEMES.client_vip,
  client_elite: MEDAL_THEMES.client_elite,
};

/** level_key + userType → tema. */
const LEVEL_KEY_TO_THEME: Record<UserType, Partial<Record<LevelKey | string, MedalThemeTokens>>> = {
  helper: {
    novo: MEDAL_THEMES.helper_novo,
    confiavel: MEDAL_THEMES.helper_iniciante,
    iniciante: MEDAL_THEMES.helper_iniciante,
    profissional: MEDAL_THEMES.helper_profissional,
    elite: MEDAL_THEMES.helper_elite,
    top_helper: MEDAL_THEMES.helper_top_helper,
    lenda: MEDAL_THEMES.helper_lenda,
  },
  client: {
    novo: MEDAL_THEMES.client_basico,
    basico: MEDAL_THEMES.client_basico,
    confiavel: MEDAL_THEMES.client_confiavel,
    ouro: MEDAL_THEMES.client_ouro,
    vip: MEDAL_THEMES.client_vip,
    elite: MEDAL_THEMES.client_elite,
    cliente_elite: MEDAL_THEMES.client_elite,
  },
};

/** Aliases soltos (sem userType) — preferir hero_key ou passar userType. */
const LOOSE_KEY_TO_THEME: Record<string, MedalThemeTokens> = {
  ...HERO_KEY_TO_THEME,
  helper_iniciante: MEDAL_THEMES.helper_iniciante,
  client_basico: MEDAL_THEMES.client_basico,
  cliente_elite: MEDAL_THEMES.client_elite,
  iniciante: MEDAL_THEMES.helper_iniciante,
  basico: MEDAL_THEMES.client_basico,
  profissional: MEDAL_THEMES.helper_profissional,
  top_helper: MEDAL_THEMES.helper_top_helper,
  lenda: MEDAL_THEMES.helper_lenda,
  ouro: MEDAL_THEMES.client_ouro,
  vip: MEDAL_THEMES.client_vip,
};

/** hero_key / alias → levelKey de produto para `data-medal-level`. */
const KEY_TO_PRODUCT_LEVEL: Record<string, string> = {
  helper_novo: 'novo',
  helper_confiavel: 'iniciante',
  helper_iniciante: 'iniciante',
  helper_profissional: 'profissional',
  helper_elite: 'elite',
  helper_top_helper: 'top_helper',
  helper_lenda: 'lenda',
  client_novo: 'basico',
  client_basico: 'basico',
  client_confiavel: 'confiavel',
  client_ouro: 'ouro',
  client_vip: 'vip',
  client_elite: 'elite',
  cliente_elite: 'elite',
  novo: 'novo',
  basico: 'basico',
  iniciante: 'iniciante',
  confiavel: 'confiavel',
  profissional: 'profissional',
  elite: 'elite',
  top_helper: 'top_helper',
  lenda: 'lenda',
  ouro: 'ouro',
  vip: 'vip',
};

let lastAppliedSignature: string | null = null;

/** Fallback de nível por papel (MVP). */
export function getDefaultMedalLevelKey(userType?: UserType | null): string {
  return userType === 'client' ? 'basico' : 'novo';
}

export function medalThemeStorageKey(userId: string, userType: UserType): string {
  return `linkhelp-medal-theme:${userId}:${userType}`;
}

/** Lê só a chave de nível/hero (sem dados sensíveis). */
export function readCachedMedalThemeKey(userId: string, userType: UserType): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(medalThemeStorageKey(userId, userType));
    const key = raw?.trim();
    return key || null;
  } catch {
    return null;
  }
}

export function writeCachedMedalThemeKey(
  userId: string,
  userType: UserType,
  themeKey: string,
): void {
  if (typeof localStorage === 'undefined') return;
  const key = themeKey.trim();
  if (!key) return;
  try {
    localStorage.setItem(medalThemeStorageKey(userId, userType), key);
  } catch {
    // Quota / private mode — ignorar.
  }
}

export function clearCachedMedalThemeKey(userId: string, userType: UserType): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(medalThemeStorageKey(userId, userType));
  } catch {
    // ignore
  }
}

/**
 * LevelKey de produto para debug (`data-medal-level`).
 * Cliente sem nível → `basico`; helper sem nível → `novo`.
 */
export function resolveProductMedalLevelKey(
  levelOrHeroKey?: string | null,
  userType?: UserType | null,
): string {
  const fallback = getDefaultMedalLevelKey(userType);
  if (!levelOrHeroKey?.trim()) return fallback;

  const key = levelOrHeroKey.trim();

  if (userType === 'helper') {
    if (key === 'confiavel' || key === 'helper_confiavel') return 'iniciante';
    if (key === 'novo' || key === 'helper_novo') return 'novo';
  }
  if (userType === 'client') {
    if (key === 'novo' || key === 'client_novo' || key === 'basico' || key === 'client_basico') {
      return 'basico';
    }
  }

  if (KEY_TO_PRODUCT_LEVEL[key]) return KEY_TO_PRODUCT_LEVEL[key];

  if (userType && LEVEL_KEY_TO_THEME[userType][key]) return key;

  return fallback;
}

export function resolveMedalTheme(
  levelOrHeroKey?: string | null,
  userType?: UserType | null,
): MedalThemeTokens {
  if (!levelOrHeroKey?.trim()) {
    return userType === 'client'
      ? MEDAL_THEMES.client_basico
      : MEDAL_THEMES.helper_novo;
  }

  const key = levelOrHeroKey.trim();

  if (HERO_KEY_TO_THEME[key]) return HERO_KEY_TO_THEME[key];

  if (userType) {
    const byType = LEVEL_KEY_TO_THEME[userType][key];
    if (byType) return byType;
  }

  if (LOOSE_KEY_TO_THEME[key]) return LOOSE_KEY_TO_THEME[key];

  if (key in MEDAL_THEMES) return MEDAL_THEMES[key as MedalThemeId];

  // Inválido → fallback por papel, sem throw.
  return userType === 'client'
    ? MEDAL_THEMES.client_basico
    : MEDAL_THEMES.helper_novo;
}

function buildApplySignature(
  productLevel: string,
  userType: UserType,
  theme: MedalThemeTokens,
): string {
  return `${userType}|${productLevel}|${theme.primary}|${theme.gradient}`;
}

/** Exposto para testes — limpa o cache de idempotência. */
export function __resetMedalThemeApplyCache(): void {
  lastAppliedSignature = null;
}

/**
 * Aplica tokens da medalha como CSS variables em `document.documentElement`.
 * Aceita `level_key`, `hero_key` ou alias de produto (ex.: `iniciante`, `basico`).
 * Idempotente: não reescreve o DOM se o nível efetivo não mudou.
 */
export function applyMedalTheme(
  levelKey?: string | null,
  userType?: UserType | null,
): MedalThemeTokens {
  const role: UserType = userType === 'client' || userType === 'helper' ? userType : 'helper';
  const theme = resolveMedalTheme(levelKey, role);
  const productLevel = resolveProductMedalLevelKey(levelKey, role);
  const signature = buildApplySignature(productLevel, role, theme);

  if (typeof document === 'undefined') return theme;

  if (lastAppliedSignature === signature) {
    const root = document.documentElement;
    // Garante data attrs mesmo se o DOM foi limpo externamente.
    if (
      root.dataset.medalLevel === productLevel &&
      root.dataset.medalRole === role
    ) {
      return theme;
    }
  }

  const root = document.documentElement;
  root.style.setProperty(MEDAL_CSS_VARS.primary, theme.primary);
  root.style.setProperty(MEDAL_CSS_VARS.primarySoft, theme.primarySoft);
  root.style.setProperty(MEDAL_CSS_VARS.primaryLight, theme.primaryLight);
  root.style.setProperty(MEDAL_CSS_VARS.gradient, theme.gradient);
  root.style.setProperty(MEDAL_CSS_VARS.glow, theme.glow);
  root.style.setProperty(MEDAL_CSS_VARS.border, theme.border);
  root.style.setProperty(MEDAL_CSS_VARS.text, theme.text);
  root.style.setProperty(MEDAL_CSS_VARS.badgeBg, theme.badgeBg);
  root.dataset.medalLevel = productLevel;
  root.dataset.medalRole = role;
  // Compat: atributo antigo usado em depuração prévia.
  root.dataset.medalTheme = productLevel;

  lastAppliedSignature = signature;
  return theme;
}

export function resetMedalTheme(): MedalThemeTokens {
  lastAppliedSignature = null;
  return applyMedalTheme('novo', 'helper');
}
