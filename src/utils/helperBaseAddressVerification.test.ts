import { describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  applyCapturedGpsToHelperBase,
  captureHomeBaseGps,
  helperBaseAddressFromManualField,
  helperBaseAddressFromProfile,
  helperBaseAddressFromTypedDisplay,
  helperBaseHasGpsConfirmation,
} from '@/components/helper/HelperBaseAddressInput';
import {
  helperBaseSyncPayload,
  profileHasPersistedHomeCoordinates,
} from '@/utils/helperBaseAddressVerification';
import { decideHelperApplyLocation } from '@/utils/helperApplicationLocationGate';

const inPersonJob = {
  id: 'job-1',
  serviceMode: 'in_person' as const,
  latitude: 45.5,
  longitude: -73.57,
};

describe('helper base address verification flow', () => {
  it('1. manual address without coordinates keeps in-person apply blocked', () => {
    const profile = {
      helper_base_address: '845 Rue Brunet',
      helper_base_city: 'Montreal',
      helper_base_province: 'QC',
      helper_base_postal_code: 'H2X 1Y4',
      helper_base_lat: null,
      helper_base_lng: null,
      city: 'Montreal',
      region: 'QC',
    };
    expect(profileHasPersistedHomeCoordinates(profile)).toBe(false);
    const decision = decideHelperApplyLocation(inPersonJob as never, profile);
    expect(decision.ok).toBe(false);
  });

  it('2. successful GPS keeps lat/lng when reverse geocode is unavailable', async () => {
    expect(typeof globalThis.google).toBe('undefined');
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) => {
          ok({
            coords: {
              latitude: 45.51,
              longitude: -73.56,
              accuracy: 8,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as GeolocationPosition);
        },
      },
    });
    const prev = helperBaseAddressFromProfile({
      helper_base_address: '845 Rue Brunet',
      helper_base_city: 'Montreal',
      helper_base_province: 'QC',
      helper_base_postal_code: 'H2X 1Y4',
    });
    const result = await captureHomeBaseGps(prev);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.latitude).toBe(45.51);
      expect(result.value.longitude).toBe(-73.56);
    }
    vi.unstubAllGlobals();
  });

  it('3. successful GPS preserves manually typed address fields', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) => {
          ok({
            coords: {
              latitude: 45.51,
              longitude: -73.56,
              accuracy: 8,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as GeolocationPosition);
        },
      },
    });
    const prev = helperBaseAddressFromProfile({
      helper_base_address: '845 Rue Brunet',
      helper_base_city: 'Montreal',
      helper_base_province: 'QC',
      helper_base_postal_code: 'H2X 1Y4',
    });
    const result = await captureHomeBaseGps(prev);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.address).toBe('845 Rue Brunet');
      expect(result.value.city).toBe('Montreal');
      expect(result.value.province).toBe('QC');
      expect(result.value.postalCode).toBe('H2X 1Y4');
    }
    vi.unstubAllGlobals();
  });

  it('4. editing any address field after GPS invalidates stored coordinates', () => {
    const withGps = applyCapturedGpsToHelperBase(
      helperBaseAddressFromProfile({
        helper_base_address: '845 Rue Brunet',
        helper_base_city: 'Montreal',
        helper_base_province: 'QC',
        helper_base_postal_code: 'H2X 1Y4',
        helper_base_lat: 45.5,
        helper_base_lng: -73.6,
      }),
      { lat: 45.5, lng: -73.6 },
    );
    expect(helperBaseHasGpsConfirmation(withGps)).toBe(true);

    const afterStreet = helperBaseAddressFromTypedDisplay(withGps, '846 Rue Brunet');
    expect(afterStreet.latitude).toBeNull();
    expect(afterStreet.longitude).toBeNull();

    const afterCity = helperBaseAddressFromManualField(withGps, 'city', 'Laval');
    expect(afterCity.latitude).toBeNull();
    expect(afterCity.longitude).toBeNull();
  });

  it('5. save payload includes helper_base lat/lng fields', () => {
    const payload = helperBaseSyncPayload({
      address: '845 Rue Brunet',
      city: 'Montreal',
      province: 'QC',
      postalCode: 'H2X 1Y4',
      latitude: 45.5017,
      longitude: -73.5673,
      display: '845 Rue Brunet, Montreal, QC, H2X 1Y4',
    });
    expect(payload.lat).toBe(45.5017);
    expect(payload.lng).toBe(-73.5673);
    expect(payload.city).toBe('Montreal');
  });

  it('6. settings save refreshes profile before navigating back', async () => {
    const settings = await readFile(resolve('src/pages/settings/SettingsPage.tsx'), 'utf8');
    expect(settings).toContain('syncHelperBaseAddress');
    expect(settings).toContain('await refreshProfile()');
    expect(settings).toContain('profileHasPersistedHomeCoordinates');
    expect(settings).toContain('resumeApplicationType');
    expect(settings).toContain('settings_helper_base_saved_need_gps');
  });

  it('7. dashboard return reopens the original job confirm modal', async () => {
    const dashboard = await readFile(resolve('src/pages/helper/HelperDashboard.tsx'), 'utf8');
    const card = await readFile(resolve('src/components/opportunities/HelperOpportunityCard.tsx'), 'utf8');
    expect(dashboard).toContain('resumeApplicationType');
    expect(dashboard).toContain('resumeApplyPrompt');
    expect(dashboard).toContain('resumeApplyType');
    expect(card).toContain('resumeApplyType');
    expect(card).toContain('setConfirmOpen(true)');
  });

  it('8. pending apply without coords stays on settings and highlights GPS', async () => {
    const settings = await readFile(resolve('src/pages/settings/SettingsPage.tsx'), 'utf8');
    expect(settings).toContain('emphasizeGpsForPendingApply');
    expect(settings).toContain('emphasizeGpsButton');
    expect(settings).not.toMatch(/navigate\(pendingApply[\s\S]*savedLat == null/);
  });

  it('9. remote apply does not require home coordinates', () => {
    const decision = decideHelperApplyLocation(
      { ...inPersonJob, serviceMode: 'remote' } as never,
      {
        helper_base_lat: null,
        helper_base_lng: null,
        city: null,
        region: null,
      },
    );
    expect(decision.ok).toBe(true);
  });

  it('10. apply path runs location gate before any debit RPC', async () => {
    const dashboard = await readFile(resolve('src/pages/helper/HelperDashboard.tsx'), 'utf8');
    const submitStart = dashboard.indexOf('const submitApply =');
    const submitBlock = dashboard.slice(submitStart, submitStart + 2000);
    expect(submitBlock).toContain('decideHelperApplyLocation');
    expect(submitBlock.indexOf('decideHelperApplyLocation')).toBeLessThan(
      submitBlock.indexOf('appDataActionsRef.current.applyForJob'),
    );
  });

  it('11. return context is consumed once when navigating with persisted coords', async () => {
    const settings = await readFile(resolve('src/pages/settings/SettingsPage.tsx'), 'utf8');
    expect(settings).toContain('consumeHelperApplyReturnContext()');
    expect(settings).toContain('hasPersistedCoords');
  });

  it('12. profile mapper includes persisted home base coordinates', () => {
    const mapped = helperBaseAddressFromProfile({
      helper_base_address: '845 Rue Brunet',
      helper_base_city: 'Montreal',
      helper_base_province: 'QC',
      helper_base_postal_code: 'H2X 1Y4',
      helper_base_lat: 45.5017,
      helper_base_lng: -73.5673,
    });
    expect(mapped.latitude).toBe(45.5017);
    expect(mapped.longitude).toBe(-73.5673);
    expect(profileHasPersistedHomeCoordinates({
      helper_base_lat: mapped.latitude,
      helper_base_lng: mapped.longitude,
    })).toBe(true);
  });
});
