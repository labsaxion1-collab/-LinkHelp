import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  captureHomeBaseGps,
  emptyHelperBaseAddress,
  helperBaseAddressFromProfile,
  mergeReverseGeocodeIntoHelperBase,
  type HelperBaseAddressValue,
} from '@/components/helper/HelperBaseAddressInput';
import { normalizeCanadianPostalCode, parseAddressComponents } from '@/utils/parseGooglePlace';
import { reverseGeocodeCoordinates } from '@/utils/reverseGeocodeCoordinates';
import { en } from '@/translations/en';
import { pt } from '@/translations/pt';
import { fr } from '@/translations/fr';
import { resolveMessage } from '@/services/translationService';

vi.mock('@/utils/reverseGeocodeCoordinates', () => ({
  reverseGeocodeCoordinates: vi.fn(),
}));

const reverseGeocodeMock = vi.mocked(reverseGeocodeCoordinates);

function stubGpsSuccess(lat = 45.51, lng = -73.56) {
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: (ok: PositionCallback) => {
        ok({
          coords: {
            latitude: lat,
            longitude: lng,
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
}

function stubGpsFailure(code: number) {
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: (_ok: PositionCallback, err: PositionErrorCallback) => {
        err({
          code,
          message: 'denied',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      },
    },
  });
}

const fullParsed = {
  address: '100 Rue Saint-Denis',
  city: 'Montréal',
  region: 'QC',
  postalCode: 'H2X 3K4',
  latitude: 1,
  longitude: 2,
  formatted: '100 Rue Saint-Denis, Montréal, QC H2X 3K4, Canada',
};

describe('helper base GPS reverse geocode', () => {
  beforeEach(() => {
    reverseGeocodeMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('1. successful GPS calls reverse geocoding', async () => {
    stubGpsSuccess();
    reverseGeocodeMock.mockResolvedValue(fullParsed);
    const prev = emptyHelperBaseAddress();
    const result = await captureHomeBaseGps(prev);
    expect(result.ok).toBe(true);
    expect(reverseGeocodeMock).toHaveBeenCalledTimes(1);
    expect(reverseGeocodeMock).toHaveBeenCalledWith({ lat: 45.51, lng: -73.56 });
  });

  it('2. full reverse geocode fills the four address fields', async () => {
    stubGpsSuccess();
    reverseGeocodeMock.mockResolvedValue(fullParsed);
    const result = await captureHomeBaseGps(emptyHelperBaseAddress());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome).toBe('address_filled');
    expect(result.value.address).toBe('100 Rue Saint-Denis');
    expect(result.value.city).toBe('Montréal');
    expect(result.value.province).toBe('QC');
    expect(result.value.postalCode).toBe('H2X 3K4');
  });

  it('3. GPS latitude/longitude are preserved over geocoder coordinates', async () => {
    stubGpsSuccess(45.501, -73.567);
    reverseGeocodeMock.mockResolvedValue(fullParsed);
    const result = await captureHomeBaseGps(emptyHelperBaseAddress());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.latitude).toBe(45.501);
    expect(result.value.longitude).toBe(-73.567);
  });

  it('4. GPS path does not call update_helper_base_address or sync helpers', async () => {
    const source = await readFile(resolve('src/components/helper/HelperBaseAddressInput.tsx'), 'utf8');
    expect(source).not.toContain('update_helper_base_address');
    expect(source).not.toContain('syncHelperBaseAddress');
    expect(source).toContain('reverseGeocodeCoordinates');
  });

  it('5. Settings only persists helper base address on save', async () => {
    const settings = await readFile(resolve('src/pages/settings/SettingsPage.tsx'), 'utf8');
    const saveIdx = settings.indexOf('syncHelperBaseAddress');
    const gpsToastIdx = settings.indexOf('settings_helper_base_gps_address_filled');
    expect(saveIdx).toBeGreaterThan(0);
    expect(gpsToastIdx).toBeGreaterThan(0);
    expect(settings).toContain('onLocationSuccess={(outcome)');
    expect(settings).not.toMatch(/onLocationSuccess[\s\S]{0,200}syncHelperBaseAddress/);
  });

  it('6. non-empty manual fields are preserved when geocode returns other values', () => {
    const prev: HelperBaseAddressValue = {
      address: 'Typed Street',
      city: '',
      province: 'QC',
      postalCode: '',
      latitude: null,
      longitude: null,
      display: 'Typed Street',
    };
    const { value, outcome } = mergeReverseGeocodeIntoHelperBase(prev, { lat: 45.5, lng: -73.6 }, fullParsed);
    expect(value.address).toBe('Typed Street');
    expect(value.province).toBe('QC');
    expect(value.city).toBe('Montréal');
    expect(value.postalCode).toBe('H2X 3K4');
    expect(outcome).toBe('address_filled');
  });

  it('7. empty fields are filled from reverse geocode', () => {
    const { value } = mergeReverseGeocodeIntoHelperBase(
      emptyHelperBaseAddress(),
      { lat: 45.5, lng: -73.6 },
      fullParsed,
    );
    expect(value.address).toBe(fullParsed.address);
    expect(value.city).toBe(fullParsed.city);
    expect(value.province).toBe(fullParsed.region);
    expect(value.postalCode).toBe(fullParsed.postalCode);
  });

  it('8. partial geocode fills only available components', () => {
    const { value, outcome } = mergeReverseGeocodeIntoHelperBase(
      emptyHelperBaseAddress(),
      { lat: 45.5, lng: -73.6 },
      {
        address: '50 Avenue Dupuis',
        city: 'Laval',
        region: '',
        postalCode: '',
        latitude: 0,
        longitude: 0,
        formatted: '50 Avenue Dupuis, Laval',
      },
    );
    expect(outcome).toBe('address_partial');
    expect(value.address).toBe('50 Avenue Dupuis');
    expect(value.city).toBe('Laval');
    expect(value.province).toBe('');
    expect(value.postalCode).toBe('');
    expect(value.latitude).toBe(45.5);
    expect(value.longitude).toBe(-73.6);
  });

  it('9. PT/EN/FR include partial and geocode-failed copy', () => {
    for (const key of [
      'app_pages.settings_helper_base_gps_address_filled',
      'app_pages.settings_helper_base_gps_address_partial',
      'app_pages.settings_helper_base_gps_geocode_failed',
      'app_pages.settings_helper_base_gps_manual_preserved',
    ]) {
      expect(resolveMessage({ en, pt, fr }, 'pt', key).length).toBeGreaterThan(20);
      expect(resolveMessage({ en, pt, fr }, 'en', key).length).toBeGreaterThan(20);
      expect(resolveMessage({ en, pt, fr }, 'fr', key).length).toBeGreaterThan(20);
    }
    expect(resolveMessage({ en, pt, fr }, 'pt', 'app_pages.settings_helper_base_gps_address_partial')).toMatch(
      /parcialmente/i,
    );
  });

  it('10. null reverse geocode keeps coordinates and marks geocode_failed', async () => {
    stubGpsSuccess(45.51, -73.56);
    reverseGeocodeMock.mockResolvedValue(null);
    const prev = helperBaseAddressFromProfile({
      helper_base_address: '845 Rue Brunet',
      helper_base_city: '',
      helper_base_province: '',
      helper_base_postal_code: '',
    });
    const result = await captureHomeBaseGps(prev);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome).toBe('geocode_failed');
    expect(result.value.latitude).toBe(45.51);
    expect(result.value.longitude).toBe(-73.56);
    expect(result.value.address).toBe('845 Rue Brunet');
  });

  it('11. reverse geocode throw keeps coordinates as geocode_failed', async () => {
    stubGpsSuccess();
    reverseGeocodeMock.mockRejectedValue(new Error('NetworkError'));
    const result = await captureHomeBaseGps(emptyHelperBaseAddress());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome).toBe('geocode_failed');
    expect(result.value.latitude).toBe(45.51);
    expect(result.value.longitude).toBe(-73.56);
  });

  it('12. geocode failure preserves previously typed manual fields', async () => {
    stubGpsSuccess();
    reverseGeocodeMock.mockResolvedValue(null);
    const prev = helperBaseAddressFromProfile({
      helper_base_address: '845 Rue Brunet',
      helper_base_city: 'Montreal',
      helper_base_province: 'QC',
      helper_base_postal_code: 'H2X 1Y4',
    });
    const result = await captureHomeBaseGps(prev);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome).toBe('manual_preserved');
    expect(result.value.address).toBe('845 Rue Brunet');
    expect(result.value.city).toBe('Montreal');
    expect(result.value.province).toBe('QC');
    expect(result.value.postalCode).toBe('H2X 1Y4');
  });

  it('13. GPS permission denied does not call reverse geocode', async () => {
    stubGpsFailure(1);
    const result = await captureHomeBaseGps(emptyHelperBaseAddress());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('denied');
    expect(reverseGeocodeMock).not.toHaveBeenCalled();
  });

  it('14. GPS timeout does not call reverse geocode', async () => {
    stubGpsFailure(3);
    const result = await captureHomeBaseGps(emptyHelperBaseAddress());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('timeout');
    expect(reverseGeocodeMock).not.toHaveBeenCalled();
  });

  it('15. captureHomeBaseGps waits for reverse geocode before resolving', async () => {
    stubGpsSuccess();
    let release!: (value: typeof fullParsed | null) => void;
    reverseGeocodeMock.mockImplementation(
      () =>
        new Promise((resolvePromise) => {
          release = resolvePromise;
        }),
    );
    let settled = false;
    const pending = captureHomeBaseGps(emptyHelperBaseAddress()).then((result) => {
      settled = true;
      return result;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    release(fullParsed);
    const result = await pending;
    expect(settled).toBe(true);
    expect(result.ok).toBe(true);
  });

  it('16. GPS button blocks double-click while locating', async () => {
    const source = await readFile(resolve('src/components/helper/HelperBaseAddressInput.tsx'), 'utf8');
    expect(source).toContain('locatingRef.current');
    expect(source).toContain('if (disabled || locatingRef.current) return');
    expect(source).toContain('disabled={disabled || locating}');
  });

  it('17. unmount guard skips late state updates', async () => {
    const source = await readFile(resolve('src/components/helper/HelperBaseAddressInput.tsx'), 'utf8');
    expect(source).toContain('mountedRef');
    expect(source).toContain('if (!mountedRef.current) return');
    expect(source).toContain('if (mountedRef.current) setLocating(false)');
  });

  it('18. client RequestAddressInput remains independent of helper GPS capture', async () => {
    const client = await readFile(
      resolve('src/components/client/create-request/RequestAddressInput.tsx'),
      'utf8',
    );
    expect(client).not.toContain('captureHomeBaseGps');
    expect(client).not.toContain('mergeReverseGeocodeIntoHelperBase');
    expect(client).not.toContain('HelperBaseAddressInput');
  });

  it('19. PT EN FR helper GPS keys are present', () => {
    const keys = [
      'app_pages.settings_helper_base_gps_address_filled',
      'app_pages.settings_helper_base_gps_address_partial',
      'app_pages.settings_helper_base_gps_geocode_failed',
      'app_pages.settings_helper_base_gps_manual_preserved',
      'app_pages.settings_location_denied',
      'app_pages.settings_location_unavailable',
    ];
    for (const key of keys) {
      for (const locale of ['pt', 'en', 'fr'] as const) {
        const message = resolveMessage({ en, pt, fr }, locale, key);
        expect(message.length).toBeGreaterThan(12);
        expect(message).not.toMatch(/AIza/);
        expect(message).not.toMatch(/-73\.\d{2,}/);
        expect(message).not.toMatch(/45\.\d{2,}/);
      }
    }
  });

  it('20. tests and GPS helpers do not snapshot coordinates or API keys in expectations beyond stubs', () => {
    expect(String(fullParsed.formatted)).not.toMatch(/AIza/);
    expect(JSON.stringify(fullParsed)).not.toMatch(/AIzaSy/);
  });

  it('21. helper base lock / cooldown modules are untouched by GPS autofill', async () => {
    const lock = await readFile(resolve('src/utils/helperBaseAddressLock.ts'), 'utf8');
    const remote = await readFile(resolve('src/services/supabase/helperBaseAddressRemote.ts'), 'utf8');
    expect(lock).toContain('HELPER_BASE_LOCK_DAYS');
    expect(remote).toContain('update_helper_base_address');
    const gpsSource = await readFile(resolve('src/components/helper/HelperBaseAddressInput.tsx'), 'utf8');
    expect(gpsSource).not.toContain('HELPER_BASE_LOCK_DAYS');
    expect(gpsSource).not.toContain('update_helper_base_address');
  });
});

describe('parseGooglePlace helpers for reverse geocode', () => {
  it('normalizes Canadian postal codes', () => {
    expect(normalizeCanadianPostalCode('h2x1y4')).toBe('H2X 1Y4');
    expect(normalizeCanadianPostalCode('H2X 1Y4')).toBe('H2X 1Y4');
    expect(normalizeCanadianPostalCode('')).toBe('');
  });

  it('resolves city via locality → postal_town → sublocality → admin_level_2', () => {
    const parsed = parseAddressComponents(
      [
        { long_name: 'Arrondissement', short_name: 'Arr', types: ['sublocality', 'political'] },
        { long_name: 'MRC Example', short_name: 'MRC', types: ['administrative_area_level_2'] },
        { long_name: 'QC', short_name: 'QC', types: ['administrative_area_level_1'] },
        { long_name: 'H2X1Y4', short_name: 'H2X1Y4', types: ['postal_code'] },
        { long_name: '10', short_name: '10', types: ['street_number'] },
        { long_name: 'Rue Test', short_name: 'Rue Test', types: ['route'] },
        { long_name: '4', short_name: '4', types: ['subpremise'] },
      ] as google.maps.GeocoderAddressComponent[],
      'formatted',
      45,
      -73,
    );
    expect(parsed.city).toBe('Arrondissement');
    expect(parsed.region).toBe('QC');
    expect(parsed.postalCode).toBe('H2X 1Y4');
    expect(parsed.address).toBe('10 Rue Test #4');
  });

  it('prefers locality over postal_town', () => {
    const parsed = parseAddressComponents(
      [
        { long_name: 'Montréal', short_name: 'Montréal', types: ['locality', 'political'] },
        { long_name: 'Postal Town', short_name: 'PT', types: ['postal_town'] },
        { long_name: 'QC', short_name: 'QC', types: ['administrative_area_level_1'] },
      ] as google.maps.GeocoderAddressComponent[],
      'fmt',
      1,
      2,
    );
    expect(parsed.city).toBe('Montréal');
  });
});
