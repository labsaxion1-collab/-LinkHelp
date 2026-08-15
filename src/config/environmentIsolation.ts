import {
  assertSiteUrlMatchesDeployTarget,
  assertStripeMatchesDeployTarget,
  assertSupabaseRefMatchesDeployTarget,
  classifyDeployTarget,
  extractSupabaseProjectRef,
  isolationPublicErrorMessage,
  CANONICAL_STAGING_SUPABASE_REF,
  PRODUCTION_SUPABASE_REF,
  type EnvironmentIsolationIssue,
  type LinkhelpDeployTarget,
} from '../../shared/environmentIsolation';

export {
  CANONICAL_STAGING_SUPABASE_REF,
  PRODUCTION_SUPABASE_REF,
  extractSupabaseProjectRef,
  isolationPublicErrorMessage,
} from '../../shared/environmentIsolation';

export type { EnvironmentIsolationIssue, LinkhelpDeployTarget };

export function resolveBrowserDeployTarget(): LinkhelpDeployTarget {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : null;
  return classifyDeployTarget({
    hostname,
    vercelEnv: import.meta.env.VITE_VERCEL_ENV ?? null,
    explicitTarget: import.meta.env.VITE_LINKHELP_DEPLOY_TARGET ?? null,
  });
}

/**
 * Validates browser Supabase URL (+ optional publishable Stripe / site URL) against deploy target.
 * Public messages never include secrets or refs.
 */
export function assertBrowserEnvironmentIsolation(supabaseUrl: string | null): {
  ok: boolean;
  issue: EnvironmentIsolationIssue | null;
  publicMessage: string | null;
  deployTarget: LinkhelpDeployTarget;
  projectRef: string | null;
} {
  const deployTarget = resolveBrowserDeployTarget();
  const enforce =
    import.meta.env.VITE_LINKHELP_ENFORCE_ISOLATION === 'true' ||
    deployTarget === 'staging' ||
    deployTarget === 'production';

  const result = (
    issue: EnvironmentIsolationIssue | null,
  ): ReturnType<typeof assertBrowserEnvironmentIsolation> => {
    if (issue && enforce) {
      if (import.meta.env.DEV) {
        console.error('[LinkHelp] environment isolation blocked', {
          code: issue.code,
          deployTarget,
          projectRef: extractSupabaseProjectRef(supabaseUrl),
        });
      } else {
        console.error('[LinkHelp] environment isolation blocked', { code: issue.code, deployTarget });
      }
      return {
        ok: false,
        issue,
        publicMessage: isolationPublicErrorMessage(issue),
        deployTarget,
        projectRef: extractSupabaseProjectRef(supabaseUrl),
      };
    }
    return {
      ok: true,
      issue: null,
      publicMessage: null,
      deployTarget,
      projectRef: extractSupabaseProjectRef(supabaseUrl),
    };
  };

  if (!enforce) {
    return result(null);
  }

  const refIssue = assertSupabaseRefMatchesDeployTarget({ supabaseUrl, deployTarget });
  if (refIssue) return result(refIssue);

  const siteIssue = assertSiteUrlMatchesDeployTarget({
    siteUrl: import.meta.env.VITE_SITE_URL ?? null,
    deployTarget,
    requirePresent: false,
  });
  if (siteIssue && siteIssue.code !== 'SITE_URL_MISSING') return result(siteIssue);

  const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
  if (pk) {
    const stripeIssue = assertStripeMatchesDeployTarget({
      deployTarget,
      stripeKey: pk,
      requireKnownMode: true,
    });
    if (stripeIssue) return result(stripeIssue);
  }

  return result(null);
}
