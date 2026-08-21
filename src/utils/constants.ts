/** App route paths — single source for navigation refactors */
export const ROUTES = {
  home: '/',
  howItWorks: '/como-funciona',
  contact: '/contato',
  login: '/auth/login',
  signup: '/auth/register',
  resetPassword: '/auth/reset-password',
  /** OAuth redirect target — must be allowed in Supabase Auth → URL Configuration */
  authCallback: '/auth/callback',
  /** FLUX console — admin-only sign-in (hostname-safe returnTo) */
  adminLogin: '/auth/admin-login',
  /** Non-admin signed in on flux.linkhelp.app */
  fluxAccessDenied: '/auth/flux-access-denied',
  /** Shortcuts into the app (redirect to nested dashboard routes in AppRoutes) */
  clientHome: '/client',
  helperHome: '/helper',
  /** Post-OAuth / fallback entry: redirects by role (session-only; works before profile is hydrated elsewhere) */
  dashboard: '/dashboard',
  clientDashboard: '/client/dashboard',
  clientJobs: '/client/jobs',
  clientCredits: '/client/credits',
  clientCreditsHistory: '/client/credits/history',
  clientCreditsSuccess: '/client/credits/success',
  helperDashboard: '/helper/dashboard',
  helperOpportunities: '/helper/opportunities',
  helperPerformance: '/helper/performance',
  /** Upcoming / scheduled work for helpers */
  helperJobs: '/helper/jobs',
  /** Helper professional history — closed applications + completed services */
  helperHistory: '/helper/history',
  /** @deprecated Use helperJobs — kept for notification links during migration */
  helperJobsUpcoming: '/helper/jobs',
  messages: '/messages',
  ideas: '/ideas',
  notifications: '/notifications',
  map: '/map',
  /** @deprecated Legacy alias — AppRoutes redirects to clientCredits */
  payments: '/payments',
  helperCredits: '/helper/credits',
  helperCreditsHistory: '/helper/credits/history',
  helperLinkCredits: '/helper/linkcredits',
  helperCreditsSuccess: '/helper/credits/success',
  /** Reserved for helper training module (settings teaser when UI_VISIBILITY.training) */
  helperTraining: '/helper/training',
  profile: '/profile',
  /** Edit own public presentation (bio, categories, preview) */
  profilePublicEdit: '/profile/public',
  settings: '/settings',
  /** FLUX multi-app admin console */
  adminDashboard: '/admin/dashboard',
  /** BackOffice P0 — read-only operational views */
  adminUsers: '/admin/users',
  adminUserDetail: '/admin/users/:userId',
  adminRequests: '/admin/requests',
  adminRequestDetail: '/admin/requests/:requestId',
  adminCredits: '/admin/credits',
  adminEconomy: '/admin/economy',
  adminAudit: '/admin/audit',
  adminSupport: '/admin/support',
  /** FLUX — gestão de administradores (admins.manage) */
  adminAdministrators: '/admin/administrators',
  /** Dev-only push notification diagnostics */
  adminPushTest: '/admin/push-test',
} as const;
