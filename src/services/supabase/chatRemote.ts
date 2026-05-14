import { getSupabase } from '@/lib/supabase';
import type { ConversationRow, MessageRow } from '@/types/database';
import type { HelperSubscriptionTier } from '@/types/helperSubscription';
import { avatarUrlForName } from '@/utils/avatarUrl';
import { ROUTES } from '@/utils/constants';
import { remoteInsertNotification } from '@/services/supabase/appDataRemote';
import { fetchProfilesAsMapperMap } from '@/services/supabase/fetchUserViews';

function tierFromPlan(plan: string | null | undefined): HelperSubscriptionTier {
  const p = (plan || 'BASIC').toUpperCase();
  if (p === 'ELITE' || p === 'PRO_HELP' || p === 'BASIC') return p as HelperSubscriptionTier;
  return 'BASIC';
}

export type ChatConversationSummary = {
  id: string;
  requestId: string;
  requestTitle: string;
  contactUnlocked: boolean;
  peerId: string;
  peerName: string;
  peerAvatar: string;
  peerPlan: HelperSubscriptionTier;
};

type ConvSelectRow = ConversationRow & {
  requests?: { title: string } | { title: string }[] | null;
};

function requestTitleFromRow(row: ConvSelectRow): string {
  const r = row.requests;
  if (!r) return '—';
  if (Array.isArray(r)) return r[0]?.title ?? '—';
  return r.title ?? '—';
}

export async function fetchChatConversationSummaries(userId: string): Promise<ChatConversationSummary[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('conversations')
    .select(
      `
      id,
      request_id,
      client_id,
      helper_id,
      contact_unlocked,
      created_at,
      requests ( title )
    `,
    )
    .or(`client_id.eq.${userId},helper_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  const rows = (data ?? []) as ConvSelectRow[];
  if (rows.length === 0) return [];

  const peerIds = rows.map((r) => (r.client_id === userId ? r.helper_id : r.client_id));
  const peers = await fetchProfilesAsMapperMap(peerIds);

  return rows.map((r) => {
    const peerId = r.client_id === userId ? r.helper_id : r.client_id;
    const u = peers.get(peerId);
    const name = u?.name?.trim() || 'User';
    return {
      id: r.id,
      requestId: r.request_id,
      requestTitle: requestTitleFromRow(r),
      contactUnlocked: r.contact_unlocked,
      peerId,
      peerName: name,
      peerAvatar: u?.avatar_url || avatarUrlForName(name, 'dbeafe', '1e3a8a'),
      peerPlan: tierFromPlan(u?.plan_type),
    };
  });
}

export async function fetchChatMessages(conversationId: string): Promise<MessageRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as MessageRow[];
}

export async function insertChatMessage(conversationId: string, senderId: string, content: string): Promise<MessageRow> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');
  const { data, error } = await sb
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      read: false,
    })
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('INSERT_FAILED');
  return data as MessageRow;
}

export async function notifyPeerNewMessage(opts: {
  peerUserId: string;
  senderName: string;
  conversationId: string;
}): Promise<void> {
  await remoteInsertNotification({
    userId: opts.peerUserId,
    type: 'message',
    title: 'New message',
    message: `${opts.senderName} sent you a message.`,
    actionUrl: `${ROUTES.messages}?c=${encodeURIComponent(opts.conversationId)}`,
  });
}

export function subscribeConversationChannel(
  conversationId: string,
  handlers: {
    onInsertMessage: (row: MessageRow) => void;
    onConversationUpdated: (row: Pick<ConversationRow, 'id' | 'contact_unlocked'>) => void;
  },
): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};

  const ch = sb
    .channel(`linkhelp-conv-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        handlers.onInsertMessage(payload.new as MessageRow);
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`,
      },
      (payload) => {
        handlers.onConversationUpdated(payload.new as ConversationRow);
      },
    )
    .subscribe();

  return () => {
    sb.removeChannel(ch);
  };
}
