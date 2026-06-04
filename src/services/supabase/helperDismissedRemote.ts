import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

const STORAGE_PREFIX = 'linkhelp_helper_dismissed';

function storageKey(helperId: string): string {
  return `${STORAGE_PREFIX}:${helperId}`;
}

export function readLocalDismissedRequestIds(helperId: string): string[] {
  if (typeof window === 'undefined' || !helperId) return [];
  try {
    const raw = localStorage.getItem(storageKey(helperId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

export function persistLocalDismissedRequest(helperId: string, requestId: string): void {
  if (typeof window === 'undefined' || !helperId || !requestId) return;
  try {
    const next = new Set(readLocalDismissedRequestIds(helperId));
    next.add(requestId);
    localStorage.setItem(storageKey(helperId), JSON.stringify([...next]));
  } catch {
    /* ignore */
  }
}

/** Load request ids this helper marked as not interested (DB + local fallback). */
export async function fetchHelperNotInterestedRequestIds(helperId: string): Promise<string[]> {
  const local = readLocalDismissedRequestIds(helperId);
  if (!isSupabaseConfigured() || !helperId) return local;

  const sb = getSupabase();
  if (!sb) return local;

  const { data, error } = await sb
    .from('request_market_signals')
    .select('request_id')
    .eq('helper_id', helperId)
    .eq('event', 'not_interested');

  if (error) {
    if (import.meta.env.DEV) {
      console.warn('[LinkHelp] fetchHelperNotInterestedRequestIds', error.message);
    }
    return local;
  }

  const remote = (data ?? [])
    .map((row) => row.request_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  return [...new Set([...remote, ...local])];
}
