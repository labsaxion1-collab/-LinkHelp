import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export type MarketSignalKind = 'ignore' | 'interest' | 'applied' | 'hired';

export type MarketSignalPayload = {
  requestId: string;
  helperId?: string | null;
  kind: MarketSignalKind;
  category?: string | null;
  city?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  distanceKm?: number | null;
  at?: number;
};

const LOCAL_KEY = 'linkhelp_market_signals_queue';

function persistLocal(payload: MarketSignalPayload) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list: MarketSignalPayload[] = raw ? (JSON.parse(raw) as MarketSignalPayload[]) : [];
    list.push({ ...payload, at: payload.at ?? Date.now() });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(-200)));
  } catch {
    /* noop */
  }
}

/** Fire-and-forget market metrics (local queue + optional Supabase). */
export function recordMarketSignal(payload: MarketSignalPayload): void {
  const row = { ...payload, at: payload.at ?? Date.now() };
  persistLocal(row);

  if (!isSupabaseConfigured()) return;
  const sb = getSupabase();
  if (!sb) return;

  void sb
    .from('request_market_signals')
    .insert({
      request_id: row.requestId,
      helper_id: row.helperId ?? null,
      signal: row.kind,
      category: row.category ?? null,
      city: row.city ?? null,
      budget_min: row.budgetMin ?? null,
      budget_max: row.budgetMax ?? null,
      distance_km: row.distanceKm ?? null,
      created_at: new Date(row.at!).toISOString(),
    })
    .then(({ error }) => {
      if (error && import.meta.env.DEV) {
        console.warn('[LinkHelp] market signal insert skipped', error.message);
      }
    });
}
