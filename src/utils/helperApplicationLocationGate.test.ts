import { describe, expect, it, vi } from 'vitest';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Job } from '@/types/job';
import {
  decideHelperApplyLocation,
  helperApplyLocationMessageKey,
} from '@/utils/helperApplicationLocationGate';
import {
  applyCapturedGpsToHelperBase,
  captureHomeBaseGps,
  emptyHelperBaseAddress,
  helperBaseAddressFromManualField,
  helperBaseAddressFromProfile,
} from '@/components/helper/HelperBaseAddressInput';
import {
  consumeHelperApplyReturnContext,
  peekHelperApplyReturnContext,
  storeHelperApplyReturnContext,
} from '@/utils/helperApplyReturnContext';
import { getHelperLeadCreditQuote } from '@/utils/helperLeadCreditQuote';
import { getApplicationTypeChargeLc } from '@/utils/helperOpportunityApply';
import { VIP_APPLICATION_SURCHARGE_LC } from '@/utils/vipApplicationCredits';
import { resolveMessage } from '@/services/translationService';
import { en } from '@/translations/en';
import { pt } from '@/translations/pt';
import { fr } from '@/translations/fr';

const inPersonJob: Job = {
  id: 'job-in-person',
  title: 'Clean apartment',
  category: 'cleaning',
  subcategory: null,
  description: 'Full clean',
  date: '2026-07-10',
  location: 'Montreal',
  city: 'Montreal',
  region: 'QC',
  address: '123 Secret St',
  latitude: 45.5,
  longitude: -73.57,
  clientId: 'client-1',
  clientName: 'Alex',
  clientAvatar: '',
  status: 'open',
  urgency: 'normal',
  value: 'CAD $120',
  budgetMin: 120,
  budgetMax: 180,
  budgetType: 'fixed',
  budgetAmount: null,
  currency: 'CAD',
  createdAt: Date.now(),
  applicantCount: 0,
  preferredDate: null,
  preferredTime: null,
  preferredTimeWindow: null,
  preferredPeriod: null,
  timezone: 'America/Toronto',
  createdTimezone: null,
  exclusiveHelperId: null,
  serviceMode: 'in_person',
};

const remoteJob: Job = {
  ...inPersonJob,
  id: 'job-remote',
  serviceMode: 'remote',
  location: 'Remote',
  latitude: null,
  longitude: null,
};

const homeProfile = {
  helper_base_address: '845 Rue Brunet',
  helper_base_city: 'Montreal',
  helper_base_province: 'QC',
  helper_base_postal_code: 'H2X 1Y4',
  helper_base_lat: 45.5017,
  helper_base_lng: -73.5673,
  city: 'Montreal',
  region: 'QC',
};

describe('helper apply location gate', () => {
  it('1. remote allows apply without helper coordinates', () => {
    const decision = decideHelperApplyLocation(remoteJob, {
      helper_base_address: null,
      helper_base_city: null,
      helper_base_province: null,
      helper_base_postal_code: null,
      helper_base_lat: null,
      helper_base_lng: null,
      city: null,
      region: null,
    });
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.distanceKm).toBe(0);
      expect(decision.usesPersistedHome).toBe(false);
    }
  });

  it('2. remote keeps distance and distance cost at zero', () => {
    const quote = getHelperLeadCreditQuote(remoteJob, { distanceKm: 80 });
    expect(quote.isRemote).toBe(true);
    expect(quote.distanceLc).toBe(0);
    expect(quote.normalApplyLc).toBe(4);
  });

  it('3. in-person uses persisted home coordinates, not live GPS', () => {
    const decision = decideHelperApplyLocation(inPersonJob, homeProfile);
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.usesPersistedHome).toBe(true);
      expect(decision.distanceKm).toBeGreaterThan(0);
    }
  });

  it('4. in-person without coordinates blocks before any apply RPC', () => {
    const decision = decideHelperApplyLocation(inPersonJob, {
      ...homeProfile,
      helper_base_lat: null,
      helper_base_lng: null,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.reason).toBe('in_person_missing_coords');
    expect(helperApplyLocationMessageKey(decision)).toBe(
      'helper_dashboard.apply_in_person_coords_required',
    );
  });
});

