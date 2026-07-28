import { describe, expect, it } from 'vitest';
import {
  MAX_PUBLIC_HELPER_CATEGORIES,
  addPublicHelperCategory,
  normalizePublicHelperCategorySelection,
  removePublicHelperCategory,
  splitPublicHelperCategories,
} from '@/utils/publicHelperCategories';

describe('publicHelperCategories', () => {
  it('normalizes primary first and caps additional at 2', () => {
    expect(
      normalizePublicHelperCategorySelection('cleaning', ['moving', 'beauty', 'tech', 'cleaning']),
    ).toEqual(['cleaning', 'moving', 'beauty']);
    expect(normalizePublicHelperCategorySelection(null, ['moving'])).toEqual(['moving']);
    expect(normalizePublicHelperCategorySelection('nope', [])).toEqual(['cleaning']);
  });

  it('adds up to max 3 and never duplicates', () => {
    let next = addPublicHelperCategory(['cleaning'], 'moving');
    next = addPublicHelperCategory(next, 'beauty');
    next = addPublicHelperCategory(next, 'tech');
    expect(next).toEqual(['cleaning', 'moving', 'beauty']);
    expect(next).toHaveLength(MAX_PUBLIC_HELPER_CATEGORIES);
    expect(addPublicHelperCategory(['cleaning'], 'cleaning')).toEqual(['cleaning']);
  });

  it('never removes the last category; removing primary promotes next', () => {
    expect(removePublicHelperCategory(['cleaning'], 'cleaning')).toEqual(['cleaning']);
    expect(removePublicHelperCategory(['cleaning', 'moving'], 'cleaning')).toEqual(['moving']);
    expect(removePublicHelperCategory(['cleaning', 'moving', 'beauty'], 'moving')).toEqual([
      'cleaning',
      'beauty',
    ]);
  });

  it('split maps index 0 to primary and rest to secondary_categories payload', () => {
    expect(splitPublicHelperCategories(['cleaning', 'moving', 'beauty'])).toEqual({
      primary: 'cleaning',
      additional: ['moving', 'beauty'],
    });
  });
});
