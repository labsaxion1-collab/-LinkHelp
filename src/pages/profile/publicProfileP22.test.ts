/**
 * P2.2 — public profile completeness (languages, score, overall rating, own edit, privacy).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const helperViewPath = 'src/components/features/HelperPublicProfileView.tsx';
const clientViewPath = 'src/components/features/ClientPublicProfileView.tsx';
const heroPath = 'src/components/reputation/PublicProfileHero.tsx';
const extrasHookPath = 'src/hooks/usePublicProfileExtras.ts';
const dashboardPath = 'src/pages/profile/ProfileDashboardPage.tsx';
const clientDashboardPath = 'src/pages/client/ClientDashboard.tsx';

describe('P2.2 public profile completeness', () => {
  it('fetches only public-safe profile columns (no email/phone/address)', async () => {
    const src = await readFile(resolve(extrasHookPath), 'utf8');
    expect(src).toContain('spoken_languages');
    expect(src).toContain('helper_base_city');
    expect(src).toContain('helper_base_province');
    expect(src).not.toMatch(/select\([^)]*email/);
    expect(src).not.toMatch(/select\([^)]*phone/);
    expect(src).not.toContain('helper_base_address');
    expect(src).not.toContain('helper_base_postal');
    expect(src).not.toContain('helper_base_lat');
    expect(src).not.toContain('helper_base_lng');
  });

  it('helper and client public views show languages, overall rating, score, and dossier completed count', async () => {
    const helper = await readFile(resolve(helperViewPath), 'utf8');
    const client = await readFile(resolve(clientViewPath), 'utf8');
    for (const src of [helper, client]) {
      expect(src).toContain("t('profile_page.spoken_languages')");
      expect(src).toContain("t('profile_page.overall_rating')");
      expect(src).toContain("t('reputation_dossier.score')");
      expect(src).toContain('dossier.trustScore');
      expect(src).toContain('dossier.completedCount');
      expect(src).toContain('getSpokenLanguageLabel');
      expect(src).not.toContain('profile.email');
      expect(src).not.toContain('profile.phone');
      expect(src).not.toContain('helper_base_address');
    }
    expect(helper).toContain("t('reputation_dossier.services_completed')");
    expect(client).toContain("t('reputation_dossier.orders_completed')");
  });

  it('edit CTA only when session user matches profile id', async () => {
    const helper = await readFile(resolve(helperViewPath), 'utf8');
    const client = await readFile(resolve(clientViewPath), 'utf8');
    const hero = await readFile(resolve(heroPath), 'utf8');
    expect(helper).toContain('session.user.id === helper.id');
    expect(client).toContain('session.user.id === job.clientId');
    expect(helper).toContain('ROUTES.profilePublicEdit');
    expect(client).toContain('ROUTES.profilePublicEdit');
    expect(helper).toContain('isOwnProfile ? () => navigate(ROUTES.profilePublicEdit)');
    expect(client).toContain('isOwnProfile ? () => navigate(ROUTES.profilePublicEdit)');
    expect(hero).toContain('onEdit');
    expect(hero).toContain('editLabel');
    expect(hero).toContain('levelCaption');
  });

  it('rating empty state avoids inventing 5.0 without reviews', async () => {
    const helper = await readFile(resolve(helperViewPath), 'utf8');
    const client = await readFile(resolve(clientViewPath), 'utf8');
    const hero = await readFile(resolve(heroPath), 'utf8');
    expect(hero).toContain('rating != null && rating > 0 && reviewCount > 0');
    expect(helper).toContain('dossier.reviewCount > 0');
    expect(client).toContain('dossier.reviewCount > 0');
  });

  it('own dashboard passes spoken_languages; peer helper sheet does not use application message as bio', async () => {
    const dashboard = await readFile(resolve(dashboardPath), 'utf8');
    const clientDash = await readFile(resolve(clientDashboardPath), 'utf8');
    const helper = await readFile(resolve(helperViewPath), 'utf8');
    expect(dashboard).toContain('spokenLanguages:');
    expect(dashboard).toContain('profile.spoken_languages');
    expect(clientDash).not.toContain('bio: profileApp?.message');
    expect(helper).toContain('usePublicProfileExtras');
    expect(helper).toContain("helper.bio?.trim() || extras.bio");
  });

  it('pt/en/fr expose overall_rating and public_level', async () => {
    for (const locale of ['pt', 'en', 'fr'] as const) {
      const src = await readFile(resolve(`src/translations/${locale}/index.ts`), 'utf8');
      expect(src).toContain('overall_rating:');
      expect(src).toContain('public_level:');
    }
  });
});
