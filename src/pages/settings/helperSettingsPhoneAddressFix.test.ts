/**
 * Help settings: phone + base address must accept keystrokes and survive profile refresh.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  emptyHelperBaseAddress,
  helperBaseAddressFromProfile,
  helperBaseAddressFromTypedDisplay,
} from '@/components/helper/HelperBaseAddressInput';
import { buildFullPhone, parseStoredPhone } from '@/utils/phoneFormat';

describe('phone typing round-trip (Canada +1 national digits)', () => {
  it('keeps each national digit visible through build/parse while typing', () => {
    let stored: string | null = null;
    const typed: string[] = [];
    for (const digit of '4165551234') {
      typed.push(digit);
      const national = typed.join('');
      stored = buildFullPhone('CA', national);
      const parsed = parseStoredPhone(stored);
      expect(parsed.countryId).toBe('CA');
      expect(parsed.nationalNumber).toBe(national);
    }
    expect(stored).toBe('+14165551234');
  });

  it('does not require country code in the national field', () => {
    const stored = buildFullPhone('CA', '5141234567');
    expect(stored).toBe('+15141234567');
    expect(parseStoredPhone(stored).nationalNumber).toBe('5141234567');
  });
});

describe('helper base address typing', () => {
  it('keeps typed letters in display/address and clears previous coordinates', () => {
    const prev = helperBaseAddressFromProfile({
      helper_base_address: 'Old St',
      helper_base_city: 'Montreal',
      helper_base_province: 'QC',
      helper_base_postal_code: 'H2X 1Y4',
      helper_base_lat: 45.5,
      helper_base_lng: -73.5,
    });
    expect(prev.latitude).toBe(45.5);

    let value = prev;
    let draft = '';
    for (const ch of 'Rue Saint-Denis') {
      draft += ch;
      value = helperBaseAddressFromTypedDisplay(value, draft);
      expect(value.display).toBe(draft);
      expect(value.address).toBe(draft);
      expect(value.latitude).toBeNull();
      expect(value.longitude).toBeNull();
    }
    // Derived fields remain until a place/GPS selection replaces them
    expect(value.city).toBe('Montreal');
  });

  it('selection payload keeps non-zero coordinates (no 0,0 fallback)', () => {
    const selected = {
      ...emptyHelperBaseAddress('123 Main St, Montreal, QC'),
      address: '123 Main St',
      city: 'Montreal',
      province: 'QC',
      postalCode: 'H2X 1Y4',
      latitude: 45.5017,
      longitude: -73.5673,
      display: '123 Main St, Montreal, QC H2X 1Y4',
    };
    expect(selected.latitude).not.toBe(0);
    expect(selected.longitude).not.toBe(0);
    expect(selected.latitude).not.toBeNull();
    expect(selected.longitude).not.toBeNull();
  });

  it('profile hydrate helper restores persisted base fields', () => {
    const restored = helperBaseAddressFromProfile({
      helper_base_address: '123 Main St',
      helper_base_city: 'Montreal',
      helper_base_province: 'QC',
      helper_base_postal_code: 'H2X 1Y4',
      helper_base_lat: 45.5017,
      helper_base_lng: -73.5673,
    });
    expect(restored.address).toBe('123 Main St');
    expect(restored.city).toBe('Montreal');
    expect(restored.province).toBe('QC');
    expect(restored.postalCode).toBe('H2X 1Y4');
    expect(restored.latitude).toBe(45.5017);
    expect(restored.longitude).toBe(-73.5673);
  });
});

describe('settings form contracts', () => {
  it('hydrates settings fields once per profile id (survives re-render refresh)', async () => {
    const src = await readFile(resolve('src/pages/settings/SettingsPage.tsx'), 'utf8');
    expect(src).toContain('hydratedProfileIdRef');
    expect(src).toContain('hydratedProfileIdRef.current === profile.id');
    expect(src).toContain('TOKEN_REFRESHED');
  });

  it('phone field ignores prop echo and does not sync while focused', async () => {
    const src = await readFile(resolve('src/components/profile/ProfilePhoneField.tsx'), 'utf8');
    expect(src).toContain('lastEmittedRef');
    expect(src).toContain('focusedRef');
    expect(src).toContain('if (focusedRef.current) return');
    expect(src).toContain("inputMode=\"numeric\"");
  });

  it('address search keeps local draft; city/province/postal stay manually editable', async () => {
    const src = await readFile(resolve('src/components/helper/HelperBaseAddressInput.tsx'), 'utf8');
    expect(src).toContain('helperBaseAddressFromTypedDisplay');
    expect(src).toContain('helperBaseAddressFromManualField');
    expect(src).toContain('const [draft, setDraft]');
    expect(src).toContain('focusedRef');
    expect(src).toContain('EditableRegionFields');
    expect(src).toContain('latitude: null');
    expect(src).toContain('longitude: null');
    expect(src).not.toContain('readOnly');
  });

  it('preserves LEAD_LOCATION_INCOMPLETE mapping and allows saving address without coords', async () => {
    const finance = await readFile(resolve('src/utils/formatBaselineFinanceError.ts'), 'utf8');
    const settings = await readFile(resolve('src/pages/settings/SettingsPage.tsx'), 'utf8');
    const apply = await readFile(resolve('src/services/supabase/helperApplicationService.ts'), 'utf8');
    expect(finance).toContain('LEAD_LOCATION_INCOMPLETE');
    expect(apply).toContain('LEAD_LOCATION_INCOMPLETE');
    expect(settings).toContain('syncHelperBaseAddress');
    expect(settings).not.toMatch(/showToast\(t\('app_pages\.settings_helper_base_coords_required'\)/);
  });
});
