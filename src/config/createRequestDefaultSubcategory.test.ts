import { describe, expect, it } from 'vitest';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import { getServiceModePolicy } from '@/config/serviceModePolicy';
import {
  assertDefaultSubcategoryMapIntegrity,
  DEFAULT_SUBCATEGORY_BY_CATEGORY,
  getDefaultSubcategoryForCategory,
} from '@/config/createRequestDefaultSubcategory';

describe('createRequestDefaultSubcategory', () => {
  it('covers every official primary category with an official subcategory', () => {
    for (const cat of SERVICE_CATEGORIES) {
      expect(DEFAULT_SUBCATEGORY_BY_CATEGORY[cat.id]).toBeTruthy();
      expect(getDefaultSubcategoryForCategory(cat.id)).toBe(DEFAULT_SUBCATEGORY_BY_CATEGORY[cat.id]);
      expect(cat.subKeys).toContain(DEFAULT_SUBCATEGORY_BY_CATEGORY[cat.id]);
    }
    expect(assertDefaultSubcategoryMapIntegrity().ok).toBe(true);
  });

  it('prefers both-capable defaults for mixed-mode categories', () => {
    expect(getServiceModePolicy('translation', getDefaultSubcategoryForCategory('translation'))).toBe('both');
    expect(getServiceModePolicy('tech', getDefaultSubcategoryForCategory('tech'))).toBe('both');
    expect(getServiceModePolicy('design', getDefaultSubcategoryForCategory('design'))).toBe('both');
    expect(getServiceModePolicy('marketing', getDefaultSubcategoryForCategory('marketing'))).toBe('both');
    expect(getServiceModePolicy('other', getDefaultSubcategoryForCategory('other'))).toBe('both');
  });

  it('does not invent ids or fall back to null for known categories', () => {
    expect(getDefaultSubcategoryForCategory('cleaning')).toBe('apartment');
    expect(getDefaultSubcategoryForCategory('moving')).toBe('small_moves');
    expect(getDefaultSubcategoryForCategory('not-a-category')).toBeNull();
    expect(getDefaultSubcategoryForCategory('')).toBeNull();
  });
});
