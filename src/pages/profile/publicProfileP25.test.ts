/**
 * P2.5 — Personal information shortcut on Profile (Client + Helper).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveMessage } from '@/services/translationService';
import { en } from '@/translations/en';
import { pt } from '@/translations/pt';
import { fr } from '@/translations/fr';
import { ROUTES } from '@/utils/constants';

const dashPath = 'src/pages/profile/ProfileDashboardPage.tsx';
const shortcutPath = 'src/components/profile/ProfilePersonalInfoShortcut.tsx';
const settingsPath = 'src/pages/settings/SettingsPage.tsx';
const helperPublicPath = 'src/components/features/HelperPublicProfileView.tsx';
const clientPublicPath = 'src/components/features/ClientPublicProfileView.tsx';

describe('P2.5 personal information shortcut', () => {
  it('1–4. shortcut on Profile for Client and Helper navigates to Settings account', async () => {
    const dash = await readFile(resolve(dashPath), 'utf8');
    const shortcut = await readFile(resolve(shortcutPath), 'utf8');
    expect(dash).toContain('ProfilePersonalInfoShortcut');
    expect(dash).toContain("t('profile_page.shortcut_personal_info')");
    expect(dash).toContain("const isHelper = profile?.role === 'helper'");
    expect(shortcut).toContain('data-testid="profile-personal-info-shortcut"');
    expect(shortcut).toContain('`\${ROUTES.settings}#settings-account`');
    expect(shortcut).toContain('from: ROUTES.profile');
    expect(ROUTES.settings).toBe('/settings');
    expect(ROUTES.profile).toBe('/profile');
  });

  it('5–7. does not open feed or public profile; back returns to Profile', async () => {
    const shortcut = await readFile(resolve(shortcutPath), 'utf8');
    const settings = await readFile(resolve(settingsPath), 'utf8');
    expect(shortcut).not.toContain('ROUTES.helperDashboard');
    expect(shortcut).not.toContain('ROUTES.clientDashboard');
    expect(shortcut).not.toContain('ROUTES.profilePublicEdit');
    expect(shortcut).not.toContain('setPublicOpen');
    expect(settings).toContain('goBackFromSettings');
    expect(settings).toContain('from === ROUTES.profile');
    expect(settings).toContain('navigate(ROUTES.profile)');
    expect(settings).toContain('id="settings-account"');
  });

  it('8. public profile views do not expose private account fields', async () => {
    const helper = await readFile(resolve(helperPublicPath), 'utf8');
    const client = await readFile(resolve(clientPublicPath), 'utf8');
    for (const src of [helper, client]) {
      expect(src).not.toMatch(/\bprofile\.phone\b|\bphone\?:/);
      expect(src).not.toMatch(/\bprofile\.email\b|\bauthEmail\b|\buser\.email\b/);
      expect(src).not.toMatch(/\bpostal\b|\bpostal_code\b/);
      expect(src).not.toMatch(/\bstreet_address\b|\baddress_line\b|\bhelper_base_address\b/);
      expect(src).not.toMatch(/\blatitude\b|\blongitude\b|\bgeo_lat\b|\bgeo_lng\b/);
      expect(src).not.toContain('settings_delete_account');
      expect(src).not.toContain('credit_wallets');
    }
  });

  it('9. PT/EN/FR labels for personal information', () => {
    expect(resolveMessage({ en, pt, fr }, 'pt', 'profile_page.shortcut_personal_info')).toBe(
      'Informações pessoais',
    );
    expect(resolveMessage({ en, pt, fr }, 'en', 'profile_page.shortcut_personal_info')).toBe(
      'Personal information',
    );
    expect(resolveMessage({ en, pt, fr }, 'fr', 'profile_page.shortcut_personal_info')).toBe(
      'Informations personnelles',
    );
  });
});
