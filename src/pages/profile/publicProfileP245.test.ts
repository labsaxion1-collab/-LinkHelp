/**
 * P2.4.5 — spoken languages as compact icons + add picker (Client + Helper).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  mergeSpokenLanguagesForSave,
  PUBLIC_PROFILE_SPOKEN_LANGUAGE_CODES,
  getSpokenLanguageLabel,
} from '@/data/spokenLanguages';
import { resolveMessage } from '@/services/translationService';
import { en } from '@/translations/en';
import { pt } from '@/translations/pt';
import { fr } from '@/translations/fr';
import { ROUTES } from '@/utils/constants';

const editPath = 'src/pages/profile/PublicProfileEditPage.tsx';
const helperPublicPath = 'src/components/features/HelperPublicProfileView.tsx';
const clientPublicPath = 'src/components/features/ClientPublicProfileView.tsx';
const spokenPath = 'src/data/spokenLanguages.ts';

describe('P2.4.5 spoken language icons', () => {
  it('1–4. normal state icons-only; names in picker; + adds language', async () => {
    const src = await readFile(resolve(editPath), 'utf8');
    expect(src).toContain('data-testid="public-edit-spoken-languages"');
    expect(src).toContain('data-icons-only="true"');
    expect(src).toContain('public-edit-add-language');
    expect(src).toContain('public-edit-language-picker');
    expect(src).toContain('data-language-code={code}');
    expect(src).toContain('code.toUpperCase()');
    expect(src).toContain('getSpokenLanguageLabel(option.code, t)');
    expect(src).toContain('addLanguage');
    expect(src).not.toContain('toggleLanguage');
    expect(src).not.toContain('grid grid-cols-2 gap-2 sm:grid-cols-3');
  });

  it('5–7. stable codes; no duplicates; Mandarin without Chinese/chinês', async () => {
    expect([...PUBLIC_PROFILE_SPOKEN_LANGUAGE_CODES]).toEqual([
      'pt',
      'en',
      'fr',
      'es',
      'it',
      'ar',
      'ja',
      'ko',
      'zh',
    ]);
    expect(mergeSpokenLanguagesForSave(['pt', 'pt', 'en'], [])).toEqual(['pt', 'en']);
    expect(resolveMessage({ en, pt, fr }, 'pt', 'languages.mandarin')).toBe('Mandarim');
    expect(resolveMessage({ en, pt, fr }, 'en', 'languages.mandarin')).toBe('Mandarin');
    expect(resolveMessage({ en, pt, fr }, 'fr', 'languages.mandarin')).toBe('Mandarin');
    for (const lang of ['pt', 'en', 'fr'] as const) {
      const label = resolveMessage({ en, pt, fr }, lang, 'languages.mandarin').toLowerCase();
      expect(label).not.toMatch(/\bchinês\b|\bchinese\b|\bchinois\b/);
    }
    const t = (key: string) => resolveMessage({ en, pt, fr }, 'pt', key);
    expect(getSpokenLanguageLabel('zh', t)).toBe('Mandarim');
  });

  it('8–9. legacy preserved; edit-mode removal present', async () => {
    expect(mergeSpokenLanguagesForSave(['pt', 'en'], ['pt', 'hi', 'ht'])).toEqual([
      'pt',
      'en',
      'hi',
      'ht',
    ]);
    const spoken = await readFile(resolve(spokenPath), 'utf8');
    expect(spoken).toContain('mergeSpokenLanguagesForSave');
    const src = await readFile(resolve(editPath), 'utf8');
    expect(src).toContain('mergeSpokenLanguagesForSave');
    expect(src).toContain('public-edit-language-icons-mode');
    expect(src).toContain('removeLanguage');
    expect(src).toContain('languageIconsEditMode');
  });

  it('10–12. Client + Helper share edit page; public views still show languages; routes intact', async () => {
    const src = await readFile(resolve(editPath), 'utf8');
    expect(src).toContain('export default function PublicProfileEditPage');
    expect(src).toContain('isHelper ?');
    expect(src).toContain('spoken_languages: nextLanguages');
    expect(ROUTES.profilePublicEdit).toBe('/profile/public');
    const helper = await readFile(resolve(helperPublicPath), 'utf8');
    const client = await readFile(resolve(clientPublicPath), 'utf8');
    expect(helper).toContain('spokenLanguages');
    expect(client).toContain('spokenLanguages');
    expect(helper).toContain('getSpokenLanguageLabel');
    expect(client).toContain('getSpokenLanguageLabel');
  });
});
