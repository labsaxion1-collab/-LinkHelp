import { describe, expect, it } from 'vitest';
import {
  classifyGoogleMapsLoaderError,
  getGoogleMapsApiKeySanitizedPrefix,
  GOOGLE_MAPS_AUTH_ERROR_CODES,
} from '@/utils/googleMapsConfig';

describe('googleMapsConfig diagnostics', () => {
  it('sanitizes key prefix without exposing the full secret', () => {
    const full = 'AIzaSyFakeKeyValueForTestOnly123456';
    const prefix = getGoogleMapsApiKeySanitizedPrefix(full);
    expect(prefix.startsWith('AIzaSy…(len=')).toBe(true);
    expect(prefix).toContain(`len=${full.length}`);
    expect(prefix).not.toContain(full);
    expect(prefix).not.toMatch(/FakeKeyValueForTestOnly/);
  });

  it('classifies official Google Maps auth error codes', () => {
    for (const code of GOOGLE_MAPS_AUTH_ERROR_CODES) {
      expect(classifyGoogleMapsLoaderError(`Maps: ${code}`)).toBe(code);
    }
    expect(classifyGoogleMapsLoaderError("This page didn't load Google Maps correctly.")).toBe(
      'UnknownMapError',
    );
  });

  it('auth failure helper exists and never interpolates a raw key into source', async () => {
    const { readFileSync } = await import('node:fs');
    const cfg = readFileSync(new URL('./googleMapsConfig.ts', import.meta.url), 'utf8');
    expect(cfg).toContain('attachGoogleMapsAuthFailureListener');
    expect(cfg).toContain('gm_authFailure');
    expect(cfg).toContain('key not logged');
    expect(cfg).toContain('getGoogleMapsApiKeySanitizedPrefix');
    expect(cfg).not.toMatch(/console\.(error|log|warn)\([^)]*getGoogleMapsApiKey\(\)/);
  });
});

describe('googleMapsConfig env contract', () => {
  it('documents the public Vite env var name for Maps', async () => {
    const { readFileSync } = await import('node:fs');
    const cfg = readFileSync(new URL('./googleMapsConfig.ts', import.meta.url), 'utf8');
    const vite = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8');
    const helperMap = readFileSync(new URL('../pages/map/HelperLiveMapPage.tsx', import.meta.url), 'utf8');
    expect(cfg).toContain('VITE_GOOGLE_MAPS_PLATFORM_KEY');
    expect(vite).toContain('VITE_GOOGLE_MAPS_PLATFORM_KEY');
    expect(cfg).toMatch(/import\.meta\.env\.VITE_GOOGLE_MAPS_PLATFORM_KEY/);
    expect(cfg).not.toMatch(/import\.meta\.env\.GOOGLE_MAPS_PLATFORM_KEY/);
    expect(helperMap).toContain('attachGoogleMapsAuthFailureListener');
    expect(helperMap).toContain('onError');
    expect(helperMap).toContain('classifyGoogleMapsLoaderError');
  });
});
