/**
 * Profile dashboard — single public-profile entry (no duplicated preview section).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '@/utils/constants';

describe('ProfileDashboardPage — public profile entry', () => {
  it('1–2. keeps one hero view_public CTA and removes Prévia do perfil público section', async () => {
    const src = await readFile(resolve('src/pages/profile/ProfileDashboardPage.tsx'), 'utf8');
    expect(src).toContain('onViewPublic={() => setPublicOpen(true)}');
    expect(src).toContain("viewPublicLabel={t('profile_page.view_public')}");
    expect(src).not.toContain('PublicProfilePreviewCard');
    expect(src).not.toContain('section_public_preview');
    expect(src).not.toContain('section_public_preview_sub');
    expect(src).not.toContain('previewIndicators');
  });

  it('3. hero CTA still opens the public profile sheet', async () => {
    const src = await readFile(resolve('src/pages/profile/ProfileDashboardPage.tsx'), 'utf8');
    const hero = await readFile(resolve('src/components/profile/ProfileIdentityHero.tsx'), 'utf8');
    expect(src).toContain('PublicProfileSheetFrame open={publicOpen}');
    expect(src).toContain('setPublicOpen(true)');
    expect(hero).toContain('onClick={onViewPublic}');
    expect(hero).toContain('{viewPublicLabel}');
  });

  it('4–5. same ProfileDashboardPage serves Client and Helper', async () => {
    const src = await readFile(resolve('src/pages/profile/ProfileDashboardPage.tsx'), 'utf8');
    const routes = await readFile(resolve('src/routes/AppRoutes.tsx'), 'utf8');
    expect(routes).toContain(`path={ROUTES.profile}`);
    expect(routes).toContain('ProfileDashboardPage');
    expect(src).toContain("const isHelper = profile?.role === 'helper'");
    expect(src).toContain('HelperPublicProfileView');
    expect(src).toContain('ClientPublicProfileView');
  });

  it('6. public profile edit route remains available', async () => {
    expect(ROUTES.profilePublicEdit).toBe('/profile/public');
    const routes = await readFile(resolve('src/routes/AppRoutes.tsx'), 'utf8');
    expect(routes).toContain('ROUTES.profilePublicEdit');
    expect(routes).toContain('PublicProfileEditPage');
    const editPage = await readFile(resolve('src/pages/profile/PublicProfileEditPage.tsx'), 'utf8');
    expect(editPage).toContain('export default function PublicProfileEditPage');
    expect(editPage).not.toContain('PublicProfilePreviewCard');
  });

  it('7. public profile view components are unchanged entry points', async () => {
    const helper = await readFile(resolve('src/components/features/HelperPublicProfileView.tsx'), 'utf8');
    const client = await readFile(resolve('src/components/features/ClientPublicProfileView.tsx'), 'utf8');
    expect(helper).toContain('export function HelperPublicProfileView');
    expect(client).toContain('export function ClientPublicProfileView');
  });

  it('8. bottom padding for BottomNav remains on the dashboard shell', async () => {
    const src = await readFile(resolve('src/pages/profile/ProfileDashboardPage.tsx'), 'utf8');
    expect(src).toContain('pb-28 md:pb-10');
  });
});
