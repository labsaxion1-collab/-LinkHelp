import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { Search, Send, ChevronLeft, ChevronUp, ChevronDown } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppData } from '@/context/AppDataContext';
import { useAppMode } from '@/context/AppModeContext';
import { useAuth } from '@/context/AuthContext';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { useSupabaseMessages } from '@/hooks/useSupabaseMessages';
import { ROUTES } from '@/utils/constants';
import { AppPageShell } from '@/components/design-system/AppPageShell';
import { DesktopBackButton } from '@/components/layout/DesktopBackButton';
import { useLanguage } from '@/context/LanguageContext';
import { clsx } from 'clsx';
import { sanitizePreMatchMessage } from '@/utils/preMatchChatFilter';
import { isUnlimitedPreMatch, preMatchOutgoingLimit } from '@/utils/preMatchLimits';
import { translateJobTitle } from '@/utils/translateCategory';
import { ChatPreMatchInfoSheet } from '@/components/chat/ChatPreMatchInfoSheet';
import { ChatJobDetailSheet } from '@/components/chat/ChatJobDetailSheet';
import { ChatPeerJobsHeader } from '@/components/chat/ChatPeerJobsHeader';
import { ChatPremiumPeerBand } from '@/components/chat/ChatPremiumPeerBand';
import { ChatThreadHeader } from '@/components/chat/ChatThreadHeader';
import { ChatPreMatchInlineNote, ChatPreMatchStrip } from '@/components/chat/ChatThreadContext';
import { dedupeConversationSummaries } from '@/services/supabase/chatRemote';
import { groupConversationsByPeer } from '@/utils/groupConversationsByPeer';
import { usePeerGamificationHeroKeys } from '@/gamification/hooks/usePeerGamificationHeroKeys';
import { useGamification } from '@/gamification/hooks/useGamification';
import { getChatHeroAccentTheme } from '@/components/chat/chatHeroTheme';
import { formatJobBudgetDisplay } from '@/utils/formatJobBudget';

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
  const { addNotification, jobs } = useAppData();
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
  const viewerGamification = useGamification(effectiveClientMode ? 'client' : 'helper');
  const chatAccentHeroKey = viewerGamification.heroKey;
  const chatAccentTheme = getChatHeroAccentTheme(chatAccentHeroKey);

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
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTopFab, setShowScrollTopFab] = useState(false);
  const [showScrollBottomFab, setShowScrollBottomFab] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [vvHeight, setVvHeight] = useState<number | null>(null);
  const [showPreMatchInfo, setShowPreMatchInfo] = useState(false);
  const [showJobDetail, setShowJobDetail] = useState(false);
  const [listLevel, setListLevel] = useState<'peers' | 'jobs'>('peers');
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);

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

  useEffect(() => {
    if (convQuery && remote.selectedId === convQuery) {
      setMobilePanel('thread');
    }
  }, [convQuery, remote.selectedId]);

  const peerAvatar = remote.peerAvatar;

  const usedPreMatch = remote.preMatchOutgoingCount;
  const limit = preMatchOutgoingLimit(myTier);
  const unlimited = isUnlimitedPreMatch(myTier);

  const threadMessages = useMemo((): ChatRow[] => remote.rows as ChatRow[], [remote.rows]);

  const displayThreadMessages = useMemo(() => {
    if (serviceConfirmed) return threadMessages;
    return threadMessages.filter((m) => !(m.kind === 'system' && String(m.id) === 'sys-intro'));
  }, [threadMessages, serviceConfirmed]);

  const filteredSummaries = useMemo(() => {
    if (!useRemoteChat) return [];
    const q = searchQuery.trim().toLowerCase();
    const visible = dedupeConversationSummaries(
      remote.summaries.filter((s) => !hiddenConversationIds.has(s.id)),
    );
    if (!q) return visible;
    return visible.filter(
      (s) => s.peerName.toLowerCase().includes(q) || s.requestTitle.toLowerCase().includes(q),
    );
  }, [useRemoteChat, remote.summaries, searchQuery, hiddenConversationIds]);

  const peerGroups = useMemo(() => groupConversationsByPeer(filteredSummaries), [filteredSummaries]);

  const peerUserType = effectiveClientMode ? 'helper' : 'client';
  const peerHeroKeys = usePeerGamificationHeroKeys(
    [...new Set([selectedPeerId, remote.peerId].filter(Boolean) as string[])],
    peerUserType,
  );

  const selectedPeerGroup = useMemo(
    () => peerGroups.find((g) => g.peerId === selectedPeerId) ?? null,
    [peerGroups, selectedPeerId],
  );

  useEffect(() => {
    if (selectedPeerId && !selectedPeerGroup) {
      setSelectedPeerId(null);
      setListLevel('peers');
    }
  }, [selectedPeerId, selectedPeerGroup]);

  const openPeerJobs = (peerId: string) => {
    setSelectedPeerId(peerId);
    setListLevel('jobs');
  };

  const backToPeerList = () => {
    setListLevel('peers');
    setSelectedPeerId(null);
    remote.setSelectedId(null);
  };

  const hideConversation = (conversationId: string) => {
    if (!window.confirm(t('messages_page.remove_conversation_confirm'))) return;
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

  const updateScrollFabState = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 72;
    setShowScrollBottomFab(!nearBottom && scrollHeight > clientHeight + 24);
    setShowScrollTopFab(scrollTop > 120);
  }, []);

  const scrollMessagesTo = useCallback((mode: 'top' | 'bottom', behavior: ScrollBehavior = 'smooth') => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const top = mode === 'top' ? 0 : el.scrollHeight;
    el.scrollTo({ top, behavior });
  }, []);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const onScroll = () => updateScrollFabState();
    el.addEventListener('scroll', onScroll, { passive: true });
    updateScrollFabState();
    return () => el.removeEventListener('scroll', onScroll);
  }, [updateScrollFabState, remote.selectedId, mobilePanel]);

  useEffect(() => {
    if (mobilePanel !== 'thread' && !isMd) return;
    scrollMessagesTo('bottom', 'auto');
    const t = window.setTimeout(() => scrollMessagesTo('bottom', 'auto'), 50);
    return () => window.clearTimeout(t);
  }, [threadMessages, isTyping, scrollMessagesTo, mobilePanel, isMd, remote.selectedId]);

  // Scroll to bottom when keyboard opens so the latest message stays visible
  useEffect(() => {
    if (keyboardInset > 0) {
      const t = window.setTimeout(() => scrollMessagesTo('bottom', 'auto'), 80);
      return () => window.clearTimeout(t);
    }
  }, [keyboardInset, scrollMessagesTo]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      // keyboard inset = gap between layout viewport bottom and visual viewport bottom
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      const isOpen = inset > 40;
      setKeyboardInset(isOpen ? inset : 0);
      // Store actual visual viewport height for precise thread sizing (no 280px cap)
      setVvHeight(isOpen ? vv.height : null);
    };
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    sync();
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, []);

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
    const { text: filtered, hadReplacement } = sanitizePreMatchMessage(raw, blockedTok);

    if (!filtered.trim()) {
      setFilterBanner(true);
      setTimeout(() => setFilterBanner(false), 6000);
      return;
    }

    if (hadReplacement) {
      setFilterBanner(true);
      setTimeout(() => setFilterBanner(false), 8000);
    }

    if (!remote.selectedId) return;
    try {
      await remote.sendRemoteMessage(filtered);
      setMessage('');
      requestAnimationFrame(() => scrollMessagesTo('bottom', 'smooth'));
    } catch {
      /* remote hook sets sendError */
    }
  };

  const showList = isMd || mobilePanel === 'list';
  const showThread = isMd || mobilePanel === 'thread';

  const counterLabel = useMemo(() => {
    if (serviceConfirmed) return null;
    if (unlimited) return t('messages_page.pre_match_counter_unlimited');
    const remaining = Math.max(0, limit - usedPreMatch);
    return t('messages_page.pre_match_counter', { remaining, total: limit });
  }, [serviceConfirmed, unlimited, usedPreMatch, limit, t]);

  const threadTitle = useRemoteChat
    ? translateJobTitle(remote.requestTitle || t('messages_page.thread_title'), '', null, t)
    : t('messages_page.thread_title');

  const activeJob = useMemo(() => {
    if (!useRemoteChat || !remote.selectedId) return null;
    const summary = remote.summaries.find((s) => s.id === remote.selectedId);
    if (!summary?.requestId) return null;
    return jobs.find((j) => j.id === summary.requestId) ?? null;
  }, [useRemoteChat, remote.selectedId, remote.summaries, jobs]);

  const compactJobLabel = useMemo(() => {
    if (activeJob) {
      return translateJobTitle(activeJob.title, activeJob.category, activeJob.subcategory, t);
    }
    return threadTitle;
  }, [activeJob, threadTitle, t]);

  const serviceDateLabel = activeJob?.preferredDate || t('messages_page.today');
  const serviceBudgetLabel = activeJob ? formatJobBudgetDisplay(activeJob, t) : undefined;
  const threadPeerHeroKey = remote.peerId ? peerHeroKeys.get(remote.peerId) : undefined;

  const chatHeader = (
    <ChatThreadHeader
      peerName={remote.peerName}
      peerAvatar={peerAvatar}
      heroKey={threadPeerHeroKey}
      accentHeroKey={chatAccentHeroKey}
      peerUserType={peerUserType}
      statusLabel={t('messages_page.status_online')}
      showBack={!isMd}
      onBack={() => setMobilePanel('list')}
      backLabel={t('messages_page.back')}
      service={{
        title: compactJobLabel,
        dateLabel: serviceDateLabel,
        location: activeJob?.location,
        budgetLabel: serviceBudgetLabel,
        viewDetailsLabel: t('messages_page.view_details'),
        disabled: !activeJob,
        onViewDetails: () => {
          if (activeJob) setShowJobDetail(true);
        },
      }}
    />
  );

  const compactContextCards = !serviceConfirmed ? (
    <ChatPreMatchStrip
      title={t('messages_page.pre_match_compact_title')}
      hint={t('messages_page.pre_match_compact_body')}
      onExpand={() => setShowPreMatchInfo(true)}
      heroKey={chatAccentHeroKey}
    />
  ) : null;

  const messageList = (
    <div
      ref={messagesScrollRef}
      className="ios-scroll relative min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[#F8FAFC] px-3 py-3 sm:px-4 sm:py-4"
    >
      {useRemoteChat && remote.threadLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
          <Icons.Loader2 className="h-7 w-7 animate-spin text-[#2563FF]" aria-hidden />
        </div>
      )}
      <div className="space-y-0">
        <div className="flex items-center gap-2 py-0.5">
          <span className="h-px flex-1 bg-[#E2E8F0]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
            {t('messages_page.today')}
          </span>
          <span className="h-px flex-1 bg-[#E2E8F0]" />
        </div>

        {!serviceConfirmed ? (
          <ChatPreMatchInlineNote
            text={t('messages_page.system_intro_pre')}
            onPress={() => setShowPreMatchInfo(true)}
          />
        ) : null}
      </div>

      {filterBanner && (
        <div className="mx-auto max-w-md rounded-xl border border-amber-100/80 bg-amber-50/90 px-3 py-2.5 text-center text-[13px] font-medium text-amber-950">
          {t('messages_page.filter_notice')}
        </div>
      )}

      {useRemoteChat && remote.sendError && (
        <div className="mx-auto max-w-md rounded-xl border border-red-100/80 bg-red-50/90 px-3 py-2.5 text-center text-[13px] font-medium text-red-900">
          {t('messages_page.send_failed')}
        </div>
      )}

      {displayThreadMessages.map((msg) =>
        msg.kind === 'system' ? (
          <div key={String(msg.id)} className="flex justify-center px-1">
            <div
              className={clsx(
                'max-w-[92%] rounded-2xl px-3.5 py-2.5 text-center text-[13px] font-medium leading-relaxed sm:max-w-lg',
                msg.variant === 'warn'
                  ? 'border border-amber-100/80 bg-amber-50/90 text-amber-950'
                  : 'border border-[#E9EDF5] bg-white text-[#64748B]',
              )}
            >
              {msg.text}
            </div>
          </div>
        ) : (
          <div
            key={String(msg.id)}
            className={clsx('group flex max-w-[min(88%,32rem)] gap-2', msg.sender === 'me' ? 'ml-auto justify-end' : '')}
          >
            {msg.sender === 'other' && (
              <img
                src={peerAvatar}
                alt=""
                className="mb-4 mt-auto h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white"
                loading="lazy"
              />
            )}
            <div className={msg.sender === 'me' ? 'flex min-w-0 flex-col items-end' : 'min-w-0'}>
              <div
                className={clsx(
                  'relative break-words px-3.5 py-2.5 text-[14px] leading-[1.5]',
                  msg.sender === 'me'
                    ? 'rounded-[18px] rounded-br-[5px] bg-[#2563FF] text-white shadow-[0_4px_14px_rgba(37,99,255,0.2)]'
                    : 'rounded-[18px] rounded-bl-[5px] border border-[#E9EDF5] bg-white text-[#0B1220]',
                )}
              >
                <p>{msg.text}</p>
              </div>
              <span
                className={clsx(
                  'mt-1 flex items-center gap-1 text-[10px] font-medium text-[#94A3B8]',
                  msg.sender === 'me' ? 'mr-0.5' : 'ml-0.5',
                )}
              >
                {msg.time} {msg.sender === 'me' && <Icons.CheckCheck className="h-3 w-3 text-[#2563FF]" />}
              </span>
            </div>
          </div>
        ),
      )}
      {showScrollTopFab ? (
        <button
          type="button"
          onClick={() => scrollMessagesTo('top')}
          className="absolute top-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-white/95 text-blue-700 shadow-lg backdrop-blur-md"
          aria-label={t('messages_page.scroll_top')}
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      ) : null}
      {showScrollBottomFab ? (
        <button
          type="button"
          onClick={() => scrollMessagesTo('bottom')}
          className="absolute bottom-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-white/95 text-blue-700 shadow-lg backdrop-blur-md"
          aria-label={t('messages_page.scroll_bottom')}
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );

  const sendDisabled =
    useRemoteChat && (!remote.selectedId || remote.threadLoading || !remote.peerId);

  const inputBar = (
    <ChatPremiumPeerBand className="relative z-20 shrink-0" heroKey={chatAccentHeroKey}>
      <div className="px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2.5 sm:px-4 md:pb-3">
        {counterLabel ? (
          <p className="mb-2 text-center text-[11px] font-medium text-white/85 tabular-nums">
            {counterLabel.replace(/(\d+\s*\/\s*\d+|\d+)/, '').trim()}{' '}
            <span className="font-bold text-white">{counterLabel.match(/(\d+\s*\/\s*\d+|\d+)/)?.[0] ?? ''}</span>
          </p>
        ) : null}
        <form
          onSubmit={(ev) => {
            void handleSendMessage(ev);
          }}
          className="flex min-h-[52px] items-center gap-1.5 rounded-full border border-white/25 bg-white px-2 shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
        >
          <div className="relative min-w-0 flex-1">
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
              placeholder=""
              className={clsx('max-h-28 min-h-[40px] w-full resize-none overflow-y-auto border-none bg-transparent px-0.5 py-2 text-[14px] text-[#0B1220] outline-none placeholder:text-[#B0BAC9] focus:outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', chatAccentTheme.focusRing)}
            />
          </div>
          <button
            type="submit"
            disabled={sendDisabled || !message.trim()}
            className={clsx(
              'relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full transition-all duration-200',
              message.trim() && !sendDisabled
                ? chatAccentTheme.sendActive
                : chatAccentTheme.sendInactive,
            )}
          >
            {message.trim() && !sendDisabled ? (
              <span
                className={clsx('pointer-events-none absolute inset-0', chatAccentTheme.sendGlow)}
                aria-hidden
              />
            ) : null}
            <Send
              className={clsx(
                'relative h-[17px] w-[17px]',
                message.trim() && !sendDisabled
                  ? chatAccentTheme.sendIconActive
                  : chatAccentTheme.sendIconInactive,
              )}
              strokeWidth={2.5}
            />
          </button>
        </form>
      </div>
    </ChatPremiumPeerBand>
  );

  const remoteEmptyList = useRemoteChat && !remote.listLoading && filteredSummaries.length === 0;
  const remoteNeedsPick = useRemoteChat && !remote.selectedId && filteredSummaries.length > 0;
  const remoteNoThread = useRemoteChat && !remote.selectedId && filteredSummaries.length === 0 && !remote.listLoading;
  const remoteListBoot = useRemoteChat && !remote.selectedId && remote.listLoading;

  if (!useRemoteChat) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-1 flex-col items-center justify-center rounded-3xl border border-blue-100 bg-white/75 p-8 text-center shadow-lg shadow-blue-500/10 backdrop-blur">
        <Icons.MessageCircle className="w-12 h-12 text-slate-300 mb-3" aria-hidden />
        <p className="text-sm font-semibold text-slate-700">{t('messages_page.sign_in_required')}</p>
      </div>
    );
  }

  return (
    <AppPageShell className="flex min-h-0 w-full max-w-none flex-1 flex-col overflow-hidden !p-0 bg-white md:bg-[linear-gradient(180deg,#FFFFFF_0%,#F7F8FC_100%)]">
      <div className="hidden shrink-0 md:block md:px-6 md:pt-6">
        <DesktopBackButton className="mb-3" />
      </div>
      {showLimitModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-[#0D1B2A]/30 backdrop-blur-sm"
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
                    navigate(
                      effectiveClientMode ? ROUTES.clientDashboard : ROUTES.helperLinkCredits,
                    );
                  }}
                >
                  {effectiveClientMode
                    ? t('messages_page.prematch_limit_plans_cta')
                    : t('messages_page.prematch_limit_linkcredits_cta')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white md:mx-6 md:mb-6 md:max-h-[calc(100dvh-8rem)] md:flex-row md:rounded-[32px] md:border md:border-[#E9EDF5] md:shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <div
          className={clsx(
            'flex min-h-0 w-full flex-col bg-[#F7F8FC] md:w-80 md:max-w-[40%] md:border-r md:border-[#E9EDF5]',
            !showList && 'max-md:hidden',
            'md:flex',
          )}
        >
          {listLevel === 'jobs' && selectedPeerGroup ? (
            <ChatPeerJobsHeader
              peerName={selectedPeerGroup.peerName}
              peerAvatar={selectedPeerGroup.peerAvatar}
              heroKey={peerHeroKeys.get(selectedPeerGroup.peerId)}
              accentHeroKey={chatAccentHeroKey}
              peerUserType={peerUserType}
              onBack={backToPeerList}
              backLabel={t('messages_page.back_to_clients')}
              jobsCountLabel={t('messages_page.peer_jobs_count', {
                count: selectedPeerGroup.conversations.length,
              })}
            />
          ) : (
            <div className="shrink-0 bg-white px-3 pb-1 pt-3 md:px-3.5">
              <h2 className="text-[15px] font-bold tracking-tight text-[#0B1220]">{t('messages_page.title')}</h2>
            </div>
          )}
          <div className="relative shrink-0 bg-white px-3 pb-2 pt-2 md:px-3.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="search"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('messages_page.search_placeholder')}
                className="h-9 w-full rounded-full border border-[#E9EDF5] bg-[#F8FAFC] py-0 pl-9 pr-3 text-[13px] text-[#0B1220] transition-colors placeholder:text-[#94A3B8] focus:border-[#D7E2FF] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2563FF]/15"
              />
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain ios-scroll min-h-0 px-1.5 py-1">
            {useRemoteChat && remote.listLoading && (
              <div className="flex justify-center py-8">
                <Icons.Loader2 className="h-5 w-5 animate-spin text-[#2563FF]" aria-hidden />
              </div>
            )}
            {remoteEmptyList && (
              <p className="px-3 py-6 text-center text-[13px] font-medium leading-relaxed text-[#94A3B8]">
                {t('messages_page.no_conversations')}
              </p>
            )}
            {useRemoteChat &&
              listLevel === 'peers' &&
              peerGroups.map((group) => (
                <div key={group.peerId} className="w-full">
                  <button
                    type="button"
                    onClick={() => openPeerJobs(group.peerId)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-white/90"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={group.peerAvatar}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover ring-1 ring-[#E9EDF5]"
                        loading="lazy"
                      />
                      <div className={clsx('absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white', chatAccentTheme.onlineDot)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-[13px] font-semibold text-[#0B1220]">
                          {group.peerName.split(' ')[0] || group.peerName}
                        </h3>
                        <span className="shrink-0 rounded-full bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[#64748B]">
                          {t('messages_page.peer_jobs_count', { count: group.conversations.length })}
                        </span>
                      </div>
                      {group.conversations.length === 1 ? (
                        <p className="truncate text-[12px] font-medium text-[#94A3B8]">
                          {translateJobTitle(group.conversations[0]!.requestTitle, '', null, t)}
                        </p>
                      ) : (
                        <p className="truncate text-[12px] font-medium text-[#94A3B8]">
                          {t('messages_page.peer_multiple_jobs')}
                        </p>
                      )}
                    </div>
                    <Icons.ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#CBD5E1]" />
                  </button>
                </div>
              ))}
            {useRemoteChat &&
              listLevel === 'jobs' &&
              selectedPeerGroup?.conversations.map((s) => (
                <div
                  key={s.id}
                  className={clsx(
                    'flex w-full items-center gap-1 rounded-xl px-2 py-1.5 transition-colors',
                    remote.selectedId === s.id
                      ? 'bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] ring-1 ring-[#E9EDF5]'
                      : 'hover:bg-white/80',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      remote.setSelectedId(s.id);
                      setMobilePanel('thread');
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1.5 text-left"
                  >
                    <span
                      className={clsx(
                        'h-4 w-0.5 shrink-0 rounded-full',
                        remote.selectedId === s.id ? 'bg-[#2563FF]' : 'bg-transparent',
                      )}
                      aria-hidden
                    />
                    <p className="truncate text-[13px] font-semibold text-[#0B1220]">
                      {translateJobTitle(s.requestTitle, '', null, t)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => hideConversation(s.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#CBD5E1] transition-colors hover:bg-red-50 hover:text-red-500"
                    aria-label={t('messages_page.remove_conversation')}
                  >
                    <Icons.Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
          </div>
        </div>

        <div
          className={clsx(
            'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white max-md:w-full',
            !showThread && 'max-md:hidden',
            'md:flex',
          )}
          style={
            !isMd && vvHeight !== null
              ? {
                  // Pin thread height to the actual visual viewport (excludes keyboard).
                  // vvHeight comes from window.visualViewport.height which is always accurate
                  // on both Android Chrome and iOS Safari when keyboard is open.
                  height: `${vvHeight}px`,
                  maxHeight: `${vvHeight}px`,
                }
              : undefined
          }
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
              {compactContextCards}
              {messageList}
              {inputBar}
            </>
          )}
        </div>
      </div>

      <ChatPreMatchInfoSheet open={showPreMatchInfo} onClose={() => setShowPreMatchInfo(false)} />
      <ChatJobDetailSheet job={activeJob} open={showJobDetail} onClose={() => setShowJobDetail(false)} />
    </AppPageShell>
  );
}
