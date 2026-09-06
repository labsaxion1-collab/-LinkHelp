import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getHelperBaseChangeStatus,
  helperBaseCoordsNear,
  helperBaseFieldsChanged,
  helperBaseHasConfirmedCoordinates,
  shouldBlockHelperBaseSaveDueToCooldown,
  shouldShowHelperBaseCooldownMessage,
  shouldShowHelperBaseTextNeedsGpsMessage,
} from '@/utils/helperBaseAddressLock';

const recentLock = '2026-08-29T12:00:00.000Z';
const oldLock = '2026-06-01T12:00:00.000Z';

const textOnlyProfile = {
  helper_base_address: '845 Rue Brunet',
  helper_base_city: 'Montreal',
  helper_base_province: 'QC',
  helper_base_postal_code: 'H2X 1Y4',
  helper_base_lat: null,
  helper_base_lng: null,
  helper_base_updated_at: recentLock,
  helper_base_change_unlocked_by_admin: false,
};

const confirmedProfile = {
  ...textOnlyProfile,
  helper_base_lat: 45.5017,
  helper_base_lng: -73.5673,
  helper_base_updated_at: recentLock,
};

describe('helper base address lock (client-side contract)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-30T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. text + null coords + recent timestamp allows first GPS confirmation', () => {
    const status = getHelperBaseChangeStatus(textOnlyProfile);
    expect(status.allowed).toBe(true);
    if (status.allowed) expect(status.reason).toBe('pending_gps_confirmation');
    expect(shouldBlockHelperBaseSaveDueToCooldown(textOnlyProfile, status, true)).toBe(false);
  });

  it('2. pending GPS profile does not show 30-day countdown', () => {
    expect(shouldShowHelperBaseTextNeedsGpsMessage(textOnlyProfile)).toBe(true);
    expect(shouldShowHelperBaseCooldownMessage(textOnlyProfile, getHelperBaseChangeStatus(textOnlyProfile))).toBe(
      false,
    );
  });

  it('3. text-only draft is not treated as confirmed residence', () => {
    expect(helperBaseHasConfirmedCoordinates(textOnlyProfile)).toBe(false);
  });

  it('4. confirmed residence inside 30 days is locked for real changes', () => {
    const status = getHelperBaseChangeStatus(confirmedProfile);
    expect(status.allowed).toBe(false);
    if (!status.allowed) {
      expect(status.reason).toBe('locked');
      expect(status.daysUntilUnlock).toBeGreaterThan(0);
    }
    expect(
      shouldBlockHelperBaseSaveDueToCooldown(confirmedProfile, status, true),
    ).toBe(true);
  });

  it('5. confirmed residence after 30 days may change again', () => {
    const status = getHelperBaseChangeStatus({
      ...confirmedProfile,
      helper_base_updated_at: oldLock,
    });
    expect(status.allowed).toBe(true);
    if (status.allowed) expect(status.reason).toBe('cooldown_elapsed');
  });

  it('6. idempotent save with tiny coordinate jitter is not a material change', () => {
    const changed = helperBaseFieldsChanged(confirmedProfile, {
      address: '845 Rue Brunet',
      city: 'Montreal',
      province: 'QC',
      postalCode: 'H2X 1Y4',
      lat: 45.50170004,
      lng: -73.56730004,
    });
    expect(changed).toBe(false);
    expect(helperBaseCoordsNear(45.5017, 45.50170004)).toBe(true);
  });

  it('7. material coordinate move is detected beyond precision epsilon', () => {
    const changed = helperBaseFieldsChanged(confirmedProfile, {
      address: '845 Rue Brunet',
      city: 'Montreal',
      province: 'QC',
      postalCode: 'H2X 1Y4',
      lat: 45.502,
      lng: -73.5673,
    });
    expect(changed).toBe(true);
  });

  it('8. confirmed residence shows cooldown banner only when coords exist', () => {
    const lockedStatus = getHelperBaseChangeStatus(confirmedProfile);
    expect(shouldShowHelperBaseCooldownMessage(confirmedProfile, lockedStatus)).toBe(true);
    expect(shouldShowHelperBaseCooldownMessage(textOnlyProfile, getHelperBaseChangeStatus(textOnlyProfile))).toBe(
      false,
    );
  });
});

describe('helper base address lock UI wiring', () => {
  it('9. settings page uses pending-GPS helpers and hides lock for text-only profiles', async () => {
    const { readFile } = await import('node:fs/promises');
    const { resolve } = await import('node:path');
    const settings = await readFile(resolve('src/pages/settings/SettingsPage.tsx'), 'utf8');
    expect(settings).toContain('shouldShowHelperBaseTextNeedsGpsMessage');
    expect(settings).toContain('shouldShowHelperBaseCooldownMessage');
    expect(settings).toContain('shouldBlockHelperBaseSaveDueToCooldown');
    expect(settings).toContain('settings_helper_base_text_needs_gps');
    expect(settings).not.toContain('baseConfigured && baseChangeStatus.reason === \'locked\'');
  });
});
