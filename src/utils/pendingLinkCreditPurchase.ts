/**
 * Pending LinkCredits purchase — visual toast only after Stripe return.
 * Stores package credits chosen at checkout start (not a balance source of truth).
 */

const KEY = 'lh_pending_lc_purchase_v1';
const TTL_MS = 60 * 60 * 1000;

export type PendingLinkCreditPurchase = {
  credits: number;
  role: 'client' | 'helper';
  packageId: string;
  savedAt: number;
};

function store(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function writePendingLinkCreditPurchase(input: {
  credits: number;
  role: 'client' | 'helper';
  packageId: string;
}): void {
  const s = store();
  if (!s || !Number.isFinite(input.credits) || input.credits <= 0) return;
  try {
    const payload: PendingLinkCreditPurchase = {
      credits: Math.round(input.credits),
      role: input.role,
      packageId: input.packageId,
      savedAt: Date.now(),
    };
    s.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function readPendingLinkCreditPurchase(
  expectedRole?: 'client' | 'helper',
): PendingLinkCreditPurchase | null {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingLinkCreditPurchase>;
    if (typeof parsed.credits !== 'number' || !Number.isFinite(parsed.credits) || parsed.credits <= 0) {
      s.removeItem(KEY);
      return null;
    }
    if (parsed.role !== 'client' && parsed.role !== 'helper') {
      s.removeItem(KEY);
      return null;
    }
    if (expectedRole && parsed.role !== expectedRole) return null;
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > TTL_MS) {
      s.removeItem(KEY);
      return null;
    }
    return {
      credits: Math.round(parsed.credits),
      role: parsed.role,
      packageId: typeof parsed.packageId === 'string' ? parsed.packageId : '',
      savedAt: parsed.savedAt,
    };
  } catch {
    try {
      s.removeItem(KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function clearPendingLinkCreditPurchase(): void {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
