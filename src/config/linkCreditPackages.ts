import {
  LINK_CREDIT_PACKAGE_CATALOG,
  getLinkCreditPackageDefinition,
  type LinkCreditPackageId,
} from '../../shared/linkCreditCatalog';

export type { LinkCreditPackageId };

export type LinkCreditPackageBadgeKey = 'badge_popular' | 'badge_best_value';

export type LinkCreditPackage = {
  id: LinkCreditPackageId;
  credits: number;
  price: number;
  currency: 'CAD';
  badgeKey?: LinkCreditPackageBadgeKey;
};

const BADGES: Partial<Record<LinkCreditPackageId, LinkCreditPackageBadgeKey>> = {
  popular: 'badge_popular',
  power: 'badge_best_value',
};

/** Display catalog only. Stripe price IDs stay on the server. */
export const LINK_CREDIT_PACKAGES: LinkCreditPackage[] = LINK_CREDIT_PACKAGE_CATALOG.map((pkg) => ({
  id: pkg.id,
  credits: pkg.credits,
  price: pkg.price,
  currency: pkg.currency,
  badgeKey: BADGES[pkg.id],
}));

export function getLinkCreditPackage(packageId: string): LinkCreditPackage | undefined {
  const def = getLinkCreditPackageDefinition(packageId);
  if (!def) return undefined;
  return {
    id: def.id,
    credits: def.credits,
    price: def.price,
    currency: def.currency,
    badgeKey: BADGES[def.id],
  };
}
