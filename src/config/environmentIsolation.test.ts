import { afterEach, describe, expect, it } from 'vitest';
import {
  CANONICAL_STAGING_SUPABASE_REF,
  PRODUCTION_SUPABASE_REF,
  assertFrontendBackendSameProject,
  assertSiteUrlMatchesDeployTarget,
  assertStripeLivemodeMatchesDeployTarget,
  assertStripeMatchesDeployTarget,
  assertSupabaseRefMatchesDeployTarget,
  classifyDeployTarget,
  extractSupabaseProjectRef,
  isolationPublicErrorMessage,
  resolveAllowedStagingRefs,
  resolveCheckoutReturnOrigin,
} from '../../shared/environmentIsolation';
import { assertServerEnvironmentIsolation } from '../../api/_lib/environmentIsolation';

const prodUrl = `https://${PRODUCTION_SUPABASE_REF}.supabase.co`;
const stagingUrl = `https://${CANONICAL_STAGING_SUPABASE_REF}.supabase.co`;
/** Former incorrect canonical ref — must be treated as mismatch, never allowed. */
const formerIncorrectStagingUrl = 'https://neijuzpbjectelyxkapw.supabase.co';
const unknownRefUrl = 'https://zzzzzzzzzzzzzzzzzzzz.supabase.co';

const ENV_KEYS = [
  'LINKHELP_DEPLOY_TARGET',
  'VITE_LINKHELP_DEPLOY_TARGET',
  'VERCEL_ENV',
  'VITE_VERCEL_ENV',
  'SUPABASE_URL',
  'VITE_SUPABASE_URL',
  'SITE_URL',
  'VITE_SITE_URL',
  'STRIPE_SECRET_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'LINKHELP_ENFORCE_ISOLATION',
] as const;

const savedEnv: Record<string, string | undefined> = {};

function snapshotEnv() {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
}

function setStagingEnv(overrides?: Record<string, string>) {
  process.env.LINKHELP_DEPLOY_TARGET = 'staging';
  process.env.SUPABASE_URL = stagingUrl;
  process.env.VITE_SUPABASE_URL = stagingUrl;
  process.env.SITE_URL = 'https://teste.linkhelp.app';
  process.env.VITE_SITE_URL = 'https://teste.linkhelp.app';
  process.env.STRIPE_SECRET_KEY = 'sk_test_51FakeStagingOnly';
  process.env.VITE_STRIPE_PUBLISHABLE_KEY = 'pk_test_51FakeStagingOnly';
  Object.assign(process.env, overrides);
}

function setProductionEnv(overrides?: Record<string, string>) {
  process.env.LINKHELP_DEPLOY_TARGET = 'production';
  process.env.SUPABASE_URL = prodUrl;
  process.env.VITE_SUPABASE_URL = prodUrl;
  process.env.SITE_URL = 'https://www.linkhelp.app';
  process.env.VITE_SITE_URL = 'https://www.linkhelp.app';
  process.env.STRIPE_SECRET_KEY = 'sk_live_51FakeProductionOnly';
  process.env.VITE_STRIPE_PUBLISHABLE_KEY = 'pk_live_51FakeProductionOnly';
  Object.assign(process.env, overrides);
}

snapshotEnv();
afterEach(restoreEnv);

