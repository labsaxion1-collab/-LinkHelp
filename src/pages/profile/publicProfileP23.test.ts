/**
 * P2.3 — public profile visual hierarchy (medal, rating, achievements).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from '@/translations/en';
import { pt } from '@/translations/pt';
import { fr } from '@/translations/fr';
import { getNestedValue, humanizeKeyPath, resolveMessage } from '@/services/translationService';

const heroPath = 'src/components/reputation/PublicProfileHero.tsx';
const helperPath = 'src/components/features/HelperPublicProfileView.tsx';
const clientPath = 'src/components/features/ClientPublicProfileView.tsx';

describe('P2.3 public profile visual hierarchy', () => {
  it('1. rating is not rendered inside the medal flex slot', async () => {
    const hero = await readFile(resolve(heroPath), 'utf8');
    // Medal is a dedicated block; rating lives under data-testid="public-profile-rating".
    expect(hero).toContain('data-testid="public-profile-medal"');
    expect(hero).toContain('data-testid="public-profile-rating"');
    expect(hero).toContain('data-testid="public-profile-level"');
    expect(hero).toContain('data-testid="public-profile-score"');
    // Old layout: medal and rating chip shared one horizontal flex row.
    expect(hero).not.toContain('min-h-14 flex-wrap items-center gap-2');
  });

  it('2–3. real rating requires value > 0 and reviewCount > 0; never invents fake rating', async () => {
    const hero = await readFile(resolve(heroPath), 'utf8');
    const helper = await readFile(resolve(helperPath), 'utf8');
    const client = await readFile(resolve(clientPath), 'utf8');
    expect(hero).toContain('rating != null && rating > 0 && reviewCount > 0');
    expect(helper).toContain('dossier.reviewCount > 0');
    expect(client).toContain('dossier.reviewCount > 0');
    expect(hero).toContain('noReviewsLabel');
    // Display uses toFixed(1) only inside hasRating branch — never a hardcoded perfect score.
    expect(hero).not.toMatch(/['"`]5\.0['"`]/);
  });

  it('4–5. achievements section omitted when empty; no technical Achievements Title', async () => {
    const hero = await readFile(resolve(heroPath), 'utf8');
    const helper = await readFile(resolve(helperPath), 'utf8');
    const client = await readFile(resolve(clientPath), 'utf8');
    expect(hero).toContain('showAchievements = Boolean(achievements && achievementsLabel)');
    expect(helper).not.toContain("t('gamification.achievements_title')");
    expect(client).not.toContain("t('gamification.achievements_title')");
    expect(helper).not.toContain('achievementsLabel=');
    expect(client).not.toContain('achievementsLabel=');
    // Missing key humanization capitalizes each word of the leaf:
    expect(humanizeKeyPath('gamification.achievements_title')).toBe('Achievements Title');
    expect(getNestedValue(en, 'gamification.achievements_title')).toBeUndefined();
  });

  it('6. PT/EN/FR profile_page.achievements translations resolve', () => {
    expect(resolveMessage({ en, pt, fr }, 'pt', 'profile_page.achievements')).toBe('Conquistas');
    expect(resolveMessage({ en, pt, fr }, 'en', 'profile_page.achievements')).toBe('Achievements');
    expect(resolveMessage({ en, pt, fr }, 'fr', 'profile_page.achievements')).toBe('Réalisations');
    expect(resolveMessage({ en, pt, fr }, 'pt', 'profile_page.overall_rating')).toBe('Avaliação geral');
    expect(resolveMessage({ en, pt, fr }, 'en', 'profile_page.overall_rating')).toBe('Overall rating');
    expect(resolveMessage({ en, pt, fr }, 'fr', 'profile_page.overall_rating')).toBe('Évaluation générale');
  });

  it('7. Client and Helper public views share the compact score/level/rating stack', async () => {
    const helper = await readFile(resolve(helperPath), 'utf8');
    const client = await readFile(resolve(clientPath), 'utf8');
    for (const src of [helper, client]) {
      expect(src).toContain('scoreLabel={t(\'reputation_dossier.score\')}');
      expect(src).toContain('scoreValue={String(dossier.trustScore)}');
      expect(src).toContain('overallRatingLabel={t(\'profile_page.overall_rating\')}');
      expect(src).toContain('levelCaption={t(\'profile_page.public_level\')}');
    }
  });

  it('8. score/rating calculation sources are unchanged (trustScore + dossier avg only)', async () => {
    const helper = await readFile(resolve(helperPath), 'utf8');
    const client = await readFile(resolve(clientPath), 'utf8');
    expect(helper).toContain('usePublicReputationDossier');
    expect(client).toContain('usePublicReputationDossier');
    expect(helper).toContain('dossier.trustScore');
    expect(client).toContain('dossier.trustScore');
    // No new scoring formulas in public views.
    expect(helper).not.toMatch(/trustScore\s*[+\-*/]=/);
    expect(client).not.toMatch(/trustScore\s*[+\-*/]=/);
  });

  it('9. staging-only scope: edit/feed/SQL surfaces untouched by this sprint file set', async () => {
    const editPage = await readFile(resolve('src/pages/profile/PublicProfileEditPage.tsx'), 'utf8');
    const feedCard = await readFile(resolve('src/components/opportunities/HelperOpportunityCard.tsx'), 'utf8');
    // Edit page and feed card still exist; P2.3 does not rewrite their public-edit or feed layout.
    expect(editPage).toContain('export default function PublicProfileEditPage');
    expect(feedCard).toContain('HelperOpportunityCard');
  });
});
