import { afterEach, describe, expect, it, vi } from 'vitest';
import { reverseGeocodeCoordinates } from '@/utils/reverseGeocodeCoordinates';

describe('reverseGeocodeCoordinates', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns null when Maps JS Geocoder and REST key are unavailable', async () => {
    expect(typeof globalThis.google).toBe('undefined');
    vi.stubGlobal('fetch', vi.fn());
    const result = await reverseGeocodeCoordinates({ lat: 45.5, lng: -73.6 });
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses JS Geocoder when available and does not call REST', async () => {
    const geocode = vi.fn((_req: unknown, cb: (results: unknown[], status: string) => void) => {
      cb(
        [
          {
            formatted_address: '10 Rue Test, Montréal, QC H2X 1Y4, Canada',
            address_components: [
              { long_name: '10', short_name: '10', types: ['street_number'] },
              { long_name: 'Rue Test', short_name: 'Rue Test', types: ['route'] },
              { long_name: 'Montréal', short_name: 'Montréal', types: ['locality', 'political'] },
              { long_name: 'Québec', short_name: 'QC', types: ['administrative_area_level_1'] },
              { long_name: 'H2X 1Y4', short_name: 'H2X 1Y4', types: ['postal_code'] },
            ],
            geometry: {
              location: {
                lat: () => 45.5,
                lng: () => -73.6,
              },
            },
          },
        ],
        'OK',
      );
    });
    vi.stubGlobal('google', {
      maps: {
        Geocoder: vi.fn(function Geocoder(this: { geocode: typeof geocode }) {
          this.geocode = geocode;
        }),
      },
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await reverseGeocodeCoordinates({ lat: 45.5, lng: -73.6 });
    expect(result?.address).toBe('10 Rue Test');
    expect(result?.city).toBe('Montréal');
    expect(result?.region).toBe('QC');
    expect(result?.postalCode).toBe('H2X 1Y4');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns null on JS Geocoder ZERO_RESULTS without exposing personal data', async () => {
    const geocode = vi.fn((_req: unknown, cb: (results: unknown[] | null, status: string) => void) => {
      cb(null, 'ZERO_RESULTS');
    });
    vi.stubGlobal('google', {
      maps: {
        Geocoder: vi.fn(function Geocoder(this: { geocode: typeof geocode }) {
          this.geocode = geocode;
        }),
      },
    });
    const result = await reverseGeocodeCoordinates({ lat: 45.5, lng: -73.6 });
    expect(result).toBeNull();
  });
});