describe('environmentIsolation — canonical staging kqwl', () => {
  it('extracts project refs', () => {
    expect(CANONICAL_STAGING_SUPABASE_REF).toBe('kqwlgpnmjpohzjsrnnih');
    expect(PRODUCTION_SUPABASE_REF).toBe('mttjbaiiaeiqqmnwnzwr');
    expect(extractSupabaseProjectRef(prodUrl)).toBe(PRODUCTION_SUPABASE_REF);
    expect(extractSupabaseProjectRef(stagingUrl + '/')).toBe(CANONICAL_STAGING_SUPABASE_REF);
    expect(extractSupabaseProjectRef('https://evil.example')).toBeNull();
  });

  it('allowlist is only kqwl', () => {
    const allowed = resolveAllowedStagingRefs();
    expect(allowed.has(CANONICAL_STAGING_SUPABASE_REF)).toBe(true);
    expect(allowed.has('neijuzpbjectelyxkapw')).toBe(false);
    expect(allowed.has(PRODUCTION_SUPABASE_REF)).toBe(false);
    expect(allowed.size).toBe(1);
  });

  it('classifies hosts and Vercel env', () => {
    expect(classifyDeployTarget({ hostname: 'teste.linkhelp.app' })).toBe('staging');
    expect(classifyDeployTarget({ vercelEnv: 'preview' })).toBe('staging');
    expect(classifyDeployTarget({ hostname: 'www.linkhelp.app' })).toBe('production');
    expect(classifyDeployTarget({ vercelEnv: 'production' })).toBe('production');
  });

  it('known hostname wins over explicit deploy target flag', () => {
    expect(
      classifyDeployTarget({
        hostname: 'teste.linkhelp.app',
        explicitTarget: 'production',
        vercelEnv: 'production',
      }),
    ).toBe('staging');
    expect(
      classifyDeployTarget({
        hostname: 'www.linkhelp.app',
        explicitTarget: 'staging',
        vercelEnv: 'preview',
      }),
    ).toBe('production');
  });

  it('1. staging accepts Test + kqwl', () => {
    setStagingEnv();
    const result = assertServerEnvironmentIsolation({ stripeKey: 'sk_test_51FakeStagingOnly' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.deployTarget).toBe('staging');
      expect(result.projectRef).toBe(CANONICAL_STAGING_SUPABASE_REF);
    }
  });

  it('teste.linkhelp.app accepts only kqwl', () => {
    expect(classifyDeployTarget({ hostname: 'teste.linkhelp.app' })).toBe('staging');
    expect(
      assertSupabaseRefMatchesDeployTarget({
        supabaseUrl: stagingUrl,
        deployTarget: 'staging',
      }),
    ).toBeNull();
  });

  it('2. production accepts Live + mttj', () => {
    setProductionEnv();
    const result = assertServerEnvironmentIsolation({ stripeKey: 'sk_live_51FakeProductionOnly' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.deployTarget).toBe('production');
      expect(result.projectRef).toBe(PRODUCTION_SUPABASE_REF);
    }
  });

  it('3. staging rejects production Supabase', () => {
    expect(
      assertSupabaseRefMatchesDeployTarget({ supabaseUrl: prodUrl, deployTarget: 'staging' })?.code,
    ).toBe('STAGING_HOST_USES_PRODUCTION_SUPABASE');
    setStagingEnv({ SUPABASE_URL: prodUrl, VITE_SUPABASE_URL: prodUrl });
    const result = assertServerEnvironmentIsolation({ stripeKey: 'sk_test_51FakeStagingOnly' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issue.code).toBe('STAGING_HOST_USES_PRODUCTION_SUPABASE');
  });

  it('4. production rejects staging Supabase', () => {
    expect(
      assertSupabaseRefMatchesDeployTarget({ supabaseUrl: stagingUrl, deployTarget: 'production' })
        ?.code,
    ).toBe('PRODUCTION_HOST_USES_STAGING_SUPABASE');
    setProductionEnv({ SUPABASE_URL: stagingUrl, VITE_SUPABASE_URL: stagingUrl });
    const result = assertServerEnvironmentIsolation({ stripeKey: 'sk_live_51FakeProductionOnly' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issue.code).toBe('PRODUCTION_HOST_USES_STAGING_SUPABASE');
  });

  it('teste.linkhelp.app rejects production and former/unknown refs', () => {
    expect(
      assertSupabaseRefMatchesDeployTarget({ supabaseUrl: prodUrl, deployTarget: 'staging' })?.code,
    ).toBe('STAGING_HOST_USES_PRODUCTION_SUPABASE');
    expect(
      assertSupabaseRefMatchesDeployTarget({
        supabaseUrl: formerIncorrectStagingUrl,
        deployTarget: 'staging',
      })?.code,
    ).toBe('DEPLOY_TARGET_REF_MISMATCH');
    expect(
      assertSupabaseRefMatchesDeployTarget({
        supabaseUrl: unknownRefUrl,
        deployTarget: 'staging',
      })?.code,
    ).toBe('DEPLOY_TARGET_REF_MISMATCH');
  });

  it('production rejects staging kqwl, former neij, and unknown refs', () => {
    expect(
      assertSupabaseRefMatchesDeployTarget({ supabaseUrl: stagingUrl, deployTarget: 'production' })
        ?.code,
    ).toBe('PRODUCTION_HOST_USES_STAGING_SUPABASE');
    expect(
      assertSupabaseRefMatchesDeployTarget({
        supabaseUrl: formerIncorrectStagingUrl,
        deployTarget: 'production',
      })?.code,
    ).toBe('DEPLOY_TARGET_REF_MISMATCH');
    expect(
      assertSupabaseRefMatchesDeployTarget({
        supabaseUrl: unknownRefUrl,
        deployTarget: 'production',
      })?.code,
    ).toBe('DEPLOY_TARGET_REF_MISMATCH');
  });

  it('production hosts stay classified as production', () => {
    expect(classifyDeployTarget({ hostname: 'flux.linkhelp.app' })).toBe('production');
    expect(classifyDeployTarget({ hostname: 'app.linkhelp.app' })).toBe('production');
    expect(classifyDeployTarget({ hostname: 'www.linkhelp.app' })).toBe('production');
  });

  it('frontend/backend ref mismatch blocks', () => {
    expect(
      assertFrontendBackendSameProject({
        frontendSupabaseUrl: stagingUrl,
        backendSupabaseUrl: prodUrl,
      })?.code,
    ).toBe('FRONTEND_BACKEND_REF_MISMATCH');
  });
});

describe('environmentIsolation — Stripe fail-closed', () => {
  it('5. staging rejects sk_live', () => {
    expect(
      assertStripeMatchesDeployTarget({ deployTarget: 'staging', stripeKey: 'sk_live_51Fake' })?.code,
    ).toBe('STRIPE_LIVE_ON_STAGING');
    setStagingEnv({ STRIPE_SECRET_KEY: 'sk_live_51Fake' });
    const result = assertServerEnvironmentIsolation({ stripeKey: 'sk_live_51Fake' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issue.code).toBe('STRIPE_LIVE_ON_STAGING');
  });

  it('6. production rejects sk_test', () => {
    expect(
      assertStripeMatchesDeployTarget({ deployTarget: 'production', stripeKey: 'sk_test_51Fake' })
        ?.code,
    ).toBe('STRIPE_TEST_ON_PRODUCTION');
    setProductionEnv({ STRIPE_SECRET_KEY: 'sk_test_51Fake' });
    const result = assertServerEnvironmentIsolation({ stripeKey: 'sk_test_51Fake' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issue.code).toBe('STRIPE_TEST_ON_PRODUCTION');
  });

  it('7. webhook staging rejects livemode=true', () => {
    expect(
      assertStripeLivemodeMatchesDeployTarget({ deployTarget: 'staging', livemode: true })?.code,
    ).toBe('STRIPE_LIVE_EVENT_ON_STAGING');
    expect(assertStripeLivemodeMatchesDeployTarget({ deployTarget: 'staging', livemode: false })).toBeNull();
  });

  it('8. webhook production rejects livemode=false', () => {
    expect(
      assertStripeLivemodeMatchesDeployTarget({ deployTarget: 'production', livemode: false })?.code,
    ).toBe('STRIPE_TEST_EVENT_ON_PRODUCTION');
    expect(assertStripeLivemodeMatchesDeployTarget({ deployTarget: 'production', livemode: true })).toBeNull();
  });

  it('unknown or missing Stripe mode blocks staging/production financial ops', () => {
    expect(
      assertStripeMatchesDeployTarget({
        deployTarget: 'staging',
        stripeKey: 'whsec_fakeWebhookSecret',
        requireKnownMode: true,
      })?.code,
    ).toBe('STRIPE_MODE_UNKNOWN');
    expect(
      assertStripeMatchesDeployTarget({
        deployTarget: 'production',
        stripeKey: '',
        requireKnownMode: true,
      })?.code,
    ).toBe('STRIPE_KEY_MISSING');
  });
});

describe('environmentIsolation — checkout return URLs', () => {
  it('9. staging return cannot point to www', () => {
    const resolved = resolveCheckoutReturnOrigin({
      clientOrigin: 'https://www.linkhelp.app',
      siteUrl: 'https://teste.linkhelp.app',
      deployTarget: 'staging',
    });
    expect(resolved.origin).toBeNull();
    expect(resolved.issue?.code).toBe('CHECKOUT_ORIGIN_CROSS_ENV');
    expect(
      assertSiteUrlMatchesDeployTarget({
        siteUrl: 'https://www.linkhelp.app',
        deployTarget: 'staging',
      })?.code,
    ).toBe('STAGING_SITE_URL_MISMATCH');
  });

  it('10. production return cannot point to teste', () => {
    const resolved = resolveCheckoutReturnOrigin({
      clientOrigin: 'https://teste.linkhelp.app',
      siteUrl: 'https://www.linkhelp.app',
      deployTarget: 'production',
    });
    expect(resolved.origin).toBeNull();
    expect(resolved.issue?.code).toBe('CHECKOUT_ORIGIN_CROSS_ENV');
    expect(
      assertSiteUrlMatchesDeployTarget({
        siteUrl: 'https://teste.linkhelp.app',
        deployTarget: 'production',
      })?.code,
    ).toBe('PRODUCTION_SITE_URL_MISMATCH');
  });

  it('staging return accepts teste; production accepts www', () => {
    expect(
      resolveCheckoutReturnOrigin({
        clientOrigin: 'https://teste.linkhelp.app',
        deployTarget: 'staging',
      }).origin,
    ).toBe('https://teste.linkhelp.app');
    expect(
      resolveCheckoutReturnOrigin({
        clientOrigin: 'https://www.linkhelp.app',
        deployTarget: 'production',
      }).origin,
    ).toBe('https://www.linkhelp.app');
  });

  it('public errors never embed refs or secrets', () => {
    const msg = isolationPublicErrorMessage({
      code: 'STAGING_HOST_USES_PRODUCTION_SUPABASE',
      message: 'internal',
    });
    expect(msg).not.toMatch(/mttj|neij|kqwl|supabase\.co|sk_live|sk_test/i);
    expect(
      isolationPublicErrorMessage({
        code: 'DEPLOY_TARGET_REF_MISMATCH',
        message: 'internal neijuzpbjectelyxkapw kqwlgpnmjpohzjsrnnih',
      }),
    ).not.toMatch(/neijuz|kqwlgp|mttjba/i);
  });
});
