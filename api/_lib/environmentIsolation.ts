import {
  assertFrontendBackendSameProject,
  assertSiteUrlMatchesDeployTarget,
  assertStripeMatchesDeployTarget,
  assertSupabaseRefMatchesDeployTarget,
  classifyDeployTarget,
  extractSupabaseProjectRef,
  isolationPublicErrorMessage,
  type EnvironmentIsolationIssue,
  type LinkhelpDeployTarget,
} from '../../shared/environmentIsolation.js';

export function requestHostname(req?: { headers?: Record<string, string | string[] | undefined> }): string | null {
  const raw = req?.headers?.['x-forwarded-host'] ?? req?.headers?.host;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return value.split(',')[0]?.trim().split(':')[0]?.toLowerCase() || null;
}

export function resolveServerDeployTarget(reqHost?: string | null): LinkhelpDeployTarget {
  return classifyDeployTarget({
    hostname: reqHost ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? process.env.VITE_VERCEL_ENV ?? null,
    explicitTarget: process.env.LINKHELP_DEPLOY_TARGET ?? process.env.VITE_LINKHELP_DEPLOY_TARGET ?? null,
  });
}

export function getServerSupabaseUrl(): string | null {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  return url || null;
}

export function getServerSiteUrlEnv(): string | null {
  const url = (process.env.SITE_URL || process.env.VITE_SITE_URL || '').trim();
  return url || null;
}

/**
 * Fail-closed for staging/production. Local/unknown only when LINKHELP_ENFORCE_ISOLATION=true.
 */
export function assertServerEnvironmentIsolation(input?: {
  hostname?: string | null;
  stripeKey?: string | null;
  requireStripeMode?: boolean;
  requireSiteUrl?: boolean;
}): { ok: true; deployTarget: LinkhelpDeployTarget; projectRef: string | null } | {
  ok: false;
  issue: EnvironmentIsolationIssue;
  publicMessage: string;
} {
  const deployTarget = resolveServerDeployTarget(input?.hostname);
  const supabaseUrl = getServerSupabaseUrl();
  const enforce =
    process.env.LINKHELP_ENFORCE_ISOLATION === 'true' ||
    deployTarget === 'staging' ||
    deployTarget === 'production';

  const fail = (issue: EnvironmentIsolationIssue) => {
    console.error('[LinkHelp] environment isolation blocked', {
      code: issue.code,
      deployTarget,
      projectRef: extractSupabaseProjectRef(supabaseUrl),
    });
    return {
      ok: false as const,
      issue,
      publicMessage: isolationPublicErrorMessage(issue),
    };
  };

  if (!enforce) {
    return {
      ok: true,
      deployTarget,
      projectRef: extractSupabaseProjectRef(supabaseUrl),
    };
  }

  const refIssue = assertSupabaseRefMatchesDeployTarget({ supabaseUrl, deployTarget });
  if (refIssue) return fail(refIssue);

  const viteUrl = process.env.VITE_SUPABASE_URL?.trim() ?? '';
  const serverUrl = process.env.SUPABASE_URL?.trim() ?? '';
  if (viteUrl && serverUrl) {
    const mismatch = assertFrontendBackendSameProject({
      frontendSupabaseUrl: viteUrl,
      backendSupabaseUrl: serverUrl,
    });
    if (mismatch) return fail(mismatch);
  } else if (deployTarget === 'staging' || deployTarget === 'production') {
    if (!viteUrl || !serverUrl) {
      return fail({
        code: 'MISSING_SUPABASE_URL',
        message: 'Both VITE_SUPABASE_URL and SUPABASE_URL are required for this environment.',
      });
    }
  }

  const siteIssue = assertSiteUrlMatchesDeployTarget({
    siteUrl: getServerSiteUrlEnv(),
    deployTarget,
    requirePresent: input?.requireSiteUrl ?? true,
  });
  if (siteIssue) return fail(siteIssue);

  const stripeKey =
    input?.stripeKey ?? process.env.STRIPE_SECRET_KEY ?? process.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const stripeIssue = assertStripeMatchesDeployTarget({
    deployTarget,
    stripeKey,
    requireKnownMode: input?.requireStripeMode ?? true,
  });
  if (stripeIssue) return fail(stripeIssue);

  return {
    ok: true,
    deployTarget,
    projectRef: extractSupabaseProjectRef(supabaseUrl),
  };
}

export function assertServerDataIsolation(input?: {
  hostname?: string | null;
}): ReturnType<typeof assertServerEnvironmentIsolation> {
  return assertServerEnvironmentIsolation({
    ...input,
    requireStripeMode: false,
    requireSiteUrl: true,
    stripeKey: process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY || undefined,
  });
}

export {
  extractSupabaseProjectRef,
  isolationPublicErrorMessage,
  type EnvironmentIsolationIssue,
  type LinkhelpDeployTarget,
};
