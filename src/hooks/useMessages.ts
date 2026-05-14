import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchChatMessages } from '@/services/supabase/chatRemote';
import type { MessageRow } from '@/types/database';
import { withRetry } from '@/utils/asyncRetry';

export function useMessages(conversationId: string | null) {
  const { session, isConfigured } = useAuth();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!isConfigured || !session || !conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await withRetry(() => fetchChatMessages(conversationId));
      setMessages(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [isConfigured, session, conversationId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { messages, loading, error, refetch, setMessages };
}
