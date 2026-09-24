import { describe, it, expect } from 'vitest';
import { SERVICE_CATEGORIES } from './serviceCategories';
import { REQUEST_CATEGORY_GROUPS, getRequestGroupCategories, getRequestCategoryGroup } from './requestCategoryGroups';
import { filterValidSkillKeys } from './helperSkillsCatalog';
import { getHelperCategoryPreferences } from '@/utils/helperCategoryPreferences';
import { jobMatchesHelperCategories } from '@/utils/helperFeedEligibility';
import { appendOtherServiceType, isOtherServiceTypeValid } from '@/utils/requestOtherService';
import { requestRowToJob } from '@/services/supabase/mappers';
import type { RequestRow } from '@/types/database';
import { pt } from '@/translations/pt';
import { en } from '@/translations/en';
import { fr } from '@/translations/fr';

describe('request display groups preserve the service taxonomy', () => {
  it('exposes eight main groups and the existing other fallback', () => {
    expect(REQUEST_CATEGORY_GROUPS.map(g => g.id)).toEqual(['cleaning', 'repairs', 'moving', 'home_outdoor', 'automotive', 'pets', 'digital', 'personal', 'other']);
  });
  it('covers every original category and all 78 services exactly once', () => {
    const categories = REQUEST_CATEGORY_GROUPS.flatMap(g => getRequestGroupCategories(g.id));
    expect(categories.map(c => c.id).sort()).toEqual(SERVICE_CATEGORIES.map(c => c.id).sort());
    const pairs = categories.flatMap(c => c.subKeys.map(sub => c.id + ':' + sub));
    expect(pairs).toHaveLength(78);
    expect(new Set(pairs).size).toBe(78);
  });
  it.each(REQUEST_CATEGORY_GROUPS)('has translations and only related original categories for $id', group => {
    expect(getRequestGroupCategories(group.id).map(c => c.id)).toEqual([...group.categories]);
    for (const locale of [pt, en, fr]) expect(locale.request_groups[group.id]).toBeTruthy();
  });
  it.each([['Montagem e instalação', 'repairs'], ['Higienização', 'cleaning'], ['delivery', 'moving'], ['snow', 'home_outdoor'], ['translation', 'personal'], ['unknown-old-category', 'other'], ['', 'other']])('derives display group for legacy %s without a migration', (category, group) => {
    expect(getRequestCategoryGroup(category)).toBe(group);
  });
  it('derives the same group from all current PT/EN/FR category labels', () => {
    for (const cat of SERVICE_CATEGORIES) for (const locale of [pt, en, fr]) {
      expect(getRequestCategoryGroup(locale.categories[cat.id])).toBe(getRequestCategoryGroup(cat.id));
    }
  });
  it('keeps multiple Helper specialties and specific category matching', () => {
    const keys = filterValidSkillKeys(['cleaning:house', 'assembly:ikea', 'outdoor:garden']);
    expect(keys).toHaveLength(3);
    const prefs = getHelperCategoryPreferences({}, keys);
    for (const category of ['cleaning', 'assembly', 'outdoor', 'Montagem e instalação']) expect(jobMatchesHelperCategories({ category }, prefs)).toBe(true);
    expect(jobMatchesHelperCategories({ category: 'renovation' }, prefs)).toBe(false);
    expect(jobMatchesHelperCategories({ category: 'repairs' }, prefs)).toBe(false);
  });
  it('loads old and unknown rows unchanged, without a group or subcategory', () => {
    for (const category of ['Montagem e instalação', 'unknown-old-category']) {
      const row = { id: 'old', client_id: 'client', title: 'Old task', category, description: 'Keep this', subcategory: null, created_at: '2026-01-01', status: 'open', location: 'City' } as RequestRow;
      const job = requestRowToJob(row, { id: 'client', name: 'Client', avatar_url: null });
      expect(job.category).toBe(category);
      expect(job.subcategory).toBeNull();
      expect(job.id).toBe('old');
      getRequestCategoryGroup(job.category);
      expect(row.category).toBe(category);
    }
  });
});

describe('other service', () => {
  it.each(['', ' ', 'x'.repeat(81), 'line\nline', 'email@example.com'])('rejects missing, excessive, multiline or contact input: %s', value => {
    expect(isOtherServiceTypeValid(value)).toBe(false);
  });
  it('adds plain text to the existing description, without creating category IDs', () => {
    expect(appendOtherServiceType('Details', 'other', '  Organizar livros  ', 'Tipo de ajuda')).toBe('Details\n\nTipo de ajuda: Organizar livros');
    expect(appendOtherServiceType('Details', 'assembly', 'Old other value', 'Tipo')).toBe('Details');
  });
});
