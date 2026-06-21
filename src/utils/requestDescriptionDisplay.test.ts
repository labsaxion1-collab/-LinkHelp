import { describe, expect, it } from 'vitest';
import { getRequestDescriptionForViewer } from '@/utils/requestDescriptionDisplay';
import { translateServiceSubcategory } from '@/utils/translateCategory';

describe('getRequestDescriptionForViewer', () => {
  it('returns original text until translation storage exists', () => {
    const result = getRequestDescriptionForViewer('urgencia. preciso para ontem', 'en');
    expect(result.display).toBe('urgencia. preciso para ontem');
    expect(result.original).toBe('urgencia. preciso para ontem');
    expect(result.isTranslated).toBe(false);
  });
});

describe('translateServiceSubcategory', () => {
  const t = (key: string) =>
    ({
      'service_subs.automotive.battery': 'Bateria descarregada',
    })[key] ?? key;

  it('maps legacy display labels to translation keys', () => {
    expect(translateServiceSubcategory('Automotive', 'Dead battery', t)).toBe('Bateria descarregada');
  });
});
