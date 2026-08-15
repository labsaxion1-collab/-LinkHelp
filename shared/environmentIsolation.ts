/**
 * Environment isolation — Production vs Staging Supabase / Stripe / SITE_URL.
 * Pure helpers (browser + Vercel API). Never log secrets or full key values.
 */

/** Production Supabase (live app). */
export const PRODUCTION_SUPABASE_REF = 'mttjbaiiaeiqqmnwnzwr';

/**
 * Canonical staging Supabase for teste.linkhelp.app.
 * Do not point Preview / teste at any other project (including Production).
 */
export const CANONICAL_STAGING_SUPABASE_REF = 'kqwlgpnmjpohzjsrnnih';

export const STAGING_TEST_HOSTNAME = 'teste.linkhelp.app';
export const STAGING_TEST_ORIGIN = 'https://teste.linkhelp.app';
export const PRODUCTION_CANONICAL_HOSTNAME = 'www.linkhelp.app';
export const PRODUCTION_CANONICAL_ORIGIN = 'https://www.linkhelp.app';

export const PRODUCTION_APP_HOSTNAMES = [
  'www.linkhelp.app',
  'app.linkhelp.app',
  'linkhelp.app',
  'flux.linkhelp.app',
] as const;

export type LinkhelpDeployTarget = 'production' | 'staging' | 'local' | 'unknown';

export type EnvironmentIsolationIssue = {
  code:
    | 'MISSING_SUPABASE_URL'
    | 'INVALID_SUPABASE_URL'
    | 'STAGING_HOST_USES_PRODUCTION_SUPABASE'
    | 'PRODUCTION_HOST_USES_STAGING_SUPABASE'
    | 'DEPLOY_TARGET_REF_MISMATCH'
    | 'STRIPE_LIVE_ON_STAGING'
    | 'STRIPE_TEST_ON_PRODUCTION'
    | 'STRIPE_MODE_UNKNOWN'
    | 'STRIPE_KEY_MISSING'
    | 'STRIPE_LIVE_EVENT_ON_STAGING'
    | 'STRIPE_TEST_EVENT_ON_PRODUCTION'
    | 'FRONTEND_BACKEND_REF_MISMATCH'
    | 'SITE_URL_MISSING'
    | 'SITE_URL_INVALID'
    | 'STAGING_SITE_URL_MISMATCH'
    | 'PRODUCTION_SITE_URL_MISMATCH'
    | 'CHECKOUT_ORIGIN_CROSS_ENV';
  message: string;
};

