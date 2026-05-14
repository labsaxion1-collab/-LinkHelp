import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MessageRow } from '@/types/database';
import type { HelperSubscriptionTier } from '@/types/helperSubscription';
import { getSupabase } from '@/lib/supabase';
import {
  fetchChatConversationSummaries,
  fetchChatMessages,
  insertChatMessage,
  notifyPeerNewMessage,
  subscribeConversationChannel,
  type ChatConversationSummary,
} from '@/services/supabase/chatRemote';

export type RemoteChatRow =
  | { id: string | number; kind: 'system'; text: string; time: string; variant?: 'info' | 'warn' }
  | { id: string | number; kind: 'user'; sender: 'me' | 'other'; text: string; time: string };

function formatMsgTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function rowsFromDb(messages: MessageRow[], myUserId: string): RemoteChatRow[] {
  return messages.map((m) => ({
    id: m.id,
    kind: 'user' as const,
    sender: m.sender_id === myUserId ? ('me' as const) : ('other' as const),
    text: m.content,
    time: formatMsgTime(m.created_at),
  }));
}

type UseSupabaseMessagesOpts = {
  enabled: boolean;
  userId: string | undefined;
  userDisplayName: string;
  initialConversationId?: string | null;
  searchConversationId?: string | null;
  systemIntroText: string;
};

export function useSupabaseMessages(opts: UseSupabaseMessagesOpts) {
  const { enabled, userId, userDisplayName, initialConversationId, searchConversationId, systemIntroText } = opts;

  const [summaries, setSummaries] = useState<ChatConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rows, setRows] = useState<RemoteChatRow[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [contactUnlocked, setContactUnlocked] = useState(false);
  const [requestTitle, setRequestTitle] = useState('');
  const [peerName, setPeerName] = useState('');
  const [peerAvatar, setPeerAvatar] = useState('');
  const [peerPlan, setPeerPlan] = useState<HelperSubscriptionTier>('BASIC');
  const [peerId, setPeerId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const appliedInitial = useRef(false);

  useEffect(() => {
    setSendError(null);
  }, [selectedId]);

  const loadSummaries = useCallback(async () => {
    if (!enabled || !userId) return;
    setListLoading(true);
    try {
      const list = await fetchChatConversationSummaries(userId);
      setSummaries(list);
    } finally {
      setListLoading(false);
    }
  }, [enabled, userId]);

  useEffect(() => {
    void loadSummaries();
  }, [loadSummaries]);

  const selected = useMemo(
    () => summaries.find((s) => s.id === selectedId) ?? null,
    [summaries, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setContactUnlocked(selected.contactUnlocked);
    setRequestTitle(selected.requestTitle);
    setPeerName(selected.peerName);
    setPeerAvatar(selected.peerAvatar);
    setPeerPlan(selected.peerPlan);
    setPeerId(selected.peerId);
  }, [selected]);

  useEffect(() => {
    if (!enabled || !userId) return;
    const want =
      searchConversationId ||
      initialConversationId ||
      (appliedInitial.current ? null : summaries[0]?.id) ||
      null;
    if (!want) return;
    const exists = summaries.some((s) => s.id === want);
    if (exists) {
      setSelectedId(want);
      appliedInitial.current = true;
    }
  }, [enabled, userId, summaries, initialConversationId, searchConversationId]);

  useEffect(() => {
    if (!enabled || !selectedId || !userId) {
      setRows([]);
      return;
    }

    let cancelled = false;
    let unsub: (() => void) | null = null;

    const run = async () => {
      setThreadLoading(true);
      try {
        const sb = getSupabase();
        let unlocked = false;
        if (sb) {
          const { data: conv } = await sb.from('conversations').select('contact_unlocked').eq('id', selectedId).maybeSingle();
          unlocked = Boolean((conv as { contact_unlocked?: boolean } | null)?.contact_unlocked);
        }
        const db = await fetchChatMessages(selectedId);
        if (cancelled) return;
        setContactUnlocked(unlocked);
        const intro: RemoteChatRow = {
          id: 'sys-intro',
          kind: 'system',
          text: systemIntroText,
          time: formatMsgTime(new Date().toISOString()),
          variant: 'info',
        };
        setRows([intro, ...rowsFromDb(db, userId)]);

        unsub?.();
        unsub = subscribeConversationChannel(selectedId, {
          onInsertMessage: (row) => {
            setRows((prev) => {
              if (prev.some((r) => r.kind === 'user' && r.id === row.id)) return prev;
              const next = rowsFromDb([row], userId)[0];
              return [...prev, next];
            });
          },
          onConversationUpdated: (row) => {
            if (row.id !== selectedId) return;
            setContactUnlocked(row.contact_unlocked);
            setSummaries((prev) =>
              prev.map((s) => (s.id === row.id ? { ...s, contactUnlocked: row.contact_unlocked } : s)),
            );
          },
        });
      } finally {
        if (!cancelled) setThreadLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [enabled, selectedId, userId, systemIntroText]);

  const preMatchOutgoingCount = useMemo(() => {
    if (contactUnlocked || !userId) return 0;
    return rows.filter((r) => r.kind === 'user' && r.sender === 'me').length;
  }, [rows, contactUnlocked, userId]);

  const sendRemoteMessage = useCallback(
    async (filteredText: string) => {
      if (!enabled || !selectedId || !userId || !peerId) return;
      setSendError(null);
      try {
        const row = await insertChatMessage(selectedId, userId, filteredText);
        setRows((prev) => {
          if (prev.some((r) => r.kind === 'user' && r.id === row.id)) return prev;
          return [...prev, ...rowsFromDb([row], userId)];
        });
        await notifyPeerNewMessage({
          peerUserId: peerId,
          senderName: userDisplayName,
          conversationId: selectedId,
        });
      } catch (e) {
        setSendError(e instanceof Error ? e.message : 'Send failed');
        throw e;
      }
    },
    [enabled, selectedId, userId, peerId, userDisplayName],
  );

  return {
    summaries,
    listLoading,
    selectedId,
    setSelectedId,
    reloadSummaries: loadSummaries,
    rows,
    threadLoading,
    contactUnlocked,
    requestTitle,
    peerName,
    peerAvatar,
    peerPlan,
    peerId,
    preMatchOutgoingCount,
    sendRemoteMessage,
    sendError,
  };
}