describe('helper base address without Google Maps', () => {
  it('5. manual city/province/postal edits invalidate any prior coordinates', () => {
    const started = helperBaseAddressFromProfile({
      helper_base_address: '845 Rue Brunet',
      helper_base_city: 'Montreal',
      helper_base_province: 'QC',
      helper_base_postal_code: 'H2X 1Y4',
      helper_base_lat: 45.5,
      helper_base_lng: -73.6,
    });
    const withCity = helperBaseAddressFromManualField(started, 'city', 'Laval');
    expect(withCity.latitude).toBeNull();
    expect(withCity.longitude).toBeNull();
    const withProvince = helperBaseAddressFromManualField(started, 'province', 'ON');
    expect(withProvince.latitude).toBeNull();
    const withPostal = helperBaseAddressFromManualField(started, 'postalCode', 'H2X 1Y4');
    expect(withPostal.latitude).toBeNull();
  });

  it('6. GPS capture works without a Google object', async () => {
    expect(typeof globalThis.google).toBe('undefined');
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) => {
          ok({
            coords: { latitude: 45.51, longitude: -73.56, accuracy: 8, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
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
      expect(result.value.city).toBe('Montreal');
      expect(result.value.address).toBe('845 Rue Brunet');
    }
    vi.unstubAllGlobals();
  });

  it('7. GPS captured in profile persists as the home base fields', () => {
    const prev = emptyHelperBaseAddress('845 Rue Brunet');
    const next = applyCapturedGpsToHelperBase(prev, { lat: 45.5, lng: -73.6 });
    expect(next.latitude).toBe(45.5);
    expect(next.longitude).toBe(-73.6);
    expect(next.address).toBe(prev.address);
    expect(next.display).toBe(prev.display);
  });
});

describe('apply never uses live device GPS', () => {
  it('8-9. apply path does not read navigator.geolocation or overwrite saved coords', async () => {
    const dashboard = await readFile(resolve('src/pages/helper/HelperDashboard.tsx'), 'utf8');
    const applyService = await readFile(resolve('src/services/supabase/helperApplicationService.ts'), 'utf8');
    const appData = await readFile(resolve('src/context/AppDataContext.tsx'), 'utf8');
    expect(dashboard).toContain('decideHelperApplyLocation');
    expect(dashboard).toContain('distanceFromExactHelperBaseToJobKm');
    expect(dashboard).not.toContain('requestBrowserCoordinates');
    expect(dashboard).not.toContain('requestHomeBaseGpsCoordinates');
    expect(dashboard).not.toContain('navigator.geolocation');
    expect(applyService).not.toContain('geolocation');
    expect(appData).not.toContain('requestBrowserCoordinates');
    expect(appData).not.toContain('navigator.geolocation');
    expect(appData).toContain('fetchHelperBaseDistanceKm');
  });
});

describe('return to the same job after location save', () => {
  it('10. profile return context preserves job and type for resume', () => {
    storeHelperApplyReturnContext({
      jobId: 'job-in-person',
      applicationType: 'exclusive',
      returnPath: '/helper/dashboard',
    });
    const peeked = peekHelperApplyReturnContext();
    expect(peeked).toEqual({
      jobId: 'job-in-person',
      applicationType: 'exclusive',
      returnPath: '/helper/dashboard',
    });
    const consumed = consumeHelperApplyReturnContext();
    expect(consumed?.jobId).toBe('job-in-person');
    expect(peekHelperApplyReturnContext()).toBeNull();
  });
});

describe('finance and copy stay intact', () => {
  it('11. normal apply stays 4 LC and VIP keeps full + surcharge', () => {
    const quote = getHelperLeadCreditQuote(inPersonJob, { distanceKm: 8 });
    expect(quote.normalApplyLc).toBe(4);
    expect(getApplicationTypeChargeLc(inPersonJob, 'exclusive', 8)).toBe(
      quote.fullRequestLc + VIP_APPLICATION_SURCHARGE_LC,
    );
  });

  it('12. PT/EN/FR location copy is present', () => {
    for (const key of [
      'app_pages.settings_google_maps_unavailable',
      'app_pages.settings_helper_base_gps_home_warning',
      'app_pages.settings_helper_base_gps_status_pending',
      'app_pages.settings_helper_base_gps_status_confirmed',
      'app_pages.settings_helper_base_saved_need_gps',
      'app_pages.settings_helper_base_saved_returning',
      'app_pages.settings_location_denied',
      'helper_dashboard.apply_remote_location_not_needed',
      'helper_dashboard.apply_in_person_coords_required',
      'helper_dashboard.resume_apply_after_location',
    ]) {
      expect(resolveMessage({ en, pt, fr }, 'pt', key).length).toBeGreaterThan(12);
      expect(resolveMessage({ en, pt, fr }, 'en', key).length).toBeGreaterThan(12);
      expect(resolveMessage({ en, pt, fr }, 'fr', key).length).toBeGreaterThan(12);
    }
    expect(resolveMessage({ en, pt, fr }, 'pt', 'app_pages.settings_google_maps_unavailable')).toMatch(
      /Google Maps indisponível/i,
    );
  });

  it('13. still exposes exactly six public Vercel handlers', () => {
    const routes = execSync('git ls-files api', { encoding: 'utf8' })
      .split(/\r?\n/)
      .filter((line) => line.endsWith('.ts') && !line.includes('/_lib/'));
    expect(routes.sort()).toEqual(
      [
        'api/admin/dashboard-summary.ts',
        'api/gamification/me.ts',
        'api/gamification/recalculate.ts',
        'api/stripe/create-checkout-session.ts',
        'api/stripe/create-client-checkout-session.ts',
        'api/stripe/webhook.ts',
      ].sort(),
    );
  });

  it('14. adds the initial GPS confirmation migration without touching applied history', () => {
    const tracked = execSync('git ls-files supabase/migrations', { encoding: 'utf8' })
      .split(/\r?\n/)
      .filter(Boolean);
    expect(tracked).toContain(
      'supabase/migrations/20260831014124_helper_base_initial_gps_confirmation.sql',
    );
    expect(tracked).toContain('supabase/migrations/0033_helper_base_address_lock.sql');
    const dirty = execSync('git status --porcelain supabase/migrations', { encoding: 'utf8' })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    for (const line of dirty) {
      expect(line).toMatch(
        /20260831014124_helper_base_initial_gps_confirmation\.sql$|_service_completion_workflow\.sql$/,
      );
      expect(line).not.toMatch(/0033_helper_base_address_lock\.sql/);
    }
  });
});
