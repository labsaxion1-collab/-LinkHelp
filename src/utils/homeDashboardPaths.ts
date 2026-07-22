import { ROUTES } from '@/utils/constants';

/** Authenticated home tabs that share the hero + feed footprint. */
export function isAuthenticatedHomeDashboardPath(pathname: string): boolean {
  return (
    pathname === ROUTES.clientDashboard ||
    pathname === ROUTES.clientJobs ||
    pathname === ROUTES.helperDashboard ||
    pathname === ROUTES.helperOpportunities ||
    pathname === ROUTES.helperPerformance
  );
}