export function extractSupabaseProjectRef(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return m ? m[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Only the canonical staging ref is allowed. */
export function resolveAllowedStagingRefs(): Set<string> {
  return new Set([CANONICAL_STAGING_SUPABASE_REF]);
}

export function isProductionSupabaseRef(ref: string | null | undefined): boolean {
  return Boolean(ref && ref.toLowerCase() === PRODUCTION_SUPABASE_REF);
}

export function isCanonicalStagingSupabaseRef(ref: string | null | undefined): boolean {
  return Boolean(ref && ref.toLowerCase() === CANONICAL_STAGING_SUPABASE_REF);
}

export function isStagingSupabaseRef(ref: string | null | undefined): boolean {
  return isCanonicalStagingSupabaseRef(ref);
}

export function classifyHostname(hostname: string | null | undefined): LinkhelpDeployTarget {
  if (!hostname) return 'unknown';
  const h = hostname.toLowerCase();
  if (h === STAGING_TEST_HOSTNAME) return 'staging';
  if (h === 'localhost' || h === '127.0.0.1') return 'local';
  if ((PRODUCTION_APP_HOSTNAMES as readonly string[]).includes(h)) return 'production';
  if (h.endsWith('.vercel.app')) {
    if (h.includes('-git-staging-') || h.includes('staging')) return 'staging';
    return 'unknown';
  }
  return 'unknown';
}

export function classifyDeployTarget(input: {
  hostname?: string | null;
  vercelEnv?: string | null;
  explicitTarget?: string | null;
}): LinkhelpDeployTarget {
  // Known hosts win over env flags — prevents Preview/Production mis-flags from
  // allowing teste↔production or www↔staging mixes.
  const hostTarget = classifyHostname(input.hostname);
  if (hostTarget === 'staging' || hostTarget === 'production') return hostTarget;

  const explicit = input.explicitTarget?.trim().toLowerCase();
  if (explicit === 'production' || explicit === 'prod') return 'production';
  if (explicit === 'staging' || explicit === 'preview' || explicit === 'test') return 'staging';

  const ve = input.vercelEnv?.trim().toLowerCase();
  if (ve === 'preview') return 'staging';
  if (ve === 'production') return 'production';

  return hostTarget;
}

export function detectStripeMode(
  secretOrPublishableKey: string | null | undefined,
): 'live' | 'test' | 'unknown' {
  if (!secretOrPublishableKey) return 'unknown';
  const v = secretOrPublishableKey.trim();
  if (v.startsWith('sk_live') || v.startsWith('pk_live') || v.startsWith('rk_live')) return 'live';
  if (v.startsWith('sk_test') || v.startsWith('pk_test') || v.startsWith('rk_test')) return 'test';
  // whsec_* does not encode test vs live — cannot classify webhook secrets by prefix alone.
  return 'unknown';
}

export function assertSupabaseRefMatchesDeployTarget(input: {
  supabaseUrl: string | null | undefined;
  deployTarget: LinkhelpDeployTarget;
}): EnvironmentIsolationIssue | null {
  if (!input.supabaseUrl?.trim()) {
    return { code: 'MISSING_SUPABASE_URL', message: 'Supabase URL is not configured for this environment.' };
  }
  const ref = extractSupabaseProjectRef(input.supabaseUrl);
  if (!ref) {
    return { code: 'INVALID_SUPABASE_URL', message: 'Supabase URL is invalid or not a *.supabase.co project.' };
  }

  if (input.deployTarget === 'staging' && isProductionSupabaseRef(ref)) {
    return {
      code: 'STAGING_HOST_USES_PRODUCTION_SUPABASE',
      message: 'Staging/test host must not use the production Supabase project.',
    };
  }

  if (input.deployTarget === 'production' && isStagingSupabaseRef(ref)) {
    return {
      code: 'PRODUCTION_HOST_USES_STAGING_SUPABASE',
      message: 'Production host must not use a staging Supabase project.',
    };
  }

  if (input.deployTarget === 'staging' && !isCanonicalStagingSupabaseRef(ref)) {
    return {
      code: 'DEPLOY_TARGET_REF_MISMATCH',
      message: 'Staging/test environment must use the canonical staging Supabase project.',
    };
  }

  if (input.deployTarget === 'production' && !isProductionSupabaseRef(ref)) {
    return {
      code: 'DEPLOY_TARGET_REF_MISMATCH',
      message: 'Production environment is not pointed at the production Supabase project.',
    };
  }

  return null;
}

/**
 * Fail-closed Stripe mode check for staging/production.
 * Unknown / missing keys block financial operations (no optional bypass flag).
 */
export function assertStripeMatchesDeployTarget(input: {
  deployTarget: LinkhelpDeployTarget;
  stripeKey: string | null | undefined;
  /** When true, missing/unknown mode is an error (checkout / webhook). */
  requireKnownMode?: boolean;
}): EnvironmentIsolationIssue | null {
  const requireKnown = input.requireKnownMode !== false;
  const key = input.stripeKey?.trim() ?? '';
  if (!key) {
    if (requireKnown && (input.deployTarget === 'staging' || input.deployTarget === 'production')) {
      return { code: 'STRIPE_KEY_MISSING', message: 'Stripe key is not configured for this environment.' };
    }
    return null;
  }

  const mode = detectStripeMode(key);
  if (mode === 'unknown') {
    if (requireKnown && (input.deployTarget === 'staging' || input.deployTarget === 'production')) {
      return {
        code: 'STRIPE_MODE_UNKNOWN',
        message: 'Stripe key mode could not be determined (expected sk_test_/sk_live_ or pk_test_/pk_live_).',
      };
    }
    return null;
  }

  if (input.deployTarget === 'staging' && mode === 'live') {
    return {
      code: 'STRIPE_LIVE_ON_STAGING',
      message: 'Staging must use Stripe Test keys, not Live.',
    };
  }
  if (input.deployTarget === 'production' && mode === 'test') {
    return {
      code: 'STRIPE_TEST_ON_PRODUCTION',
      message: 'Production must use Stripe Live keys, not Test.',
    };
  }
  return null;
}

/** Staging rejects Live events; production rejects Test events. */
export function assertStripeLivemodeMatchesDeployTarget(input: {
  deployTarget: LinkhelpDeployTarget;
  livemode: boolean;
}): EnvironmentIsolationIssue | null {
  if (input.deployTarget === 'staging' && input.livemode) {
    return {
      code: 'STRIPE_LIVE_EVENT_ON_STAGING',
      message: 'Staging webhook must not process Stripe Live events.',
    };
  }
  if (input.deployTarget === 'production' && !input.livemode) {
    return {
      code: 'STRIPE_TEST_EVENT_ON_PRODUCTION',
      message: 'Production webhook must not process Stripe Test events.',
    };
  }
  return null;
}

export function assertFrontendBackendSameProject(input: {
  frontendSupabaseUrl: string | null | undefined;
  backendSupabaseUrl: string | null | undefined;
}): EnvironmentIsolationIssue | null {
  const front = input.frontendSupabaseUrl?.trim() ?? '';
  const back = input.backendSupabaseUrl?.trim() ?? '';
  if (!front || !back) return null;
  const a = extractSupabaseProjectRef(front);
  const b = extractSupabaseProjectRef(back);
  if (!a || !b) return null;
  if (a !== b) {
    return {
      code: 'FRONTEND_BACKEND_REF_MISMATCH',
      message: 'Frontend and backend Supabase project refs do not match.',
    };
  }
  return null;
}

export function extractHostnameFromSiteUrl(siteUrl: string | null | undefined): string | null {
  if (!siteUrl?.trim()) return null;
  try {
    let raw = siteUrl.trim();
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function allowedCheckoutHostnames(deployTarget: LinkhelpDeployTarget): readonly string[] {
  if (deployTarget === 'staging') return [STAGING_TEST_HOSTNAME];
  if (deployTarget === 'production') return PRODUCTION_APP_HOSTNAMES;
  if (deployTarget === 'local') return ['localhost', '127.0.0.1'];
  return [];
}

export function isAllowedCheckoutOrigin(
  origin: string | null | undefined,
  deployTarget: LinkhelpDeployTarget,
): boolean {
  const host = extractHostnameFromSiteUrl(origin);
  if (!host) return false;
  if (deployTarget === 'staging' && (PRODUCTION_APP_HOSTNAMES as readonly string[]).includes(host)) {
    return false;
  }
  if (deployTarget === 'production' && host === STAGING_TEST_HOSTNAME) {
    return false;
  }
  return allowedCheckoutHostnames(deployTarget).includes(host);
}

/**
 * SITE_URL / VITE_SITE_URL must match deploy target.
 * teste.linkhelp.app is staging-only; production hosts are production-only.
 */
export function assertSiteUrlMatchesDeployTarget(input: {
  siteUrl: string | null | undefined;
  deployTarget: LinkhelpDeployTarget;
  requirePresent?: boolean;
}): EnvironmentIsolationIssue | null {
  const requirePresent =
    input.requirePresent === true ||
    input.deployTarget === 'staging' ||
    input.deployTarget === 'production';
  const raw = input.siteUrl?.trim() ?? '';
  if (!raw) {
    if (requirePresent) {
      return { code: 'SITE_URL_MISSING', message: 'SITE_URL is not configured for this environment.' };
    }
    return null;
  }
  const host = extractHostnameFromSiteUrl(raw);
  if (!host) {
    return { code: 'SITE_URL_INVALID', message: 'SITE_URL is invalid.' };
  }

  if (input.deployTarget === 'staging') {
    if ((PRODUCTION_APP_HOSTNAMES as readonly string[]).includes(host)) {
      return {
        code: 'STAGING_SITE_URL_MISMATCH',
        message: 'Staging SITE_URL must not use a production hostname.',
      };
    }
    if (host !== STAGING_TEST_HOSTNAME && !host.endsWith('.vercel.app')) {
      return {
        code: 'STAGING_SITE_URL_MISMATCH',
        message: 'Staging SITE_URL must be teste.linkhelp.app (or the staging Preview host).',
      };
    }
  }

  if (input.deployTarget === 'production') {
    if (host === STAGING_TEST_HOSTNAME) {
      return {
        code: 'PRODUCTION_SITE_URL_MISMATCH',
        message: 'Production SITE_URL must not use teste.linkhelp.app.',
      };
    }
    if (!(PRODUCTION_APP_HOSTNAMES as readonly string[]).includes(host)) {
      return {
        code: 'PRODUCTION_SITE_URL_MISMATCH',
        message: 'Production SITE_URL must use an official production hostname.',
      };
    }
  }

  return null;
}

export function resolveCheckoutReturnOrigin(input: {
  clientOrigin?: string | null;
  siteUrl?: string | null;
  deployTarget: LinkhelpDeployTarget;
}): { origin: string | null; issue: EnvironmentIsolationIssue | null } {
  const clientHost = extractHostnameFromSiteUrl(input.clientOrigin);
  if (input.clientOrigin?.trim()) {
    if (input.deployTarget === 'staging' && clientHost && (PRODUCTION_APP_HOSTNAMES as readonly string[]).includes(clientHost)) {
      return {
        origin: null,
        issue: {
          code: 'CHECKOUT_ORIGIN_CROSS_ENV',
          message: 'Staging checkout must not return to a production hostname.',
        },
      };
    }
    if (input.deployTarget === 'production' && clientHost === STAGING_TEST_HOSTNAME) {
      return {
        origin: null,
        issue: {
          code: 'CHECKOUT_ORIGIN_CROSS_ENV',
          message: 'Production checkout must not return to teste.linkhelp.app.',
        },
      };
    }
    if (isAllowedCheckoutOrigin(input.clientOrigin, input.deployTarget)) {
      const host = extractHostnameFromSiteUrl(input.clientOrigin);
      const proto = input.deployTarget === 'local' ? 'http' : 'https';
      return { origin: host ? `${proto}://${host}` : null, issue: null };
    }
  }

  const siteIssue = assertSiteUrlMatchesDeployTarget({
    siteUrl: input.siteUrl,
    deployTarget: input.deployTarget,
    requirePresent: input.deployTarget === 'staging' || input.deployTarget === 'production',
  });
  if (siteIssue) return { origin: null, issue: siteIssue };

  const siteHost = extractHostnameFromSiteUrl(input.siteUrl);
  if (siteHost && isAllowedCheckoutOrigin(`https://${siteHost}`, input.deployTarget)) {
    const proto = input.deployTarget === 'local' ? 'http' : 'https';
    return { origin: `${proto}://${siteHost}`, issue: null };
  }

  return { origin: null, issue: null };
}

/** Safe public error for clients — no secrets, no project refs, no URLs. */
export function isolationPublicErrorMessage(issue: EnvironmentIsolationIssue): string {
  switch (issue.code) {
    case 'STAGING_HOST_USES_PRODUCTION_SUPABASE':
    case 'PRODUCTION_HOST_USES_STAGING_SUPABASE':
    case 'DEPLOY_TARGET_REF_MISMATCH':
    case 'FRONTEND_BACKEND_REF_MISMATCH':
    case 'STAGING_SITE_URL_MISMATCH':
    case 'PRODUCTION_SITE_URL_MISMATCH':
    case 'SITE_URL_INVALID':
    case 'SITE_URL_MISSING':
    case 'CHECKOUT_ORIGIN_CROSS_ENV':
      return 'Environment configuration error. Contact support.';
    case 'STRIPE_LIVE_ON_STAGING':
    case 'STRIPE_TEST_ON_PRODUCTION':
    case 'STRIPE_MODE_UNKNOWN':
    case 'STRIPE_KEY_MISSING':
    case 'STRIPE_LIVE_EVENT_ON_STAGING':
    case 'STRIPE_TEST_EVENT_ON_PRODUCTION':
      return 'Payment environment configuration error. Contact support.';
    case 'MISSING_SUPABASE_URL':
    case 'INVALID_SUPABASE_URL':
      return 'Service temporarily unavailable.';
    default:
      return 'Service temporarily unavailable.';
  }
}
