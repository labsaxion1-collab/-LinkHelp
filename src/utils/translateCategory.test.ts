import { describe, expect, it } from 'vitest';
import {
  buildCanonicalJobTitle,
  parseCanonicalJobTitle,
  resolveSubcategoryId,
  translateJobTitle,
} from '@/utils/translateCategory';

const en = (key: string) => {
  const map: Record<string, string> = {
    'categories.translation': 'Translation',
    'categories.cleaning': 'Cleaning',
    'service_subs.translation.school': 'School',
    'service_subs.translation.government': 'Government',
    'service_subs.cleaning.apartment': 'Apartment',
  };
  return map[key] ?? key;
};

describe('buildCanonicalJobTitle', () => {
  it('stores category and subcategory ids', () => {
    expect(buildCanonicalJobTitle('translation', 'school')).toBe('translation:school');
    expect(buildCanonicalJobTitle('cleaning', 'apartment')).toBe('cleaning:apartment');
  });

  it('stores category only when subcategory missing', () => {
    expect(buildCanonicalJobTitle('translation', null)).toBe('translation');
  });
});

describe('parseCanonicalJobTitle', () => {
  it('parses canonical ids', () => {
    expect(parseCanonicalJobTitle('translation:school')).toEqual({
      categoryId: 'translation',
      subcategoryId: 'school',
    });
  });
});

describe('resolveSubcategoryId', () => {
  it('maps legacy portuguese labels to keys', () => {
    expect(resolveSubcategoryId('translation', 'Escola')).toBe('school');
    expect(resolveSubcategoryId('translation', 'Governo')).toBe('government');
  });
});

describe('translateJobTitle', () => {
  it('uses subcategory id over localized db title', () => {
    expect(translateJobTitle('Tradução: Escola', 'translation', 'school', en)).toBe('Translation: School');
  });

  it('resolves legacy portuguese suffix without subcategory field', () => {
    expect(translateJobTitle('Tradução: Escola', 'translation', null, en)).toBe('Translation: School');
  });

  it('translates canonical stored titles', () => {
    expect(translateJobTitle('translation:school', 'translation', null, en)).toBe('Translation: School');
  });

  it('keeps english category with localized suffix fixed via category id', () => {
    expect(translateJobTitle('Translation: Escola', 'translation', null, en)).toBe('Translation: School');
  });
});
