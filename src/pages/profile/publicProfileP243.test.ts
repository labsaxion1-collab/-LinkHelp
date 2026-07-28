/**
 * P2.4.3 — primary + up to 2 additional categories (chips + picker).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_PUBLIC_HELPER_CATEGORIES } from '@/utils/publicHelperCategories';

const editPath = 'src/pages/profile/PublicProfileEditPage.tsx';
const helperDashPath = 'src/pages/helper/HelperDashboard.tsx';
const feedPrefsPath = 'src/utils/helperCategoryPreferences.ts';

describe('P2.4.3 public helper category chips', () => {
  it('1–3. max 3 categories; plus hidden at limit; last category cannot be removed', async () => {
    const src = await readFile(resolve(editPath), 'utf8');
    const util = await readFile(resolve('src/utils/publicHelperCategories.ts'), 'utf8');
    expect(MAX_PUBLIC_HELPER_CATEGORIES).toBe(3);
    expect(util).toContain('MAX_PUBLIC_HELPER_CATEGORIES = 3');
    expect(src).toContain('canAddCategory');
    expect(src).toContain('public-edit-add-category');
    expect(src).toContain('selectedCategories.length < MAX_PUBLIC_HELPER_CATEGORIES');
    expect(src).toContain('selectedCategories.length > 1');
    expect(src).toContain('removePublicHelperCategory');
  });

  it('4–5. primary is first selected; additional persist as secondary_categories', async () => {
    const src = await readFile(resolve(editPath), 'utf8');
    expect(src).toContain('primary_category: primaryCategory');
    expect(src).toContain('secondary_categories: additionalCategories');
    expect(src).toContain('splitPublicHelperCategories');
    expect(src).toContain("data-primary={isPrimary ? 'true' : 'false'}");
    expect(src).toContain('normalizePublicHelperCategorySelection');
  });

  it('6–7. feed preference helpers and public edit route remain intact', async () => {
    const prefs = await readFile(resolve(feedPrefsPath), 'utf8');
    const dash = await readFile(resolve(helperDashPath), 'utf8');
    const src = await readFile(resolve(editPath), 'utf8');
    expect(prefs).toContain('filterToPreferredCategoriesIfPossible');
    expect(prefs).toContain('getHelperCategoryPreferences');
    expect(dash).toContain('getHelperCategoryPreferences');
    expect(src).toContain('export default function PublicProfileEditPage');
    expect(src).toContain('FilePickerLabel');
    expect(src).toContain('PUBLIC_PROFILE_SPOKEN_LANGUAGES');
    expect(src).not.toContain('overflow-x-auto');
    expect(src).not.toContain('HelperCategoriesManager');
  });
});
