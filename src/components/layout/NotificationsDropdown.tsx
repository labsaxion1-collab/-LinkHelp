import React, { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, MessageSquare, Briefcase, DollarSign, Target, Star, X } from 'lucide-react';
import { useAppDataActionsRef } from '@/context/AppDataContext';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTES } from '@/utils/constants';
import { getLocalizedNotificationText, getNotificationActionUrl } from '@/utils/notificationText';
import { useUserNotifications } from '@/hooks/useUserNotifications';
import { ClearNotificationsButton } from '@/components/notifications/ClearNotificationsButton';

interface NotificationsDropdownProps {
  userId: string;
  /** Smaller trigger on mobile topbar */
  compact?: boolean;
}

import { useDevRenderCount } from '@/utils/devRenderCount';

function NotificationsDropdownInner({ userId, compact = false }: NotificationsDropdownProps) {
  useDevRenderCount('NotificationsDropdown');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const navigate = useNavigate();
  const location = useLocation();
  const appDataActionsRef = useAppDataActionsRef();
  const { t } = useLanguage();

  const userNotifications = useUserNotifications(userId);
  const unreadCount = useMemo(() => userNotifications.filter((n) => !n.read).length, [userNotifications]);
  const previewNotifications = useMemo(() => userNotifications.slice(0, 10), [userNotifications]);

  const close = useCallback(() => setIsOpen(false), []);

  const isSurfaceTarget = useCallback((target: Node) => {
    const refs = [dropdownRef, buttonRef, panelRef];
    return refs.some((ref) => ref.current?.contains(target));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isSurfaceTarget(event.target as Node)) return;
      setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSurfaceTarget]);

  useEffect(() => {
    close();
  }, [location.pathname, location.search, close]);

  useEffect(() => {
    if (!isOpen || compact) return;
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = Math.min(384, window.innerWidth - 16);
      const left = Math.max(8, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 8));
      setPanelStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left,
        width: panelWidth,
        zIndex: 120,
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, compact]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t('notifications.time_now');
    if (minutes < 60) return t('notifications.time_min_ago', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('notifications.time_hours_ago', { count: hours });
    const days = Math.floor(hours / 24);
    return t('notifications.time_days_ago', { count: days });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'application':
        return <Briefcase className="w-5 h-5 text-blue-500" />;
      case 'message':
        return <MessageSquare className="w-5 h-5 text-green-500" />;
      case 'payment':
        return <DollarSign className="w-5 h-5 text-emerald-500" />;
      case 'job_update':
        return <Target className="w-5 h-5 text-purple-500" />;
      case 'system':
        return <Star className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const [recentlyReceivedId, setRecentlyReceivedId] = useState<string | null>(null);

  useEffect(() => {
    if (unreadCount > 0) {
      const latest = userNotifications[0];
      if (latest && !latest.read && Date.now() - latest.createdAt < 5000) {
        setRecentlyReceivedId(latest.id);
        setTimeout(() => setRecentlyReceivedId(null), 3000);
      }
    }
  }, [userNotifications, unreadCount]);

  const handleMarkAllRead = () => {
    appDataActionsRef.current.markAllAsRead();
    close();
  };

  const handleNotificationClick = (notificationId: string, actionUrl: string) => {
    appDataActionsRef.current.markNotificationAsRead(notificationId);
    close();
    if (actionUrl) navigate(actionUrl);
  };

  const handleViewAll = () => {
    close();
    navigate(ROUTES.notifications);
  };

  const panelContent = (
    <>
      <div className="border-b border-gray-100 bg-gray-50/50 p-4">
        <div className="flex flex-col gap-2.5">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <h3 className="min-w-0 truncate whitespace-nowrap text-base font-bold text-gray-900">
              {t('notifications.title')}
            </h3>
            {compact ? (
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {unreadCount > 0 || userNotifications.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="shrink-0 text-xs font-bold text-blue-600 transition-colors hover:text-blue-800"
                >
                  {t('notifications.mark_all_read')}
                </button>
              ) : null}
              {userNotifications.length > 0 ? (
                <ClearNotificationsButton userId={userId} variant="dropdown" onCleared={close} />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="max-h-[min(60vh,calc(100dvh-10rem))] overflow-y-auto no-scrollbar">
        {userNotifications.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-gray-500">
            <Bell className="w-8 h-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-600">{t('notifications.empty_now_title')}</p>
            <p className="mt-1 text-xs">{t('notifications.empty_now_sub')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {previewNotifications.map((notification) => {
              const localized = getLocalizedNotificationText(notification, t);
              const actionUrl = getNotificationActionUrl(notification);
              return (
                <button
                  type="button"
                  key={notification.id}
                  className={`block w-full p-4 text-left hover:bg-gray-50 transition-colors relative group ${!notification.read ? 'bg-blue-50/30' : ''}`}
                  onClick={() => handleNotificationClick(notification.id, actionUrl)}
                >
                  {!notification.read && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
                  )}
                  <span className="flex gap-3 items-start">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${!notification.read ? 'bg-blue-100' : 'bg-gray-100'} transition-colors`}
                    >
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h4
                          className={`text-sm font-bold truncate ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}
                        >
                          {localized.title}
                        </h4>
                        <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap pt-1">
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{localized.message}</p>
                    </div>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {userNotifications.length > 0 && (
        <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
          <button
            type="button"
            onClick={handleViewAll}
            className="text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors inline-flex items-center justify-center gap-1 group"
          >
            {t('notifications.view_all')}{' '}
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`relative rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none ${compact ? 'p-1' : 'p-2'}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} ${recentlyReceivedId ? 'animate-bounce text-blue-500' : ''}`} />
        {unreadCount > 0 && (
          <span
            className={`absolute flex items-center justify-center rounded-full border border-white bg-red-500 font-bold text-white shadow-sm ring-1 ring-red-500/50 ${compact ? 'top-0 right-0 h-3.5 w-3.5 text-[8px]' : 'top-1 right-1 h-4 w-4 text-[10px]'}`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && compact
        ? createPortal(
            <div className="fixed inset-0 z-[120] md:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
                aria-label={t('common.close')}
                onClick={close}
              />
              <div
                ref={panelRef}
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute inset-x-3 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] max-h-[calc(100dvh-6.5rem-env(safe-area-inset-bottom))] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              >
                {panelContent}
              </div>
            </div>,
            document.body,
          )
        : null}

      {isOpen && !compact
        ? createPortal(
            <div
              ref={panelRef}
              style={panelStyle}
              onMouseDown={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 overflow-hidden animate-in slide-in-from-top-2 duration-200"
            >
              {panelContent}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export const NotificationsDropdown = memo(NotificationsDropdownInner);
