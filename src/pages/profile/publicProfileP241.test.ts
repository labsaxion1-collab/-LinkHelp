/**
 * P2.4.1 — Mandarin label, premium primary category, inline avatar upload.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import {
  filterToPreferredCategoriesIfPossible,
  getHelperCategoryPreferences,
  getJobServiceCategoryId,
} from '@/utils/helperCategoryPreferences';
import { resolveMessage } from '@/services/translationService';
import { en } from '@/translations/en';
import { pt } from '@/translations/pt';
import { fr } from '@/translations/fr';

const editPath = 'src/pages/profile/PublicProfileEditPage.tsx';
const storagePath = 'src/lib/storageUpload.ts';
const feedCardPath = 'src/components/opportunities/HelperOpportunityCard.tsx';
const helperDashPath = 'src/pages/helper/HelperDashboard.tsx';

describe('P2.4.1 public profile edit polish', () => {
  it('Mandarin visible labels are short; code remains zh', async () => {
    expect(resolveMessage({ en, pt, fr }, 'pt', 'languages.mandarin')).toBe('Mandarim');
    expect(resolveMessage({ en, pt, fr }, 'en', 'languages.mandarin')).toBe('Mandarin');
    expect(resolveMessage({ en, pt, fr }, 'fr', 'languages.mandarin')).toBe('Mandarin');
    const spoken = await readFile(resolve('src/data/spokenLanguages.ts'), 'utf8');
    expect(spoken).toContain("code: 'zh'");
    expect(spoken).toContain("'zh'");
  });

  it('1–3. Helper persists primary_category as stable ServiceCategoryId (not translated label)', async () => {
    const src = await readFile(resolve(editPath), 'utf8');
    expect(src).toContain('primary_category: primaryCategory');
    expect(src).toContain('setPrimaryCategory(category.id)');
    expect(src).toContain('data-category-id={category.id}');
    expect(src).toContain('translateCategory(category.id, t)');
    // Translation is display-only — never written as payload value.
    expect(src).not.toMatch(/primary_category:\s*translateCategory/);
    expect(SERVICE_CATEGORIES.some((c) => c.id === 'cleaning')).toBe(true);
  });

  it('4–5. feed preference matching still uses stable category ids', () => {
    const prefs = getHelperCategoryPreferences({ primary_category: 'cleaning', secondary_categories: [] }, []);
    expect(prefs.primaryCategory).toBe('cleaning');
    expect(getJobServiceCategoryId({ category: 'cleaning' })).toBe('cleaning');
    expect(getJobServiceCategoryId({ category: 'limpeza' })).toBe('cleaning');
    const jobs = [
      { id: '1', category: 'cleaning' },
      { id: '2', category: 'moving' },
      { id: '3', category: 'cleaning' },
    ];
    const filtered = filterToPreferredCategoriesIfPossible(jobs, prefs);
    expect(filtered.map((j) => j.id)).toEqual(['1', '3']);
  });

  it('6–8. Client has no category UI; secondaries hidden; HelperDashboard feed helpers unchanged', async () => {
    const src = await readFile(resolve(editPath), 'utf8');
    expect(src).toContain('{isHelper ? (');
    expect(src).not.toContain('HelperCategoriesManager');
    expect(src).not.toContain('secondary_categories');
    const dash = await readFile(resolve(helperDashPath), 'utf8');
    expect(dash).toContain('getHelperCategoryPreferences');
    expect(dash).toContain('sortJobsByHelperCategoryPreference');
    const feed = await readFile(resolve(feedCardPath), 'utf8');
    expect(feed).toContain('HelperOpportunityCard');
  });

  it('avatar: choose image uses file picker + existing upload pipeline (not Settings nav)', async () => {
    const src = await readFile(resolve(editPath), 'utf8');
    const storage = await readFile(resolve(storagePath), 'utf8');
    expect(src).toContain('FilePickerLabel');
    expect(src).toContain('accept={AVATAR_ACCEPT}');
    expect(src).toContain('image/jpeg,image/png,image/webp');
    expect(src).toContain('isAllowedAvatarFile');
    expect(src).toContain('cropSquareAvatarFromFile');
    expect(src).toContain('uploadAvatarImage');
    expect(src).toContain('avatar_url: publicUrl');
    expect(src).not.toContain('ROUTES.settings');
    expect(src).not.toContain('#avatar');
    expect(storage).toContain("avatars: 'avatars'");
    expect(storage).toContain('AVATAR_MAX_BYTES = 5 * 1024 * 1024');
  });
});
