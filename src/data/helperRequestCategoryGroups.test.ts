import { describe, expect, it } from 'vitest';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import {
  HELPER_CATEGORY_GROUPS,
  helperCategoryGroupIdsFromCategories,
  removeHelperCategoryGroup,
  toggleHelperCategoryGroup,
} from './helperRequestCategoryGroups';

describe('Helper request category groups', () => {
  it('shows the eight request groups without the request-only fallback', () => {
    expect(HELPER_CATEGORY_GROUPS).toHaveLength(8);
    expect(HELPER_CATEGORY_GROUPS.map((group) => group.id)).not.toContain('other');
  });

  it('covers every professional category without changing IDs', () => {
    const grouped = new Set(HELPER_CATEGORY_GROUPS.flatMap((group) => group.categories));
    const professional = SERVICE_CATEGORIES.map((category) => category.id).filter((id) => id !== 'other');
    expect([...grouped].sort()).toEqual(professional.sort());
  });

  it('derives groups from legacy category selections', () => {
    expect(helperCategoryGroupIdsFromCategories(['assembly', 'design', 'translation'])).toEqual([
      'repairs',
      'digital',
      'personal',
    ]);
  });

  it('adds all existing internal categories for a selected group', () => {
    expect(toggleHelperCategoryGroup(['cleaning'], 'digital')).toEqual([
      'cleaning',
      'tech',
      'design',
      'marketing',
    ]);
  });

  it('removes a group without allowing an empty Helper profile', () => {
    expect(removeHelperCategoryGroup(['cleaning', 'sanitization', 'pet'], 'cleaning')).toEqual(['pet']);
    expect(removeHelperCategoryGroup(['pet'], 'pets')).toEqual(['pet']);
  });
});
