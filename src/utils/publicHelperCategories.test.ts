import { describe, expect, it } from 'vitest';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import {
  addPublicHelperCategory,
  normalizePublicHelperCategorySelection,
  removePublicHelperCategory,
  splitPublicHelperCategories,
} from '@/utils/publicHelperCategories';

describe('publicHelperCategories', () => {
  it('normalizes primary first without artificial count cap', () => {
    expect(
      normalizePublicHelperCategorySelection('cleaning', ['moving', 'beauty', 'tech', 'cleaning']),
    ).toEqual(['cleaning', 'moving', 'beauty', 'tech']);
    expect(normalizePublicHelperCategorySelection(null, ['moving'])).toEqual(['moving']);
    expect(normalizePublicHelperCategorySelection('nope', [])).toEqual(['cleaning']);
  });

  it('adds without a max-3 limit and never duplicates', () => {
    let next = addPublicHelperCategory(['cleaning'], 'moving');
    next = addPublicHelperCategory(next, 'beauty');
    next = addPublicHelperCategory(next, 'tech');
    next = addPublicHelperCategory(next, 'design');
    expect(next).toEqual(['cleaning', 'moving', 'beauty', 'tech', 'design']);
    expect(next.length).toBeGreaterThan(3);
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

  it('split maps index 0 to primary and all rest to secondary_categories', () => {
    const many = SERVICE_CATEGORIES.slice(0, 5).map((c) => c.id);
    expect(splitPublicHelperCategories(many)).toEqual({
      primary: many[0],
      additional: many.slice(1),
    });
  });
});
