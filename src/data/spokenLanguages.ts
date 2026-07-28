/** ISO-style codes stored in profiles.spoken_languages — keep stable; extend carefully. */
export type SpokenLanguageCode =
  | 'pt'
  | 'en'
  | 'fr'
  | 'es'
  | 'ar'
  | 'zh'
  | 'hi'
  | 'it'
  | 'ht'
  | 'pa'
  | 'ja'
  | 'ko';

export type SpokenLanguageDefinition = {
  code: SpokenLanguageCode;
  labelKey: string;
  /** Native endonym for display alongside translated label when useful */
  nativeLabel: string;
};

/** Full catalog for label resolution (includes legacy codes still present in DB). */
export const SPOKEN_LANGUAGES: readonly SpokenLanguageDefinition[] = [
  { code: 'pt', labelKey: 'languages.portuguese', nativeLabel: 'Português' },
  { code: 'en', labelKey: 'languages.english', nativeLabel: 'English' },
  { code: 'fr', labelKey: 'languages.french', nativeLabel: 'Français' },
  { code: 'es', labelKey: 'languages.spanish', nativeLabel: 'Español' },
  { code: 'it', labelKey: 'languages.italian', nativeLabel: 'Italiano' },
  { code: 'ar', labelKey: 'languages.arabic', nativeLabel: 'العربية' },
  { code: 'ja', labelKey: 'languages.japanese', nativeLabel: '日本語' },
  { code: 'ko', labelKey: 'languages.korean', nativeLabel: '한국어' },
  { code: 'zh', labelKey: 'languages.mandarin', nativeLabel: '中文' },
  // Legacy / still resolvable for saved profiles (not offered in public edit UI):
  { code: 'hi', labelKey: 'languages.hindi', nativeLabel: 'हिन्दी' },
  { code: 'ht', labelKey: 'languages.haitian_creole', nativeLabel: 'Kreyòl ayisyen' },
  { code: 'pa', labelKey: 'languages.punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
] as const;

/** Approved public-edit language order (unique codes only). */
export const PUBLIC_PROFILE_SPOKEN_LANGUAGE_CODES = [
  'pt',
  'en',
  'fr',
  'es',
  'it',
  'ar',
  'ja',
  'ko',
  'zh',
] as const satisfies readonly SpokenLanguageCode[];

export type PublicProfileSpokenLanguageCode = (typeof PUBLIC_PROFILE_SPOKEN_LANGUAGE_CODES)[number];

const publicCodeSet = new Set<string>(PUBLIC_PROFILE_SPOKEN_LANGUAGE_CODES);

export const PUBLIC_PROFILE_SPOKEN_LANGUAGES: readonly SpokenLanguageDefinition[] =
  PUBLIC_PROFILE_SPOKEN_LANGUAGE_CODES.map(
    (code) => SPOKEN_LANGUAGES.find((entry) => entry.code === code)!,
  );

export type AppUiLanguageCode = 'en' | 'pt' | 'fr';

export const APP_UI_LANGUAGES: readonly { code: AppUiLanguageCode; labelKey: string }[] = [
  { code: 'en', labelKey: 'app_pages.settings_language_en' },
  { code: 'pt', labelKey: 'app_pages.settings_language_pt' },
  { code: 'fr', labelKey: 'app_pages.settings_language_fr' },
] as const;

/**
 * Legacy Portuguese labels persisted in create-request translation drafts / descriptions.
 * Keep values stable — do not change what is saved when the user picks a language.
 */
export const TRANSLATION_REQUEST_LANGUAGES: readonly {
  code: SpokenLanguageCode;
  legacyValue: string;
}[] = [
  { code: 'pt', legacyValue: 'Português' },
  { code: 'en', legacyValue: 'Inglês' },
  { code: 'fr', legacyValue: 'Francês' },
  { code: 'es', legacyValue: 'Espanhol' },
  { code: 'it', legacyValue: 'Italiano' },
  { code: 'ar', legacyValue: 'Árabe' },
] as const;

const spokenByCode = new Map(SPOKEN_LANGUAGES.map((entry) => [entry.code, entry]));
const translationLegacyByValue = new Map(
  TRANSLATION_REQUEST_LANGUAGES.map((entry) => [entry.legacyValue, entry]),
);

export function isPublicProfileSpokenLanguageCode(code: string): code is PublicProfileSpokenLanguageCode {
  return publicCodeSet.has(code);
}

/**
 * Merge UI-selected public languages with any legacy codes already stored,
 * so saving never silently deletes unsupported historical values.
 */
export function mergeSpokenLanguagesForSave(
  selectedPublicCodes: string[],
  previouslyStored: string[] | null | undefined,
): string[] {
  const selected = selectedPublicCodes.filter(isPublicProfileSpokenLanguageCode);
  const uniqueSelected = [...new Set(selected)];
  const preserved = (previouslyStored ?? []).filter(
    (code) => Boolean(code) && !isPublicProfileSpokenLanguageCode(code),
  );
  return [...uniqueSelected, ...preserved];
}

export function getSpokenLanguageLabel(
  code: string,
  t: (key: string) => string,
  options?: { showNative?: boolean },
): string {
  const def = spokenByCode.get(code as SpokenLanguageCode);
  if (!def) return code;
  const translated = t(def.labelKey);
  if (options?.showNative && def.nativeLabel && def.nativeLabel !== translated) {
    return `${translated} (${def.nativeLabel})`;
  }
  return translated;
}

export function resolveSpokenLanguageLabel(languageId: string, t: (key: string) => string): string {
  return getSpokenLanguageLabel(languageId, t);
}

/** Display label for a stored translation-request language value (legacy PT string or code). */
export function formatTranslationRequestLanguage(stored: string, t: (key: string) => string): string {
  const trimmed = stored.trim();
  if (!trimmed) return stored;
  const byLegacy = translationLegacyByValue.get(trimmed);
  if (byLegacy) return getSpokenLanguageLabel(byLegacy.code, t);
  return getSpokenLanguageLabel(trimmed, t);
}
