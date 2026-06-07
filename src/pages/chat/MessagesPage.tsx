import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { Search, Send, ChevronLeft, ShieldCheck, ChevronUp, ChevronDown } from 'lucide-react';
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
import { HelperPlanBadge } from '@/components/helpers/HelperPlanBadge';
import type { HelperSubscriptionTier } from '@/types/helperSubscription';
import { clsx } from 'clsx';
import { sanitizePreMatchMessage } from '@/utils/preMatchChatFilter';
import { isUnlimitedPreMatch, preMatchOutgoingLimit } from '@/utils/preMatchLimits';
import { translateCategory, translateJobTitle } from '@/utils/translateCategory';
import { ChatPreMatchInfoSheet } from '@/components/chat/ChatPreMatchInfoSheet';
import { ChatJobDetailSheet } from '@/components/chat/ChatJobDetailSheet';
import { dedupeConversationSummaries } from '@/services/supabase/chatRemote';
import { groupConversationsByPeer } from '@/utils/groupConversationsByPeer';

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
    const visible = dedupeConversationSummaries(
      remote.summaries.filter((s) => !hiddenConversationIds.has(s.id)),
    );
    if (!q) return visible;
    return visible.filter(
      (s) => s.peerName.toLowerCase().includes(q) || s.requestTitle.toLowerCase().includes(q),
    );
  }, [useRemoteChat, remote.summaries, searchQuery, hiddenConversationIds]);

  const peerGroups = useMemo(() => groupConversationsByPeer(filteredSummaries), [filteredSummaries]);

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

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset > 40 ? inset : 0);
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
      const category = translateCategory(activeJob.category, t);
      const title = translateJobTitle(activeJob.title, activeJob.category, activeJob.subcategory, t);
      return `${category}: ${title}`;
    }
    return threadTitle;
  }, [activeJob, threadTitle, t]);

  const chatHeader = (
    <div className="shrink-0 bg-white px-4 pb-3 pt-3 sm:px-6 sm:pt-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {!isMd && (
            <button
              type="button"
              onClick={() => setMobilePanel('list')}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white text-[#0B1220] shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition active:scale-95"
              aria-label={t('messages_page.back')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <img
            src={peerAvatar}
            alt=""
            className="h-[52px] w-[52px] shrink-0 rounded-full bg-[#EEF3FF] object-cover ring-4 ring-white shadow-[0_8px_22px_rgba(15,23,42,0.06)]"
            loading="lazy"
          />
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-black leading-tight text-[#0B1220] sm:text-xl">{peerNameShort}</h3>
              <HelperPlanBadge tier={peerTier} className="shrink-0 !rounded-full !border-[#E9EDF5] !bg-[#F1F5FF] !px-2.5 !py-1 !text-[#0B4A6F]" />
              {serviceConfirmed && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t('messages_page.service_confirmed_badge')}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center text-xs font-semibold text-[#22C55E]">
              <span className="mr-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-[#22C55E] shadow-[0_0_0_4px_rgba(34,197,94,0.12)]" />
              {t('messages_page.status_online')}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="hidden h-12 w-12 items-center justify-center rounded-[16px] bg-white text-[#0B1220] shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition active:scale-95 sm:flex"
            aria-label="Telefone"
          >
            <Icons.Phone className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-white text-[#0B1220] shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition active:scale-95"
            aria-label="Opções"
          >
            <Icons.MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const compactContextCards = (
    <div className="shrink-0 space-y-3 bg-white px-4 pb-4 sm:px-6">
      {!serviceConfirmed ? (
        <div className="flex items-center gap-3 rounded-[22px] border border-[#E9EDF5] bg-white px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.035)] sm:px-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[#EEF3FF] text-[#2563FF]">
            <Icons.Lock className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-black leading-tight text-[#0B1220]">
              {t('messages_page.pre_match_compact_title')}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[12px] font-medium leading-relaxed text-[#6B7280] sm:text-sm">
              {t('messages_page.pre_match_compact_body')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPreMatchInfo(true)}
            className="shrink-0 rounded-full bg-[#EEF3FF] px-3 py-2 text-[11px] font-black text-[#2563FF] transition hover:bg-blue-100"
          >
            {t('messages_page.learn_more')}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          if (activeJob) setShowJobDetail(true);
        }}
        disabled={!activeJob}
        className="group grid w-full grid-cols-[4px_58px_minmax(0,1fr)] items-center gap-3 rounded-[22px] border border-[#E9EDF5] bg-white px-3 py-3 text-left shadow-[0_10px_30px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_44px_rgba(15,23,42,0.08)] disabled:cursor-default disabled:opacity-80 sm:grid-cols-[4px_68px_minmax(0,1fr)_auto] sm:gap-4 sm:px-4"
      >
        <span className="h-full min-h-[76px] w-1 rounded-full bg-[#2563FF]" aria-hidden />
        <span className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[18px] bg-[#EEF3FF] text-[#2563FF] sm:h-[68px] sm:w-[68px] sm:rounded-[20px]">
          <Icons.BriefcaseBusiness className="h-7 w-7" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="inline-flex rounded-full bg-[#EEF3FF] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#2563FF]">
            Serviço
          </span>
          <span className="mt-1 block truncate text-[16px] font-black leading-tight text-[#0B1220] sm:text-[17px]">{compactJobLabel}</span>
          <span className="mt-2 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[12px] font-semibold text-[#6B7280] sm:text-[13px]">
            <span className="inline-flex min-w-0 items-center gap-1"><Icons.CalendarDays className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{activeJob?.preferredDate || t('messages_page.today')}</span></span>
            <span className="inline-flex min-w-0 items-center gap-1"><Icons.MapPin className="h-3.5 w-3.5 shrink-0" /><span className="max-w-[150px] truncate sm:max-w-[260px]">{activeJob?.location || 'LinkHelp'}</span></span>
          </span>
        </span>
        <span className="col-span-3 flex shrink-0 items-center justify-end sm:col-span-1">
          <span className="rounded-full border border-[#E9EDF5] bg-white px-3 py-2 text-xs font-black text-[#2563FF] shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
            Ver detalhes
          </span>
          <ChevronDown className="ml-1.5 h-4 w-4 text-[#2563FF]" aria-hidden />
        </span>
      </button>
    </div>
  );

  const messageList = (
    <div
      ref={messagesScrollRef}
      className="ios-scroll relative min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-[linear-gradient(180deg,#FFFFFF_0%,#F7F8FC_100%)] px-4 py-4 sm:px-6 sm:py-6"
    >
      {useRemoteChat && remote.threadLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
          <Icons.Loader2 className="w-8 h-8 text-blue-600 animate-spin" aria-hidden />
        </div>
      )}
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[#E9EDF5]" />
        <span className="rounded-full border border-[#E9EDF5] bg-white px-4 py-2 text-[13px] font-bold uppercase tracking-wide text-[#6B7280] shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
          {t('messages_page.today')}
        </span>
        <span className="h-px flex-1 bg-[#E9EDF5]" />
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
                'max-w-[88%] rounded-[20px] border px-4 py-3 text-center text-[14px] font-medium leading-relaxed shadow-sm sm:max-w-xl',
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
            className={clsx('group flex max-w-[min(86%,34rem)] gap-2 sm:gap-3', msg.sender === 'me' ? 'ml-auto justify-end' : '')}
          >
            {msg.sender === 'other' && (
              <img
                src={peerAvatar}
                alt=""
                className="mb-5 mt-auto h-8 w-8 shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white"
                loading="lazy"
              />
            )}
            <div className={msg.sender === 'me' ? 'flex flex-col items-end min-w-0' : 'min-w-0'}>
              <div
                className={clsx(
                  'relative break-words px-4 py-3 text-[15px] leading-[1.55] shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:px-5 sm:py-3.5',
                  msg.sender === 'me'
                    ? 'rounded-[22px] rounded-br-md bg-[#E9EEFF] text-[#0B1220]'
                    : 'rounded-[22px] rounded-bl-md border border-[#E9EDF5]/70 bg-white text-[#0B1220]',
                )}
              >
                <p>{msg.text}</p>
              </div>
              <span
                className={clsx(
                  'mt-1.5 flex items-center gap-1 text-xs font-medium text-[#6B7280]',
                  msg.sender === 'me' ? 'mr-1' : 'ml-1',
                )}
              >
                {msg.time} {msg.sender === 'me' && <Icons.CheckCheck className="h-3.5 w-3.5 text-[#2563FF]" />}
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
    useRemoteChat && (!remote.selectedId || remote.threadLoading || !remote.peerId || remote.listLoading);

  const inputBar = (
    <div
      className="shrink-0 space-y-2 bg-[#F7F8FC]/95 px-4 pb-[max(env(safe-area-inset-bottom),0.85rem)] pt-3 backdrop-blur-md md:pb-4 sm:px-6"
      style={keyboardInset > 0 ? { paddingBottom: `max(${keyboardInset}px, env(safe-area-inset-bottom))` } : undefined}
    >
      {counterLabel ? (
        <p className="px-1 text-center text-sm font-semibold text-[#6B7280] tabular-nums">
          {counterLabel.replace(/(\d+\s*\/\s*\d+|\d+)/, '').trim()}{' '}
          <span className="font-black text-[#2563FF]">{counterLabel.match(/(\d+\s*\/\s*\d+|\d+)/)?.[0] ?? ''}</span>
        </p>
      ) : null}
      <form
        onSubmit={(ev) => {
          void handleSendMessage(ev);
        }}
        className="flex min-h-[72px] items-center gap-2 rounded-[28px] bg-white p-2 shadow-[0_12px_35px_rgba(15,23,42,0.06)]"
      >
        <button
          type="button"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] text-[#6B7280] transition hover:bg-[#F7F8FC] hover:text-[#2563FF]"
          aria-label="Anexar"
        >
          <Icons.Paperclip className="h-5 w-5" />
        </button>
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
            className="max-h-32 min-h-[48px] w-full resize-none border-none bg-transparent px-1 py-3 text-base text-[#0B1220] outline-none placeholder:text-[#9CA3AF] focus:outline-none sm:text-base"
          />
        </div>
        <button
          type="submit"
          disabled={sendDisabled || !message.trim()}
          className={clsx(
            'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] transition-all',
            message.trim() && !sendDisabled
              ? 'bg-[#2563FF] text-white shadow-[0_12px_30px_rgba(37,99,255,0.28)] hover:bg-blue-700 active:scale-95'
              : 'bg-[#EEF3FF] text-[#9CA3AF]',
          )}
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
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
    <AppPageShell className="flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,#FFFFFF_0%,#F7F8FC_100%)]">
      <DesktopBackButton className="mb-3" />
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)] md:max-h-[calc(100dvh-5rem)] md:flex-row md:border md:border-[#E9EDF5] max-md:min-h-[calc(100dvh-8rem)] max-md:rounded-none max-md:shadow-none">
        <div
          className={clsx(
            'flex min-h-0 w-full flex-col bg-[#F7F8FC] md:w-80 md:max-w-[40%] md:border-r md:border-[#E9EDF5]',
            !showList && 'hidden',
            'md:flex',
          )}
        >
          <div className="shrink-0 border-b border-[#E9EDF5] bg-white p-4">
            {listLevel === 'jobs' && selectedPeerGroup ? (
              <div className="mb-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={backToPeerList}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
                  aria-label={t('messages_page.back_to_clients')}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-black tracking-tight text-[#0B1220]">
                    {selectedPeerGroup.peerName.split(' ')[0] || selectedPeerGroup.peerName}
                  </h2>
                  <p className="text-xs font-semibold text-slate-500">
                    {t('messages_page.peer_jobs_count', { count: selectedPeerGroup.conversations.length })}
                  </p>
                </div>
              </div>
            ) : (
              <h2 className="mb-3 text-xl font-black tracking-tight text-[#0B1220]">{t('messages_page.title')}</h2>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              <input
                type="search"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('messages_page.search_placeholder')}
                className="min-h-[52px] w-full rounded-[18px] border border-transparent bg-[#F7F8FC] py-3 pl-11 pr-4 text-base text-[#0B1220] transition-all placeholder:text-[#9CA3AF] focus:border-[#D7E2FF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563FF]/20 sm:text-sm"
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
              listLevel === 'peers' &&
              peerGroups.map((group) => (
                <div
                  key={group.peerId}
                  className="relative w-full overflow-hidden border-b border-[#E9EDF5] border-l-4 border-l-transparent bg-white transition-colors hover:bg-white/80"
                >
                  <button
                    type="button"
                    onClick={() => openPeerJobs(group.peerId)}
                    className="flex w-full items-center gap-3 p-4 text-left"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={group.peerAvatar}
                        alt=""
                        className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-md"
                        loading="lazy"
                      />
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <h3 className="truncate text-sm font-bold text-gray-900">
                          {group.peerName.split(' ')[0] || group.peerName}
                        </h3>
                        <span className="shrink-0 text-[10px] font-bold text-slate-500">
                          {t('messages_page.peer_jobs_count', { count: group.conversations.length })}
                        </span>
                      </div>
                      {group.conversations.length === 1 ? (
                        <p className="truncate text-sm font-medium text-gray-600">
                          {translateJobTitle(group.conversations[0]!.requestTitle, '', null, t)}
                        </p>
                      ) : (
                        <p className="truncate text-sm font-medium text-gray-600">
                          {t('messages_page.peer_multiple_jobs')}
                        </p>
                      )}
                    </div>
                    <Icons.ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                </div>
              ))}
            {useRemoteChat &&
              listLevel === 'jobs' &&
              selectedPeerGroup?.conversations.map((s) => (
                <div
                  key={s.id}
                  className={clsx(
                    'relative w-full overflow-hidden border-b border-[#E9EDF5] border-l-4 bg-white transition-colors',
                    remote.selectedId === s.id ? 'border-l-[#2563FF] bg-[#EEF3FF]/55' : 'border-l-transparent hover:bg-white/80',
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
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">
                          {translateJobTitle(s.requestTitle, '', null, t)}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => hideConversation(s.id)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={t('messages_page.remove_conversation')}
                    >
                      <Icons.Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div
          className={clsx(
            'flex max-h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#F7F8FC]',
            !showThread && 'hidden',
            'md:flex',
          )}
          style={
            !isMd && keyboardInset > 0
              ? {
                  maxHeight: `calc(100dvh - ${Math.min(keyboardInset, 280)}px)`,
                  height: `calc(100dvh - ${Math.min(keyboardInset, 280)}px)`,
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
