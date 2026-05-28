import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { getBrowserTimezone } from '@/utils/browserTimezone';
import { distanceBucket } from '@/utils/distanceBucket';
import { refreshRequestLeadQuality } from '@/services/leadQualityRemote';

export type MarketSignalEvent =
  | 'opened'
  | 'interested'
  | 'not_interested'
  | 'proposal_sent'
  | 'hired'
  | 'cancelled';

/** @deprecated legacy alias */
export type MarketSignalKind = 'ignore' | 'interest' | 'applied' | 'hired';

export type MarketSignalSource = 'swipe' | 'modal' | 'details' | 'recommendation' | 'system';

export type MarketSignalPayload = {
  requestId: string;
  helperId?: string | null;
  event: MarketSignalEvent;
  /** Legacy mapping for local queue */
  kind?: MarketSignalKind;
  category?: string | null;
  city?: string | null;
  province?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  distanceKm?: number | null;
  source?: MarketSignalSource;
  timezone?: string | null;
  at?: number;
};

const LOCAL_KEY = 'linkhelp_market_signals_queue';

function legacySignalFromEvent(event: MarketSignalEvent): string {
  switch (event) {
    case 'not_interested':
      return 'ignore';
    case 'interested':
    case 'opened':
      return 'interest';
    case 'proposal_sent':
      return 'applied';
    case 'hired':
      return 'hired';
    case 'cancelled':
      return 'cancelled';
    default:
      return event;
  }
}

function persistLocal(payload: MarketSignalPayload) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list: MarketSignalPayload[] = raw ? (JSON.parse(raw) as MarketSignalPayload[]) : [];
    list.push({ ...payload, at: payload.at ?? Date.now() });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(-300)));
  } catch {
    /* noop */
  }
}

/** Fire-and-forget market metrics (local queue + Supabase + lead score refresh). */
export function recordMarketSignal(payload: MarketSignalPayload): void {
  const tz = payload.timezone ?? getBrowserTimezone();
  const row = { ...payload, timezone: tz, at: payload.at ?? Date.now() };
  persistLocal(row);

  void refreshRequestLeadQuality(row.requestId);

  if (!isSupabaseConfigured()) return;
  const sb = getSupabase();
  if (!sb) return;

  const bucket = distanceBucket(row.distanceKm);

  void sb
    .from('request_market_signals')
    .insert({
      request_id: row.requestId,
      helper_id: row.helperId ?? null,
      signal: legacySignalFromEvent(row.event),
      event: row.event,
      category: row.category ?? null,
      city: row.city ?? null,
      province: row.province ?? null,
      budget_min: row.budgetMin ?? null,
      budget_max: row.budgetMax ?? null,
      distance_km: row.distanceKm ?? null,
      distance_bucket: bucket,
      source: row.source ?? null,
      timezone: tz,
      created_at: new Date(row.at!).toISOString(),
    })
    .then(({ error }) => {
      if (error && import.meta.env.DEV) {
        console.warn('[LinkHelp] market signal insert skipped', error.message);
      }
    });
}

/** Convenience wrappers */
export function recordInterestSignal(
  payload: Omit<MarketSignalPayload, 'event'> & { event?: 'interested' },
): void {
  recordMarketSignal({ ...payload, event: 'interested' });
}

export function recordNotInterestedSignal(
  payload: Omit<MarketSignalPayload, 'event'>,
): void {
  recordMarketSignal({ ...payload, event: 'not_interested' });
}

export function recordProposalSentSignal(
  payload: Omit<MarketSignalPayload, 'event'>,
): void {
  recordMarketSignal({ ...payload, event: 'proposal_sent' });
}
