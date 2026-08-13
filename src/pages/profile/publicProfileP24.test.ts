/**
 * P2.4 — simplified public profile edit (languages, primary category, no preview).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  mergeSpokenLanguagesForSave,
  PUBLIC_PROFILE_SPOKEN_LANGUAGE_CODES,
  PUBLIC_PROFILE_SPOKEN_LANGUAGES,
  getSpokenLanguageLabel,
} from '@/data/spokenLanguages';
import { en } from '@/translations/en';
import { pt } from '@/translations/pt';
import { fr } from '@/translations/fr';
import { resolveMessage } from '@/services/translationService';
import { ROUTES } from '@/utils/constants';

const editPath = 'src/pages/profile/PublicProfileEditPage.tsx';
const heroPath = 'src/components/reputation/PublicProfileHero.tsx';
const helperPublicPath = 'src/components/features/HelperPublicProfileView.tsx';
const feedCardPath = 'src/components/opportunities/HelperOpportunityCard.tsx';

describe('P2.4 public profile edit simplification', () => {
  it('1–3. public edit language list is exactly the approved set with one Italian and Mandarin', () => {
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
    expect(PUBLIC_PROFILE_SPOKEN_LANGUAGES.map((l) => l.code)).toEqual([
      ...PUBLIC_PROFILE_SPOKEN_LANGUAGE_CODES,
    ]);
    expect(PUBLIC_PROFILE_SPOKEN_LANGUAGE_CODES.filter((c) => c === 'it')).toHaveLength(1);
    expect(resolveMessage({ en, pt, fr }, 'pt', 'languages.mandarin')).toBe('Mandarim');
    expect(resolveMessage({ en, pt, fr }, 'en', 'languages.mandarin')).toBe('Mandarin');
    expect(resolveMessage({ en, pt, fr }, 'fr', 'languages.mandarin')).toBe('Mandarin');
    const t = (key: string) => resolveMessage({ en, pt, fr }, 'pt', key);
    expect(getSpokenLanguageLabel('zh', t)).toBe('Mandarim');
  });

  it('4. mergeSpokenLanguagesForSave preserves legacy codes not shown in the UI', () => {
    expect(mergeSpokenLanguagesForSave(['pt', 'en'], ['pt', 'hi', 'ht'])).toEqual(['pt', 'en', 'hi', 'ht']);
    expect(mergeSpokenLanguagesForSave(['fr'], ['pa'])).toEqual(['fr', 'pa']);
    expect(mergeSpokenLanguagesForSave(['it', 'it'], [])).toEqual(['it']);
  });

  it('8–11. preview removed; photo, bio, and save remain', async () => {
    const src = await readFile(resolve(editPath), 'utf8');
    expect(src).not.toContain('PublicProfilePreviewCard');
    expect(src).not.toContain('section_public_preview');
    expect(src).not.toContain('view_public');
    expect(src).toContain('settings_avatar_choose');
    expect(src).toContain('FilePickerLabel');
    expect(src).toContain('uploadAvatarImage');
    expect(src).not.toContain("ROUTES.settings}#avatar");
    expect(src).toContain('profile_page.bio_label');
    expect(src).toContain('profile_page.public_edit_save');
    expect(src).toContain('savePublicProfile');
  });

  it('5–7. Helper primary category only; Client has no helper categories', async () => {
    const src = await readFile(resolve(editPath), 'utf8');
    expect(src).toContain('helper_categories.primary_label');
    expect(src).toContain('data-category-id={categoryId}');
    expect(src).toContain('isHelper ?');
    expect(src).not.toContain('HelperCategoriesManager');
    expect(src).toContain('secondary_categories: additionalCategories');
    expect(src).toContain('PUBLIC_PROFILE_SPOKEN_LANGUAGES');
    expect(src).toContain('public-edit-spoken-languages');
    const languagesIdx = src.indexOf('public-edit-spoken-languages');
    const helperCatIdx = src.indexOf('helper_categories.primary_label');
    expect(languagesIdx).toBeGreaterThan(0);
    expect(helperCatIdx).toBeGreaterThan(languagesIdx);
  });

  it('12–14. edit route intact; public profile views and feed untouched by this page rewrite', async () => {
    expect(ROUTES.profilePublicEdit).toBe('/profile/public');
    const routes = await readFile(resolve('src/routes/AppRoutes.tsx'), 'utf8');
    expect(routes).toContain('ROUTES.profilePublicEdit');
    const hero = await readFile(resolve(heroPath), 'utf8');
    const helperPublic = await readFile(resolve(helperPublicPath), 'utf8');
    const feed = await readFile(resolve(feedCardPath), 'utf8');
    expect(hero).toContain('data-testid="public-profile-medal"');
    expect(helperPublic).toContain('export function HelperPublicProfileView');
    expect(feed).toContain('HelperOpportunityCard');
  });
});
