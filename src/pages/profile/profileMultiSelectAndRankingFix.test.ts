/**
 * Spoken languages multi-select + category sheet stacking contracts.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLIENT_LEVELS } from '@/gamification/config/clientLevels';
import { computeClientScore } from '@/gamification/engines/scoreEngine';
import { determineLevel } from '@/gamification/engines/levelEngine';
import type { GamificationStats } from '@/gamification/types/gamification';
import { resolveMessage } from '@/services/translationService';
import { en } from '@/translations/en';
import { pt } from '@/translations/pt';
import { fr } from '@/translations/fr';

const emptyStats: GamificationStats = {
  totalCompleted: 0,
  avgRating: 0,
  responseRate: 0,
  profilePct: 0,
  cancelCount: 0,
  complaintCount: 0,
  applicationsCount: 0,
  publishedOrdersCount: 0,
  hireRate: 0,
};

describe('spoken language multi-select sheet', () => {
  it('keeps picker open on toggle; confirms via dedicated CTA; cancel does not use addLanguage', async () => {
    const src = await readFile(resolve('src/pages/profile/PublicProfileEditPage.tsx'), 'utf8');
    expect(src).toContain('languageDraft');
    expect(src).toContain('toggleLanguageDraft');
    expect(src).toContain('confirmLanguageDraft');
    expect(src).toContain('closeLanguagePicker');
    expect(src).toContain('public-edit-confirm-languages');
    expect(src).toContain('public-edit-cancel-languages');
    expect(src).not.toContain('setLanguagePickerOpen(false);\n    setLanguageIconsEditMode');
    expect(src).toContain('ProfileMultiSelectSheet');
  });

  it('shows code + translated name labels in PT/EN/FR', () => {
    for (const lang of ['pt', 'en', 'fr'] as const) {
      expect(resolveMessage({ en, pt, fr }, lang, 'profile_page.confirm_spoken_languages').length).toBeGreaterThan(3);
      expect(resolveMessage({ en, pt, fr }, lang, 'languages.portuguese').length).toBeGreaterThan(2);
      expect(resolveMessage({ en, pt, fr }, lang, 'languages.english').length).toBeGreaterThan(2);
      expect(resolveMessage({ en, pt, fr }, lang, 'languages.french').length).toBeGreaterThan(2);
    }
  });

  it('sheet portals above bottom nav with clearance', async () => {
    const sheet = await readFile(resolve('src/components/profile/ProfileMultiSelectSheet.tsx'), 'utf8');
    expect(sheet).toContain('createPortal');
    expect(sheet).toContain('z-[400]');
    expect(sheet).toContain('4.25rem');
    expect(sheet).toContain('safe-area-inset-bottom');
  });
});

describe('helper category confirm visibility', () => {
  it('uses shared sheet with sticky footer outside the scroll list', async () => {
    const src = await readFile(resolve('src/pages/profile/PublicProfileEditPage.tsx'), 'utf8');
    expect(src).toContain('public-edit-confirm-categories');
    expect(src).toContain('ProfileMultiSelectSheet');
    expect(src).toContain('toggleCategoryDraft');
    expect(src).not.toContain('z-[130]');
  });
});

describe('client ranking — publish does not promote', () => {
  it('confiavel requires completed service, not published order', () => {
    const confiavel = CLIENT_LEVELS.find((l) => l.key === 'confiavel');
    expect(confiavel?.requirements.minTotalCompleted).toBe(1);
    expect(confiavel?.requirements.minPublishedOrders).toBeUndefined();
  });

  it('first publish alone keeps Novo Cliente', () => {
    const stats = { ...emptyStats, profilePct: 100, publishedOrdersCount: 1, totalCompleted: 0 };
    const score = computeClientScore(stats);
    expect(score).toBe(100);
    expect(determineLevel('client', score, stats)).toBe('novo');
  });

  it('repeating publish count does not change score', () => {
    const a = computeClientScore({ ...emptyStats, profilePct: 80, publishedOrdersCount: 1 });
    const b = computeClientScore({ ...emptyStats, profilePct: 80, publishedOrdersCount: 10 });
    expect(a).toBe(b);
  });
});

describe('location incomplete copy', () => {
  it('exposes action-oriented PT/EN/FR messages', () => {
    expect(resolveMessage({ en, pt, fr }, 'pt', 'baseline_finance.location_incomplete_action')).toMatch(/coordenadas/i);
    expect(resolveMessage({ en, pt, fr }, 'en', 'baseline_finance.location_incomplete_action')).toMatch(/coordinates/i);
    expect(resolveMessage({ en, pt, fr }, 'fr', 'baseline_finance.location_incomplete_action')).toMatch(/coordonn/i);
    expect(resolveMessage({ en, pt, fr }, 'pt', 'app_pages.settings_helper_base_coords_required')).toMatch(/coordenadas/i);
  });
});
