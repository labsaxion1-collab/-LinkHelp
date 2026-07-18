import type { ChatConversationSummary } from '@/services/supabase/chatRemote';

export type PeerConversationGroup = {
  peerId: string;
  peerName: string;
  peerAvatar: string;
  conversations: ChatConversationSummary[];
};

/** Group deduped conversation summaries by peer (client/helper on the other side). */
export function groupConversationsByPeer(summaries: ChatConversationSummary[]): PeerConversationGroup[] {
  const map = new Map<string, PeerConversationGroup>();
  const order: string[] = [];

  for (const summary of summaries) {
    let group = map.get(summary.peerId);
    if (!group) {
      group = {
        peerId: summary.peerId,
        peerName: summary.peerName,
        peerAvatar: summary.peerAvatar,
        conversations: [],
      };
      map.set(summary.peerId, group);
      order.push(summary.peerId);
    }
    group.conversations.push(summary);
  }

  return order.map((peerId) => map.get(peerId)!);
}
