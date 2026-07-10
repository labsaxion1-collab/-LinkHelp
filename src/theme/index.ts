export {
  applyMedalTheme,
  resetMedalTheme,
  resolveMedalTheme,
  resolveProductMedalLevelKey,
  getDefaultMedalLevelKey,
  readCachedMedalThemeKey,
  writeCachedMedalThemeKey,
  medalThemeStorageKey,
  DEFAULT_MEDAL_THEME,
  MEDAL_THEMES,
  MEDAL_CSS_VARS,
  HELPER_MEDAL_LEVELS,
  CLIENT_MEDAL_LEVELS,
  type MedalThemeTokens,
  type MedalThemeId,
} from '@/theme/medalThemes';

export { useMedalTheme, type UseMedalThemeResult } from '@/theme/useMedalTheme';
export { MedalThemeBridge } from '@/theme/MedalThemeBridge';
