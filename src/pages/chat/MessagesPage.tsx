import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { Search, Send, ChevronLeft, ShieldCheck, Lock } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppData } from '@/context/AppDataContext';
import { useAppMode } from '@/context/AppModeContext';
import { useAuth } from '@/context/AuthContext';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { useSupabaseMessages } from '@/hooks/useSupabaseMessages';
import { ROUTES } from '@/utils/constants';
import { useLanguage } from '@/context/LanguageContext';
import { HelperPlanBadge } from '@/components/helpers/HelperPlanBadge';
import type { HelperSubscriptionTier } from '@/types/helperSubscription';
import { clsx } from 'clsx';
import { sanitizePreMatchMessage } from '@/utils/preMatchChatFilter';
import { isUnlimitedPreMatch, preMatchOutgoingLimit } from '@/utils/preMatchLimits';

type ChatRow =
  | { id: string | number; kind: 'system'; text: string; time: string; variant?: 'info' | 'warn' }
  | { id: string | number; kind: 'user'; sender: 'me' | 'other'; text: string; time: string };

export default function MessagesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const convQuery = searchParams.get('c');
  const { isClientMode } = useAppMode();
  const { addNotification } = useAppData();
  const { session, isConfigured, profile } = useAuth();
  const me = useSessionViewer();

  const useRemoteChat = Boolean(isConfigured && session && profile);

  const locationState = location.state as { composeDraft?: string; conversationId?: string } | null;

  const remote = useSupabaseMessages({
    enabled: useRemoteChat,
    userId: me.id,
    userDisplayName: me.name,
    initialConversationId: locationState?.conversationId ?? null,
    searchConversationId: convQuery,
    systemIntroText: t('messages_page.system_intro_pre'),
  });

  const effectiveClientMode = useRemoteChat ? me.userType === 'client' : isClientMode;

  const myTier = me.subscriptionTier ?? 'BASIC';

  const [message, setMessage] = useState('');
  const [filterBanner, setFilterBanner] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMd, setIsMd] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true,
  );
  const [mobilePanel, setMobilePanel] = useState<'list' | 'thread'>('list');
  const [isTyping, setIsTyping] = useState(false);
  const [hiddenConversationIds, setHiddenConversationIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem(`lh:hidden-conversations:${me.id}`) || '[]') as string[]);
    } catch {
      return new Set();
    }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const serviceConfirmed = useRemoteChat ? remote.contactUnlocked : false;

  useEffect(() => {
    const st = location.state as { composeDraft?: string; conversationId?: string } | null;
    if (!st?.composeDraft) return;
    setMessage(st.composeDraft);
    const { composeDraft: _d, ...rest } = st;
    navigate(location.pathname, { replace: true, state: Object.keys(rest).length ? rest : {} });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const fn = () => setIsMd(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    if (isMd) setMobilePanel('thread');
  }, [isMd]);

  const peerNameShort = remote.peerName.split(' ')[0] || remote.peerName;
  const peerAvatar = remote.peerAvatar;
  const peerTier = remote.peerPlan;

  const usedPreMatch = remote.preMatchOutgoingCount;
  const limit = preMatchOutgoingLimit(myTier);
  const unlimited = isUnlimitedPreMatch(myTier);

  const threadMessages = useMemo((): ChatRow[] => remote.rows as ChatRow[], [remote.rows]);

  const filteredSummaries = useMemo(() => {
    if (!useRemoteChat) return [];
    const q = searchQuery.trim().toLowerCase();
    const visible = remote.summaries.filter((s) => !hiddenConversationIds.has(s.id));
    if (!q) return visible;
    return visible.filter(
      (s) => s.peerName.toLowerCase().includes(q) || s.requestTitle.toLowerCase().includes(q),
    );
  }, [useRemoteChat, remote.summaries, searchQuery, hiddenConversationIds]);

  const hideConversation = (conversationId: string) => {
    if (!window.confirm('Remover esta conversa da sua lista?')) return;
    setHiddenConversationIds((prev) => {
      const next = new Set(prev);
      next.add(conversationId);
      localStorage.setItem(`lh:hidden-conversations:${me.id}`, JSON.stringify([...next]));
      return next;
    });
    if (remote.selectedId === conversationId) {
      remote.setSelectedId(null);
      setMobilePanel('list');
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [threadMessages, isTyping, scrollToBottom, mobilePanel]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = message.trim();
    if (!raw) return;

    if (!serviceConfirmed) {
      if (!unlimited && usedPreMatch >= limit) {
        setShowLimitModal(true);
        return;
      }
    }

    const blockedTok = t('messages_page.contact_blocked_notice');
    const { text: filtered, hadReplacement } = serviceConfirmed
      ? { text: raw, hadReplacement: false }
      : sanitizePreMatchMessage(raw, blockedTok);

    if (!filtered.trim()) {
      setFilterBanner(true);
      setTimeout(() => setFilterBanner(false), 6000);
      return;
    }

    if (!serviceConfirmed) {
      setFilterBanner(hadReplacement);
      if (hadReplacement) {
        setTimeout(() => setFilterBanner(false), 8000);
      }
    }

    if (!remote.selectedId) return;
    try {
      await remote.sendRemoteMessage(filtered);
      setMessage('');
    } catch {
      /* remote hook sets sendError */
    }
  };

  const showList = isMd || mobilePanel === 'list';
  const showThread = isMd || mobilePanel === 'thread';

  const counterLabel = useMemo(() => {
    if (serviceConfirmed) return null;
    if (unlimited) return t('messages_page.pre_match_counter_unlimited');
    return t('messages_page.pre_match_counter', { used: usedPreMatch, total: limit });
  }, [serviceConfirmed, unlimited, usedPreMatch, limit, t]);

  const threadTitle = useRemoteChat ? remote.requestTitle || t('messages_page.thread_title') : t('messages_page.thread_title');

  const chatHeader = (
    <div className="p-3 sm:p-4 border-b border-gray-100/90 flex justify-between items-center bg-white/95 backdrop-blur-sm shrink-0 gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {!isMd && (
          <button
            type="button"
            onClick={() => setMobilePanel('list')}
            className="p-2.5 -ml-1 rounded-xl text-gray-600 hover:bg-gray-100 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t('messages_page.back')}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <img
          src={peerAvatar}
          alt=""
          className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-white shadow-md"
          loading="lazy"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-gray-900 leading-tight truncate">{peerNameShort}</h3>
            <HelperPlanBadge tier={peerTier} className="shrink-0" />
            {serviceConfirmed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t('messages_page.service_confirmed_badge')}
              </span>
            )}
          </div>
          <div className="flex items-center text-xs text-emerald-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 inline-block shrink-0" />
            {t('messages_page.status_online')}
          </div>
        </div>
      </div>
    </div>
  );

  const preMatchBanner = !serviceConfirmed && (
    <div className="bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 px-3 sm:px-4 py-3 border-b border-indigo-100/80 shrink-0">
      <div className="flex gap-3 items-start max-w-3xl mx-auto">
        <div className="mt-0.5 rounded-xl bg-white p-2 shadow-sm border border-indigo-100 text-indigo-600 shrink-0">
          <Lock className="w-4 h-4" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-black uppercase tracking-wider text-indigo-900/80">
            {t('messages_page.pre_match_banner_title')}
          </p>
          <p className="text-sm text-slate-700 font-medium leading-relaxed">{t('messages_page.pre_match_banner_body')}</p>
          <p className="text-xs text-slate-500 font-medium">{t('messages_page.pre_match_hint_footer')}</p>
        </div>
      </div>
    </div>
  );

  const postMatchBanner = serviceConfirmed && (
    <div className="bg-emerald-50/90 px-3 sm:px-4 py-2.5 border-b border-emerald-100 shrink-0 flex items-center gap-2">
      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
      <p className="text-sm font-semibold text-emerald-900">{t('messages_page.post_match_banner')}</p>
    </div>
  );

  const jobBanner = (
    <div className="bg-slate-900 text-white px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 shrink-0">
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('messages_page.current_service')}</p>
        <p className="text-sm font-semibold text-white break-words">{threadTitle}</p>
      </div>
      <button
        type="button"
        className="text-sm font-bold text-slate-900 bg-white px-4 py-2.5 rounded-xl min-h-[44px] shrink-0 self-start sm:self-auto hover:bg-slate-100 transition-colors"
      >
        {t('messages_page.view_details')}
      </button>
    </div>
  );

  const messageList = (
    <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6 space-y-4 sm:space-y-5 bg-[#f4f6f8] ios-scroll min-h-0 relative">
      {useRemoteChat && remote.threadLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
          <Icons.Loader2 className="w-8 h-8 text-blue-600 animate-spin" aria-hidden />
        </div>
      )}
      <div className="flex justify-center">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
          {t('messages_page.today')}
        </span>
      </div>

      {filterBanner && (
        <div className="mx-auto max-w-md rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-950 font-medium text-center shadow-sm">
          {t('messages_page.filter_notice')}
        </div>
      )}

      {useRemoteChat && remote.sendError && (
        <div className="mx-auto max-w-md rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900 font-medium text-center shadow-sm">
          {t('messages_page.send_failed')}
        </div>
      )}

      {threadMessages.map((msg) =>
        msg.kind === 'system' ? (
          <div key={String(msg.id)} className="flex justify-center px-2">
            <div
              className={clsx(
                'max-w-[95%] sm:max-w-xl rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed text-center border shadow-sm',
                msg.variant === 'warn'
                  ? 'bg-amber-50 text-amber-950 border-amber-100'
                  : 'bg-white text-slate-700 border-slate-200/80',
              )}
            >
              {msg.text}
            </div>
          </div>
        ) : (
          <div
            key={String(msg.id)}
            className={clsx('flex gap-2 sm:gap-3 max-w-[min(92%,28rem)] group', msg.sender === 'me' ? 'ml-auto justify-end' : '')}
          >
            {msg.sender === 'other' && (
              <img
                src={peerAvatar}
                alt=""
                className="w-8 h-8 rounded-full object-cover mt-auto mb-5 shadow-sm ring-2 ring-white shrink-0"
                loading="lazy"
              />
            )}
            <div className={msg.sender === 'me' ? 'flex flex-col items-end min-w-0' : 'min-w-0'}>
              <div
                className={clsx(
                  'p-3.5 sm:p-4 shadow-md relative rounded-2xl break-words',
                  msg.sender === 'me'
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md'
                    : 'bg-white border border-gray-100 rounded-bl-md',
                )}
              >
                <p className={clsx('text-sm leading-relaxed', msg.sender === 'me' ? '' : 'text-gray-800')}>{msg.text}</p>
              </div>
              <span
                className={clsx(
                  'text-[10px] font-medium text-gray-400 mt-1 flex items-center gap-1',
                  msg.sender === 'me' ? 'mr-1' : 'ml-1',
                )}
              >
                {msg.time} {msg.sender === 'me' && <Icons.CheckCheck className="w-3.5 h-3.5 text-blue-300" />}
              </span>
            </div>
          </div>
        ),
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  const sendDisabled =
    useRemoteChat && (!remote.selectedId || remote.threadLoading || !remote.peerId || remote.listLoading);

  const inputBar = (
    <div className="p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-gray-100 shrink-0 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:pb-4 space-y-2">
      {counterLabel && (
        <div className="flex items-center justify-between px-1 gap-2">
          <span className="text-[11px] font-semibold text-slate-500 tabular-nums">{counterLabel}</span>
          {!serviceConfirmed && <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" aria-hidden />}
        </div>
      )}
      <form
        onSubmit={(ev) => {
          void handleSendMessage(ev);
        }}
        className="flex items-end gap-2"
      >
        <div className="flex-1 relative min-w-0">
          <textarea
            rows={1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSendMessage(e as unknown as React.FormEvent);
              }
            }}
            placeholder={serviceConfirmed ? t('messages_page.input_placeholder') : t('messages_page.input_placeholder_limited')}
            className="w-full bg-slate-100 border border-transparent rounded-2xl px-4 py-3 text-base sm:text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/80 focus:outline-none transition-all shadow-inner resize-none max-h-32 min-h-[48px]"
          />
        </div>
        <button
          type="submit"
          disabled={sendDisabled || !message.trim()}
          className={clsx(
            'p-3.5 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 min-w-[52px] min-h-[52px] shadow-sm',
            message.trim() && !sendDisabled ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-300',
          )}
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );

  const remoteEmptyList = useRemoteChat && !remote.listLoading && filteredSummaries.length === 0;
  const remoteNeedsPick = useRemoteChat && !remote.selectedId && remote.summaries.length > 0;
  const remoteNoThread = useRemoteChat && !remote.selectedId && remote.summaries.length === 0 && !remote.listLoading;
  const remoteListBoot = useRemoteChat && !remote.selectedId && remote.listLoading;

  if (!useRemoteChat) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-[50vh] p-8 text-center max-w-md mx-auto">
        <Icons.MessageCircle className="w-12 h-12 text-slate-300 mb-3" aria-hidden />
        <p className="text-sm font-semibold text-slate-700">{t('messages_page.sign_in_required')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 w-full max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 sm:py-4">
      {showLimitModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm"
          role="presentation"
          onClick={() => setShowLimitModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 sm:p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Icons.MessageCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('messages_page.prematch_limit_modal_title')}</h2>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">{t('messages_page.prematch_limit_modal_body')}</p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  className="flex-1 min-h-[48px] rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
                  onClick={() => {
                    setShowLimitModal(false);
                    navigate(effectiveClientMode ? ROUTES.clientDashboard : ROUTES.helperDashboard);
                  }}
                >
                  {effectiveClientMode ? t('messages_page.prematch_limit_hire_cta') : t('messages_page.prematch_limit_helper_cta')}
                </button>
                <button
                  type="button"
                  className="flex-1 min-h-[48px] rounded-xl border border-slate-200 bg-white text-slate-800 font-bold hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    setShowLimitModal(false);
                    navigate(effectiveClientMode ? ROUTES.clientDashboard : ROUTES.helperDashboard, {
                      state: { openUpgrade: true },
                    });
                  }}
                >
                  {t('messages_page.prematch_limit_plans_cta')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row flex-1 min-h-0 bg-white md:rounded-3xl md:border md:border-gray-100 md:shadow-lg overflow-hidden h-[calc(100dvh-4rem-5rem)] md:h-[calc(100dvh-5rem)] max-md:rounded-none">
        <div
          className={clsx(
            'w-full md:w-80 md:max-w-[40%] border-r border-gray-100 flex flex-col min-h-0 bg-slate-50/60',
            !showList && 'hidden',
            'md:flex',
          )}
        >
          <div className="p-4 border-b border-gray-100 bg-white shrink-0">
            <h2 className="text-lg font-black text-gray-900 mb-3">{t('messages_page.title')}</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('messages_page.search_placeholder')}
                className="w-full pl-9 pr-4 py-3 min-h-[48px] bg-slate-100 border-transparent rounded-xl text-base sm:text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain ios-scroll min-h-0">
            {useRemoteChat && remote.listLoading && (
              <div className="flex justify-center py-10">
                <Icons.Loader2 className="w-7 h-7 text-blue-600 animate-spin" aria-hidden />
              </div>
            )}
            {remoteEmptyList && (
              <p className="p-4 text-sm text-gray-600 font-medium leading-relaxed">{t('messages_page.no_conversations')}</p>
            )}
            {useRemoteChat &&
              filteredSummaries.map((s) => (
                <div
                  key={s.id}
                  className={clsx(
                    'w-full border-b border-gray-100 bg-white border-l-4 relative overflow-hidden transition-colors',
                    remote.selectedId === s.id ? 'border-l-blue-600 bg-blue-50/40' : 'border-l-transparent hover:bg-slate-50/80',
                  )}
                >
                  <div className="flex items-center gap-2 p-4">
                    <button
                      type="button"
                      onClick={() => {
                        remote.setSelectedId(s.id);
                        setMobilePanel('thread');
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={s.peerAvatar}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                          loading="lazy"
                        />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2 mb-1">
                          <h3 className="text-sm font-bold text-gray-900 truncate">{s.peerName.split(' ')[0] || s.peerName}</h3>
                          <span className="text-[10px] font-bold text-blue-600 shrink-0">{t('notifications.time_now')}</span>
                        </div>
                        <p className="text-sm text-gray-600 truncate font-medium">{s.requestTitle}</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => hideConversation(s.id)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remover conversa"
                    >
                      <Icons.Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div
          className={clsx('flex flex-col flex-1 bg-white min-h-0 min-w-0', !showThread && 'hidden', 'md:flex')}
        >
          {remoteListBoot ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-600">
              <Icons.Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" aria-hidden />
              <p className="text-sm font-medium text-slate-500">{t('messages_page.title')}</p>
            </div>
          ) : remoteNeedsPick ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-600">
              <Icons.MessageCircle className="w-12 h-12 text-blue-200 mb-3" aria-hidden />
              <p className="text-sm font-semibold max-w-xs">{t('messages_page.pick_conversation')}</p>
            </div>
          ) : remoteNoThread ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-600">
              <Icons.Inbox className="w-12 h-12 text-slate-300 mb-3" aria-hidden />
              <p className="text-sm font-semibold max-w-xs">{t('messages_page.no_conversations')}</p>
            </div>
          ) : (
            <>
              {chatHeader}
              {preMatchBanner}
              {postMatchBanner}
              {jobBanner}
              {messageList}
              {inputBar}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
