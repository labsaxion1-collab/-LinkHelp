import { describe, expect, it } from 'vitest';
import { SERVICE_CATEGORIES } from '@/data/serviceCategories';
import { getCategoryIconById, getCategoryLucideIcon } from '@/utils/categoryIcons';
import * as Icons from 'lucide-react';

describe('getCategoryIconById (stable category id → icon)', () => {
  it('maps tech (IT support) to Monitor', () => {
    expect(getCategoryIconById('tech')).toBe(Icons.Monitor);
  });

  it('maps renovation (home/maintenance) to Wrench', () => {
    expect(getCategoryIconById('renovation')).toBe(Icons.Wrench);
  });

  it('maps design to Palette', () => {
    expect(getCategoryIconById('design')).toBe(Icons.Palette);
  });

  it('maps beauty to Smile', () => {
    expect(getCategoryIconById('beauty')).toBe(Icons.Smile);
  });

  it('maps translation to Languages', () => {
    expect(getCategoryIconById('translation')).toBe(Icons.Languages);
  });

  it('falls back to HelpCircle for unknown category ids', () => {
    expect(getCategoryIconById('unknown_category_xyz')).toBe(Icons.HelpCircle);
    expect(getCategoryIconById('')).toBe(Icons.HelpCircle);
  });

  it('resolves by category id, not by translated display name', () => {
    expect(getCategoryIconById('tech')).toBe(Icons.Monitor);
    expect(getCategoryLucideIcon('Suporte em TI')).toBe(Icons.HelpCircle);
    expect(getCategoryLucideIcon('IT Support')).toBe(Icons.HelpCircle);
  });

  it('covers every official SERVICE_CATEGORIES id with a mapped Lucide icon', () => {
    for (const cat of SERVICE_CATEGORIES) {
      const Icon = getCategoryIconById(cat.id);
      expect(Icon).toBeTruthy();
      expect(getCategoryLucideIcon(cat.icon)).toBe(Icon);
      // `other` uses CircleHelp which Lucide may alias to HelpCircle.
      if (cat.id !== 'other') {
        expect(Icon).not.toBe(Icons.HelpCircle);
      }
    }
  });
});
