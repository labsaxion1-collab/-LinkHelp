import { getSpokenLanguageLabel } from '@/data/spokenLanguages';

export type AppLanguage = 'en' | 'pt' | 'fr';

export function getNestedValue(obj: unknown, keyPath: string): unknown {
  const keys = keyPath.split('.');
  let value: unknown = obj;
  for (const k of keys) {
    if (value === undefined || value === null || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[k];
  }
  return value;
}

export function interpolate(template: string, variables?: Record<string, string | number>): string {
  if (!variables) return template;
  let result = template;
  Object.entries(variables).forEach(([varKey, varValue]) => {
    result = result.replace(`{{${varKey}}}`, String(varValue));
  });
  return result;
}

/** Last-resort label so UI never shows raw keys like `categories.some_slug` */
export function humanizeKeyPath(keyPath: string): string {
  const leaf = keyPath.includes('.') ? keyPath.slice(keyPath.lastIndexOf('.') + 1) : keyPath;
  return leaf
    .split(/[-_]/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function resolveMessage(
  dictionaries: Record<AppLanguage, unknown>,
  language: AppLanguage,
  key: string,
  variables?: Record<string, string | number>,
): string {
  let raw = getNestedValue(dictionaries[language], key);

  if (raw === undefined && language !== 'en') {
    raw = getNestedValue(dictionaries.en, key);
  }

  if (typeof raw === 'string') {
    return interpolate(raw, variables);
  }

  if (key.startsWith('categories.')) {
    return humanizeKeyPath(key);
  }

  return humanizeKeyPath(key);
}

export function resolveLanguageLabel(
  languageId: string,
  t: (key: string) => string,
): string {
  return getSpokenLanguageLabel(languageId, t);
}
