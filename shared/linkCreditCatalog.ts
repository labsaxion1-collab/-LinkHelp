/** Public LinkCredit package catalog. Credits and CAD prices are fixed server-side. */

export type LinkCreditPackageId = 'starter' | 'popular' | 'pro' | 'power';

export type LinkCreditPackageDefinition = {
  id: LinkCreditPackageId;
  credits: number;
  price: number;
  currency: 'CAD';
};

export const LINK_CREDIT_PACKAGE_CATALOG: readonly LinkCreditPackageDefinition[] = [
  { id: 'starter', credits: 35, price: 14.99, currency: 'CAD' },
  { id: 'popular', credits: 80, price: 29.99, currency: 'CAD' },
  { id: 'pro', credits: 180, price: 59.99, currency: 'CAD' },
  { id: 'power', credits: 400, price: 119.99, currency: 'CAD' },
] as const;

export const STRIPE_PRICE_ENV_KEYS = {
  starter: 'STRIPE_PRICE_STARTER',
  popular: 'STRIPE_PRICE_POPULAR',
  pro: 'STRIPE_PRICE_PRO',
  power: 'STRIPE_PRICE_POWER',
} as const satisfies Record<LinkCreditPackageId, string>;

export function isLinkCreditPackageId(value: string | null | undefined): value is LinkCreditPackageId {
  return LINK_CREDIT_PACKAGE_CATALOG.some((pkg) => pkg.id === value);
}

export function getLinkCreditPackageDefinition(
  packageId: string | null | undefined,
): LinkCreditPackageDefinition | undefined {
  if (!packageId) return undefined;
  return LINK_CREDIT_PACKAGE_CATALOG.find((pkg) => pkg.id === packageId);
}
