import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { formatCompactNavbarLinkCredits } from '@/utils/formatLinkCredits';

const root = new URL('../../../', import.meta.url);

function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

describe('shared navbar LinkCredits chip', () => {
  it('formats small and large balances without inventing values', () => {
    expect(formatCompactNavbarLinkCredits(208, 'pt').shortLabel).toBe('208 LC');
    expect(formatCompactNavbarLinkCredits(208, 'pt').fullAmount).toBe(208);
    expect(formatCompactNavbarLinkCredits(1200, 'pt').shortLabel).toBe('1,2 mil LC');
    expect(formatCompactNavbarLinkCredits(1200, 'en').shortLabel).toBe('1.2k LC');
    expect(formatCompactNavbarLinkCredits(1200, 'fr').shortLabel).toBe('1,2 k LC');
  });

  it('uses one shared chip for helper and client in Navbar', () => {
    const nav = read('src/components/layout/Navbar.tsx');
    const chip = read('src/components/layout/NavbarLinkCreditsChip.tsx');
    const alias = read('src/components/layout/HelperNavbarLinkCreditsChip.tsx');
    expect(nav).toContain('NavbarLinkCreditsChip');
    expect(nav).toContain('<NavbarLinkCreditsChip');
    expect(nav).toContain('<NavbarLinkCreditsChip compact');
    expect(nav).not.toContain('isHelperNav ? <NavbarLinkCreditsChip');
    expect(nav).not.toContain('HelperNavbarLinkCreditsChip');
    expect(chip).toContain('useWalletBalance');
    expect(chip).toContain('profile?.credits');
    expect(chip).toContain('BRAND.linkCreditCoin');
    expect(chip).toContain('navbar-linkcredits');
    expect(chip).toContain('navbar-linkcredits-skeleton');
    expect(chip).toContain('#profile-linkcredits');
    expect(chip).toContain('UI_VISIBILITY.helperCredits');
    expect(chip).toContain('UI_VISIBILITY.clientCredits');
    expect(alias).toContain("from '@/components/layout/NavbarLinkCreditsChip'");
    expect(alias).toContain('HelperNavbarLinkCreditsChip');
  });

  it('does not show a hard-coded zero while loading', () => {
    const chip = read('src/components/layout/NavbarLinkCreditsChip.tsx');
    expect(chip).toContain('unresolved');
    expect(chip).toContain('navbar-linkcredits-skeleton');
    expect(chip).not.toMatch(/unresolved[\s\S]{0,80}0 LC/);
  });

  it('keeps mobile action group compact for 240–390 widths', () => {
    const chip = read('src/components/layout/NavbarLinkCreditsChip.tsx');
    expect(chip).toContain('max-w-[7.25rem]');
    expect(chip).toContain('tabular-nums');
    expect(chip).toContain('min-h-[32px]');
  });
});
