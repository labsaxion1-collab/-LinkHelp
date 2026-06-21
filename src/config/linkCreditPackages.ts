export type LinkCreditPackageId = 'starter' | 'popular' | 'pro' | 'power';

export type LinkCreditPackageBadgeKey = 'badge_popular' | 'badge_best_value';

export type LinkCreditPackage = {
  id: LinkCreditPackageId;
  credits: number;
  price: number;
  currency: 'CAD';
  priceId: string;
  badgeKey?: LinkCreditPackageBadgeKey;
};

export const LINK_CREDIT_PACKAGES: LinkCreditPackage[] = [
  {
    id: 'starter',
    credits: 35,
    price: 14.99,
    currency: 'CAD',
    priceId: 'price_1TcyvbFZU1PZrMJuh6RjBReM',
  },
  {
    id: 'popular',
    credits: 80,
    price: 29.99,
    currency: 'CAD',
    priceId: 'price_1TcywIFZU1PZrMJuJRkyrNS7',
    badgeKey: 'badge_popular',
  },
  {
    id: 'pro',
    credits: 180,
    price: 59.99,
    currency: 'CAD',
    priceId: 'price_1TcywmFZU1PZrMJurJcV3kPi',
  },
  {
    id: 'power',
    credits: 400,
    price: 119.99,
    currency: 'CAD',
    priceId: 'price_1TcyxzFZU1PZrMJufeX8zQ6K',
    badgeKey: 'badge_best_value',
  },
];

export function getLinkCreditPackage(packageId: string): LinkCreditPackage | undefined {
  return LINK_CREDIT_PACKAGES.find((p) => p.id === packageId);
}

export function validatePackagePriceId(packageId: string, priceId: string): boolean {
  const pkg = getLinkCreditPackage(packageId);
  return pkg != null && pkg.priceId === priceId;
}
