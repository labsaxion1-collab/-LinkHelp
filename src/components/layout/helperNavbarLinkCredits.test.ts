import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { formatCompactNavbarLinkCredits } from '@/utils/formatLinkCredits';

const root = new URL('../../../', import.meta.url);

function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

describe('compact navbar LinkCredits', () => {
  it('formats small and large balances without inventing values', () => {
    expect(formatCompactNavbarLinkCredits(208, 'pt').shortLabel).toBe('208 LC');
    expect(formatCompactNavbarLinkCredits(208, 'pt').fullAmount).toBe(208);
    expect(formatCompactNavbarLinkCredits(1200, 'pt').shortLabel).toBe('1,2 mil LC');
    expect(formatCompactNavbarLinkCredits(1200, 'en').shortLabel).toBe('1.2k LC');
    expect(formatCompactNavbarLinkCredits(1200, 'fr').shortLabel).toBe('1,2 k LC');
  });

  it('renders helper-only chip in Navbar beside actions', () => {
    const nav = read('src/components/layout/Navbar.tsx');
    const chip = read('src/components/layout/HelperNavbarLinkCreditsChip.tsx');
    expect(nav).toContain('HelperNavbarLinkCreditsChip');
    expect(nav).toContain('isHelperNav ? <HelperNavbarLinkCreditsChip');
    expect(nav).toContain('isConnected && isHelperNav ? <HelperNavbarLinkCreditsChip compact');
    expect(chip).toContain('useWalletBalance');
    expect(chip).toContain('BRAND.linkCreditCoin');
    expect(chip).toContain('helper-navbar-linkcredits');
    expect(chip).toContain('helper-navbar-linkcredits-skeleton');
    expect(chip).toContain('#profile-linkcredits');
    expect(chip).toContain('ROUTES.profile');
    expect(chip).toContain('navbar_balance_aria');
    expect(chip).toContain('UI_VISIBILITY.helperCredits');
    expect(chip).not.toContain('service_role');
  });

  it('profile section exposes anchor for back-friendly navigation', () => {
    const card = read('src/components/profile/ProfileLinkCreditsCard.tsx');
    const page = read('src/pages/profile/ProfileDashboardPage.tsx');
    expect(card).toContain('id="profile-linkcredits"');
    expect(page).toContain("#profile-linkcredits");
    expect(page).toContain('scrollIntoView');
  });

  it('does not show a hard-coded zero while loading', () => {
    const chip = read('src/components/layout/HelperNavbarLinkCreditsChip.tsx');
    expect(chip).toContain('unresolved');
    expect(chip).toContain('helper-navbar-linkcredits-skeleton');
    expect(chip).not.toMatch(/unresolved[\s\S]{0,80}0 LC/);
  });

  it('keeps mobile action group compact for 240–390 widths', () => {
    const chip = read('src/components/layout/HelperNavbarLinkCreditsChip.tsx');
    expect(chip).toContain('max-w-[7.25rem]');
    expect(chip).toContain('tabular-nums');
    expect(chip).toContain('min-h-[32px]');
  });
});
