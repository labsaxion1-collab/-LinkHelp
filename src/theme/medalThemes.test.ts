import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetMedalThemeApplyCache,
  applyMedalTheme,
  CLIENT_MEDAL_LEVELS,
  getDefaultMedalLevelKey,
  HELPER_MEDAL_LEVELS,
  MEDAL_CSS_VARS,
  MEDAL_THEMES,
  medalThemeStorageKey,
  readCachedMedalThemeKey,
  resolveMedalTheme,
  resolveProductMedalLevelKey,
  writeCachedMedalThemeKey,
} from '@/theme/medalThemes';

describe('medalThemes — níveis MVP', () => {
  it('tem tema válido para cada nível Helper', () => {
    for (const level of HELPER_MEDAL_LEVELS) {
      const theme = resolveMedalTheme(level, 'helper');
      expect(theme.primary).toBeTruthy();
      expect(theme.gradient).toContain('gradient');
    }
    expect(resolveMedalTheme('novo', 'helper')).toEqual(MEDAL_THEMES.helper_novo);
    expect(resolveMedalTheme('iniciante', 'helper')).toEqual(MEDAL_THEMES.helper_iniciante);
    expect(resolveMedalTheme('confiavel', 'helper')).toEqual(MEDAL_THEMES.helper_iniciante);
    expect(resolveMedalTheme('profissional', 'helper')).toEqual(MEDAL_THEMES.helper_profissional);
    expect(resolveMedalTheme('elite', 'helper')).toEqual(MEDAL_THEMES.helper_elite);
    expect(resolveMedalTheme('top_helper', 'helper')).toEqual(MEDAL_THEMES.helper_top_helper);
    expect(resolveMedalTheme('lenda', 'helper')).toEqual(MEDAL_THEMES.helper_lenda);
  });

  it('tem tema válido para cada nível Cliente', () => {
    for (const level of CLIENT_MEDAL_LEVELS) {
      const theme = resolveMedalTheme(level, 'client');
      expect(theme.primary).toBeTruthy();
    }
    expect(resolveMedalTheme('basico', 'client')).toEqual(MEDAL_THEMES.client_basico);
    expect(resolveMedalTheme('novo', 'client')).toEqual(MEDAL_THEMES.client_basico);
    expect(resolveMedalTheme('confiavel', 'client')).toEqual(MEDAL_THEMES.client_confiavel);
    expect(resolveMedalTheme('ouro', 'client')).toEqual(MEDAL_THEMES.client_ouro);
    expect(resolveMedalTheme('vip', 'client')).toEqual(MEDAL_THEMES.client_vip);
    expect(resolveMedalTheme('elite', 'client')).toEqual(MEDAL_THEMES.client_elite);
  });

  it('fallback: helper sem nível → novo; cliente sem nível → basico', () => {
    expect(getDefaultMedalLevelKey('helper')).toBe('novo');
    expect(getDefaultMedalLevelKey('client')).toBe('basico');
    expect(resolveMedalTheme(null, 'helper')).toEqual(MEDAL_THEMES.helper_novo);
    expect(resolveMedalTheme(undefined, 'client')).toEqual(MEDAL_THEMES.client_basico);
    expect(resolveMedalTheme('', 'helper')).toEqual(MEDAL_THEMES.helper_novo);
  });

  it('fallback: valor inválido não quebra e usa tema padrão do papel', () => {
    expect(resolveMedalTheme('nivel_fantasma', 'helper')).toEqual(MEDAL_THEMES.helper_novo);
    expect(resolveMedalTheme('nivel_fantasma', 'client')).toEqual(MEDAL_THEMES.client_basico);
    expect(resolveProductMedalLevelKey('xyz', 'helper')).toBe('novo');
    expect(resolveProductMedalLevelKey('xyz', 'client')).toBe('basico');
  });

  it('resolve hero_key para o tema correto', () => {
    expect(resolveMedalTheme('helper_top_helper', 'helper')).toEqual(MEDAL_THEMES.helper_top_helper);
    expect(resolveMedalTheme('client_vip', 'client')).toEqual(MEDAL_THEMES.client_vip);
    expect(resolveMedalTheme('helper_confiavel')).toEqual(MEDAL_THEMES.helper_iniciante);
  });
});

describe('applyMedalTheme — CSS vars e data attributes', () => {
  const memoryStore = new Map<string, string>();

  beforeEach(() => {
    __resetMedalThemeApplyCache();
    memoryStore.clear();

    const styleMap = new Map<string, string>();
    const dataset: Record<string, string> = {};

    vi.stubGlobal('document', {
      documentElement: {
        style: {
          setProperty: (name: string, value: string) => {
            styleMap.set(name, value);
          },
          getPropertyValue: (name: string) => styleMap.get(name) ?? '',
        },
        dataset,
      },
    });

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memoryStore.set(key, value);
      },
      removeItem: (key: string) => {
        memoryStore.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    __resetMedalThemeApplyCache();
  });

  it('atualiza as principais CSS variables', () => {
    const theme = applyMedalTheme('profissional', 'helper');
    const root = document.documentElement;

    expect(root.style.getPropertyValue(MEDAL_CSS_VARS.primary)).toBe(theme.primary);
    expect(root.style.getPropertyValue(MEDAL_CSS_VARS.primarySoft)).toBe(theme.primarySoft);
    expect(root.style.getPropertyValue(MEDAL_CSS_VARS.gradient)).toBe(theme.gradient);
    expect(root.style.getPropertyValue(MEDAL_CSS_VARS.glow)).toBe(theme.glow);
    expect(root.style.getPropertyValue(MEDAL_CSS_VARS.border)).toBe(theme.border);
    expect(root.style.getPropertyValue(MEDAL_CSS_VARS.text)).toBe(theme.text);
    expect(root.style.getPropertyValue(MEDAL_CSS_VARS.badgeBg)).toBe(theme.badgeBg);
  });

  it('define data-medal-level e data-medal-role', () => {
    applyMedalTheme('ouro', 'client');
    expect(document.documentElement.dataset.medalLevel).toBe('ouro');
    expect(document.documentElement.dataset.medalRole).toBe('client');

    applyMedalTheme('helper_lenda', 'helper');
    expect(document.documentElement.dataset.medalLevel).toBe('lenda');
    expect(document.documentElement.dataset.medalRole).toBe('helper');
  });

  it('não reescreve CSS vars se o nível efetivo não mudou', () => {
    applyMedalTheme('elite', 'helper');
    const setProperty = vi.fn();
    const root = document.documentElement as unknown as {
      style: { setProperty: typeof setProperty; getPropertyValue: (n: string) => string };
      dataset: Record<string, string>;
    };
    const prevPrimary = root.style.getPropertyValue(MEDAL_CSS_VARS.primary);
    root.style.setProperty = setProperty;

    applyMedalTheme('elite', 'helper');
    expect(setProperty).not.toHaveBeenCalled();
    expect(root.dataset.medalLevel).toBe('elite');
    expect(prevPrimary).toBe(MEDAL_THEMES.helper_elite.primary);
  });

  it('localStorage cache só guarda a chave do tema', () => {
    const key = medalThemeStorageKey('user-1', 'client');
    writeCachedMedalThemeKey('user-1', 'client', 'client_ouro');
    expect(localStorage.getItem(key)).toBe('client_ouro');
    expect(readCachedMedalThemeKey('user-1', 'client')).toBe('client_ouro');
  });
});
