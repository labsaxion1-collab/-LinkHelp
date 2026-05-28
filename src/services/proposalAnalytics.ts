import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { getBrowserTimezone } from '@/utils/browserTimezone';

export type ProposalAnalyticsEvent = 'opened' | 'closed' | 'cancelled' | 'submitted';
export type ProposalAnalyticsSource = 'swipe' | 'modal' | 'details' | 'recommendation';

export type ProposalAnalyticsPayload = {
  requestId: string;
  helperId: string;
  event: ProposalAnalyticsEvent;
  source?: ProposalAnalyticsSource;
  proposedAmount?: number | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  durationMs?: number | null;
  timezone?: string | null;
};

const LOCAL_KEY = 'linkhelp_proposal_analytics_queue';

function persistLocal(payload: ProposalAnalyticsPayload) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list: ProposalAnalyticsPayload[] = raw ? (JSON.parse(raw) as ProposalAnalyticsPayload[]) : [];
    list.push(payload);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(-150)));
  } catch {
    /* noop */
  }
}

export function recordProposalAnalytics(payload: ProposalAnalyticsPayload): void {
  const row = {
    ...payload,
    timezone: payload.timezone ?? getBrowserTimezone(),
  };
  persistLocal(row);

  if (!isSupabaseConfigured()) return;
  const sb = getSupabase();
  if (!sb) return;

  void sb
    .from('helper_proposal_analytics')
    .insert({
      request_id: row.requestId,
      helper_id: row.helperId,
      event: row.event,
      source: row.source ?? null,
      proposed_amount: row.proposedAmount ?? null,
      budget_min: row.budgetMin ?? null,
      budget_max: row.budgetMax ?? null,
      duration_ms: row.durationMs ?? null,
      timezone: row.timezone,
    })
    .then(({ error }) => {
      if (error && import.meta.env.DEV) {
        console.warn('[LinkHelp] proposal analytics skipped', error.message);
      }
    });
}
