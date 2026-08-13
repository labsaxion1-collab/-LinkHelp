/**
 * P2.4.3 — primary + additional categories (updated: no artificial max of 3).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  addPublicHelperCategory,
  removePublicHelperCategory,
  splitPublicHelperCategories,
} from '@/utils/publicHelperCategories';

const editPath = 'src/pages/profile/PublicProfileEditPage.tsx';
const helperDashPath = 'src/pages/helper/HelperDashboard.tsx';
const feedPrefsPath = 'src/utils/helperCategoryPreferences.ts';

describe('P2.4.3 public helper category selection', () => {
  it('1–3. no artificial max of 3; last category cannot be removed', async () => {
    const util = await readFile(resolve('src/utils/publicHelperCategories.ts'), 'utf8');
    const src = await readFile(resolve(editPath), 'utf8');
    expect(util).not.toContain('MAX_PUBLIC_HELPER_CATEGORIES');
    expect(util).not.toContain('MAX_PUBLIC_HELPER_ADDITIONAL');
    expect(src).toContain('canAddCategory');
    expect(src).toContain('availableToAdd.length > 0');
    expect(src).toContain('public-edit-add-category');
    expect(src).toContain('removePublicHelperCategory');
    expect(removePublicHelperCategory(['cleaning'], 'cleaning')).toEqual(['cleaning']);
    const four = addPublicHelperCategory(
      addPublicHelperCategory(addPublicHelperCategory(['cleaning'], 'moving'), 'beauty'),
      'tech',
    );
    expect(four).toHaveLength(4);
  });

  it('4–5. primary is first selected; additional persist as secondary_categories', async () => {
    const src = await readFile(resolve(editPath), 'utf8');
    expect(src).toContain('primary_category: primaryCategory');
    expect(src).toContain('secondary_categories: additionalCategories');
    expect(src).toContain('splitPublicHelperCategories');
    expect(src).toContain("data-primary={isPrimary ? 'true' : 'false'}");
    expect(splitPublicHelperCategories(['cleaning', 'moving', 'beauty', 'tech']).additional).toEqual([
      'moving',
      'beauty',
      'tech',
    ]);
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
    expect(src).not.toContain('HelperCategoriesManager');
  });
});
