import {
  STRIPE_PRICE_ENV_KEYS,
  getLinkCreditPackageDefinition,
  isLinkCreditPackageId,
  type LinkCreditPackageDefinition,
  type LinkCreditPackageId,
} from '../../../shared/linkCreditCatalog.js';

export type { LinkCreditPackageId };

export type ServerLinkCreditPackage = LinkCreditPackageDefinition & {
  priceId: string;
};

function readPriceId(packageId: LinkCreditPackageId): string | null {
  const envName = STRIPE_PRICE_ENV_KEYS[packageId];
  const value = process.env[envName]?.trim() ?? '';
  if (!value || !value.startsWith('price_')) return null;
  return value;
}

export function getLinkCreditPackage(packageId: string): ServerLinkCreditPackage | undefined {
  if (!isLinkCreditPackageId(packageId)) return undefined;
  const def = getLinkCreditPackageDefinition(packageId);
  const priceId = readPriceId(packageId);
  if (!def || !priceId) return undefined;
  return { ...def, priceId };
}

export type PurchaseAudience = 'helper' | 'client';

export type CheckoutCreditResolution =
  | { ok: true; pkg: ServerLinkCreditPackage; audience: PurchaseAudience }
  | {
      ok: false;
      code:
        | 'PACKAGE_NOT_FOUND'
        | 'PRICE_ID_UNCONFIGURED'
        | 'CREDITS_MISMATCH'
        | 'PRICE_ID_MISMATCH'
        | 'AUDIENCE_INVALID';
    };

export function resolveCheckoutCreditFromServer(input: {
  packageId?: string | null;
  credits?: number | string | null;
  priceId?: string | null;
  audience?: string | null;
}): CheckoutCreditResolution {
  if (!input.packageId || !isLinkCreditPackageId(input.packageId)) {
    return { ok: false, code: 'PACKAGE_NOT_FOUND' };
  }

  const pkg = getLinkCreditPackage(input.packageId);
  if (!pkg) {
    return { ok: false, code: 'PRICE_ID_UNCONFIGURED' };
  }

  if (input.credits != null && String(input.credits).trim() !== '') {
    const claimed = Number.parseInt(String(input.credits), 10);
    if (!Number.isFinite(claimed) || claimed !== pkg.credits) {
      return { ok: false, code: 'CREDITS_MISMATCH' };
    }
  }

  if (input.priceId != null && input.priceId.trim() !== '' && input.priceId.trim() !== pkg.priceId) {
    return { ok: false, code: 'PRICE_ID_MISMATCH' };
  }

  const rawAudience = input.audience?.trim();
  if (rawAudience && rawAudience !== 'helper' && rawAudience !== 'client') {
    return { ok: false, code: 'AUDIENCE_INVALID' };
  }

  return {
    ok: true,
    pkg,
    audience: rawAudience === 'client' ? 'client' : 'helper',
  };
}
