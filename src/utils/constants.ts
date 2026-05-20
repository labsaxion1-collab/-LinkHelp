/** App route paths — single source for navigation refactors */
export const ROUTES = {
  home: '/',
  login: '/auth/login',
  signup: '/auth/register',
  /** OAuth redirect target — must be allowed in Supabase Auth → URL Configuration */
  authCallback: '/auth/callback',
  /** Shortcuts into the app (redirect to nested dashboard routes in AppRoutes) */
  clientHome: '/client',
  helperHome: '/helper',
  /** Post-OAuth / fallback entry: redirects by role (session-only; works before profile is hydrated elsewhere) */
  dashboard: '/dashboard',
  clientDashboard: '/client/dashboard',
  clientJobs: '/client/jobs',
  helperDashboard: '/helper/dashboard',
  helperOpportunities: '/helper/opportunities',
  helperPerformance: '/helper/performance',
  /** Upcoming / scheduled work for helpers */
  helperJobs: '/helper/jobs',
  /** Micro-learning & training center (PRO/Elite benefits) */
  helperTraining: '/helper/training',
  /** @deprecated Use helperJobs — kept for notification links during migration */
  helperJobsUpcoming: '/helper/jobs',
  messages: '/messages',
  ideas: '/ideas',
  notifications: '/notifications',
  map: '/map',
  payments: '/payments',
  helperCredits: '/helper/credits',
  settings: '/settings',
} as const;
