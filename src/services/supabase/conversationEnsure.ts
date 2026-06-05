import { getSupabase } from '@/lib/supabase';
import { isPostgrestMissingResource } from '@/utils/postgrestErrors';

export type EnsureConversationInput = {
  requestId: string;
  clientId: string;
  helperId: string;
  contactUnlocked?: boolean;
};

/** One thread per request + client + helper; unlock updates the same row. */
export async function ensureConversation(input: EnsureConversationInput): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  const unlock = input.contactUnlocked ?? false;

  const { data: rpcId, error: rpcErr } = await sb.rpc('ensure_conversation', {
    p_request_id: input.requestId,
    p_client_id: input.clientId,
    p_helper_id: input.helperId,
    p_contact_unlocked: unlock,
  });

  if (!rpcErr && rpcId) {
    return rpcId as string;
  }

  if (rpcErr && !isPostgrestMissingResource(rpcErr)) {
    console.warn('[LinkHelp] ensure_conversation RPC failed, falling back', rpcErr.message);
  }

  const { data: existing, error: fetchErr } = await sb
    .from('conversations')
    .select('id, contact_unlocked')
    .eq('request_id', input.requestId)
    .eq('client_id', input.clientId)
    .eq('helper_id', input.helperId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  if (existing) {
    const row = existing as { id: string; contact_unlocked: boolean };
    if (unlock && !row.contact_unlocked) {
      const { error: upErr } = await sb
        .from('conversations')
        .update({ contact_unlocked: true })
        .eq('id', row.id);
      if (upErr) throw upErr;
    }
    return row.id;
  }

  const { data: inserted, error: insErr } = await sb
    .from('conversations')
    .insert({
      request_id: input.requestId,
      client_id: input.clientId,
      helper_id: input.helperId,
      contact_unlocked: unlock,
    })
    .select('id')
    .single();

  if (insErr?.code === '23505') {
    const { data: again } = await sb
      .from('conversations')
      .select('id, contact_unlocked')
      .eq('request_id', input.requestId)
      .eq('helper_id', input.helperId)
      .maybeSingle();
    if (!again) throw insErr;
    const row = again as { id: string; contact_unlocked: boolean };
    if (unlock && !row.contact_unlocked) {
      await sb.from('conversations').update({ contact_unlocked: true }).eq('id', row.id);
    }
    return row.id;
  }

  if (insErr || !inserted) throw insErr ?? new Error('CONVERSATION_CREATE_FAILED');
  return (inserted as { id: string }).id;
}
