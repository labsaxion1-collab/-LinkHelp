export type LinkCreditPackageId = 'starter' | 'popular' | 'pro' | 'power';

export type LinkCreditPackage = {
  id: LinkCreditPackageId;
  label: string;
  credits: number;
  price: number;
  currency: 'CAD';
  priceId: string;
  badge?: string;
};

export const LINK_CREDIT_PACKAGES: LinkCreditPackage[] = [
  {
    id: 'starter',
    label: 'Starter',
    credits: 35,
    price: 14.99,
    currency: 'CAD',
    priceId: 'price_1TcyvbFZU1PZrMJuh6RjBReM',
  },
  {
    id: 'popular',
    label: 'Popular',
    credits: 80,
    price: 29.99,
    currency: 'CAD',
    priceId: 'price_1TcywIFZU1PZrMJuJRkyrNS7',
    badge: 'Mais popular',
  },
  {
    id: 'pro',
    label: 'Pro',
    credits: 180,
    price: 59.99,
    currency: 'CAD',
    priceId: 'price_1TcywmFZU1PZrMJurJcV3kPi',
  },
  {
    id: 'power',
    label: 'Power',
    credits: 400,
    price: 119.99,
    currency: 'CAD',
    priceId: 'price_1TcyxzFZU1PZrMJufeX8zQ6K',
    badge: 'Melhor valor',
  },
];

export function getLinkCreditPackage(packageId: string): LinkCreditPackage | undefined {
  return LINK_CREDIT_PACKAGES.find((p) => p.id === packageId);
}

export function validatePackagePriceId(packageId: string, priceId: string): boolean {
  const pkg = getLinkCreditPackage(packageId);
  return pkg != null && pkg.priceId === priceId;
}
