/**
 * P2.4.4 — selected categories as icons only; unlimited add; picker shows names.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  addPublicHelperCategory,
  normalizePublicHelperCategorySelection,
  removePublicHelperCategory,
  splitPublicHelperCategories,
} from '@/utils/publicHelperCategories';
import {
  filterToPreferredCategoriesIfPossible,
  getHelperCategoryPreferences,
  sortJobsByHelperCategoryPreference,
} from '@/utils/helperCategoryPreferences';

const editPath = 'src/pages/profile/PublicProfileEditPage.tsx';
const utilPath = 'src/utils/publicHelperCategories.ts';
const feedPrefsPath = 'src/utils/helperCategoryPreferences.ts';
const helperDashPath = 'src/pages/helper/HelperDashboard.tsx';

describe('P2.4.4 icon-only helper categories (unlimited)', () => {
  it('1–3. normal state is icons-only; names live in picker; + adds categories', async () => {
    const src = await readFile(resolve(editPath), 'utf8');
    expect(src).toContain('data-icons-only="true"');
    expect(src).toContain('overflow-x-auto');
    expect(src).toContain('public-edit-category-picker');
    expect(src).toContain('public-edit-add-category');
    expect(src).toContain('translateCategory(cat.id, t)');
    expect(src).toContain('data-picker-selected');
    // Chip name label removed from normal strip (picker still translates).
    expect(src).not.toMatch(/max-w-\[7\.5rem\].*translateCategory\(categoryId/);
    expect(src).not.toContain('helper_categories.primary_badge');
  });

  it('4–5. no max-3 limit; duplicates rejected', async () => {
    const util = await readFile(resolve(utilPath), 'utf8');
    expect(util).not.toContain('MAX_PUBLIC_HELPER_CATEGORIES');
    expect(util).not.toMatch(/\.slice\(0,\s*3\)/);
    let next = ['cleaning' as const];
    for (const id of ['moving', 'beauty', 'tech', 'design', 'pet'] as const) {
      next = addPublicHelperCategory(next, id);
    }
    expect(next).toHaveLength(6);
    expect(addPublicHelperCategory(next, 'cleaning')).toEqual(next);
  });

  it('6–8. primary / secondary persistence and primary removal promotion', () => {
    const split = splitPublicHelperCategories(['cleaning', 'moving', 'beauty', 'tech']);
    expect(split.primary).toBe('cleaning');
    expect(split.additional).toEqual(['moving', 'beauty', 'tech']);
    expect(removePublicHelperCategory(['cleaning', 'moving', 'beauty'], 'cleaning')).toEqual([
      'moving',
      'beauty',
    ]);
    expect(
      normalizePublicHelperCategorySelection('tech', ['cleaning', 'moving', 'beauty', 'tech']),
    ).toEqual(['tech', 'cleaning', 'moving', 'beauty']);
  });

  it('9–10. feed uses all preferred categories; matching helpers unchanged', async () => {
    const prefsSrc = await readFile(resolve(feedPrefsPath), 'utf8');
    const dash = await readFile(resolve(helperDashPath), 'utf8');
    expect(prefsSrc).toContain('export function getHelperCategoryPreferences');
    expect(prefsSrc).toContain('export function filterToPreferredCategoriesIfPossible');
    expect(prefsSrc).toContain('export function sortJobsByHelperCategoryPreference');
    expect(dash).toContain('getHelperCategoryPreferences');
    expect(dash).toContain('filterToPreferredCategoriesIfPossible');
    expect(dash).toContain('sortJobsByHelperCategoryPreference');

    const prefs = getHelperCategoryPreferences(
      {
        primary_category: 'cleaning',
        secondary_categories: ['moving', 'beauty', 'tech', 'design'],
      },
      [],
    );
    expect(prefs.primaryCategory).toBe('cleaning');
    expect(prefs.secondaryCategories).toEqual(['moving', 'beauty', 'tech', 'design']);
    const jobs = [
      { id: 'a', category: 'pet' },
      { id: 'b', category: 'beauty' },
      { id: 'c', category: 'cleaning' },
      { id: 'd', category: 'tech' },
      { id: 'e', category: 'outdoor' },
    ];
    const filtered = filterToPreferredCategoriesIfPossible(jobs, prefs);
    expect(filtered.map((j) => j.id).sort()).toEqual(['b', 'c', 'd']);
    const sorted = sortJobsByHelperCategoryPreference(filtered, prefs);
    expect(sorted[0].id).toBe('c');
  });

  it('11. Client edit path has no category strip', async () => {
    const src = await readFile(resolve(editPath), 'utf8');
    expect(src).toContain('{isHelper ? (');
    expect(src).toContain('public-edit-primary-category');
  });
});
