import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, MessageSquare, Briefcase, DollarSign, Target, Star } from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTES } from '@/utils/constants';
import { getLocalizedNotificationText } from '@/utils/notificationText';

interface NotificationsDropdownProps {
  userId: string;
}

export function NotificationsDropdown({ userId }: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, markNotificationAsRead, markAllAsRead } = useAppData();
  const { t } = useLanguage();

  const userNotifications = notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
  const unreadCount = userNotifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-gray-600 relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
      >
        <Bell className={`w-5 h-5 ${recentlyReceivedId ? 'animate-bounce text-blue-500' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white shadow-sm ring-1 ring-red-500/50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200 transition-opacity duration-150">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-900">{t('notifications.title')}</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
              >
                {t('notifications.mark_all_read')}
              </button>
            )}
          </div>

          <div className="max-h-[70vh] overflow-y-auto no-scrollbar">
            {userNotifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-gray-500">
                <Bell className="w-8 h-8 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-600">{t('notifications.empty_title')}</p>
                <p className="text-xs mt-1">{t('notifications.empty_sub')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {userNotifications.slice(0, 10).map((notification) => {
                  const localized = getLocalizedNotificationText(notification, t);
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors relative group ${!notification.read ? 'bg-blue-50/30' : ''}`}
                      onClick={() => {
                        if (!notification.read) {
                          markNotificationAsRead(notification.id);
                        }
                      }}
                    >
                      {!notification.read && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full"></div>
                      )}
                      <Link to={notification.actionUrl || '#'} className="flex gap-3 items-start">
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
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {userNotifications.length > 0 && (
            <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
              <Link
                to={ROUTES.notifications}
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center gap-1 group"
              >
                {t('notifications.view_all')}{' '}
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
