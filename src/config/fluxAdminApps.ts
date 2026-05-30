/** Multi-app registry for FLUX Admin — extend when new products join the suite. */
export type FluxAdminApp = {
  id: string;
  name: string;
  slug: string;
  status: 'live' | 'beta' | 'planned';
  accent: string;
};

export const FLUX_ADMIN_APPS: FluxAdminApp[] = [
  {
    id: 'linkhelp',
    name: 'LinkHelp',
    slug: 'linkhelp',
    status: 'live',
    accent: '#33B6FF',
  },
  {
    id: 'flux-core',
    name: 'FLUX Core',
    slug: 'flux',
    status: 'beta',
    accent: '#A78BFA',
  },
];

export const DEFAULT_FLUX_APP_ID = 'linkhelp';
