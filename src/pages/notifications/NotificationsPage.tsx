import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, MessageSquare, Briefcase, DollarSign, Target, Star, ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { NOTIFICATION_PREVIEW_TYPES } from '@/config/notificationPreviewTypes';
import { useAppData } from '@/context/AppDataContext';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { useUserNotifications } from '@/hooks/useUserNotifications';
import { useLanguage } from '@/context/LanguageContext';
import { getLocalizedNotificationText, getNotificationActionUrl } from '@/utils/notificationText';
import { ClearNotificationsButton } from '@/components/notifications/ClearNotificationsButton';

export default function NotificationsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const me = useSessionViewer();
  const userId = me.id;
  const { markAllAsRead, markNotificationAsRead } = useAppData();
  const userNotifications = useUserNotifications(userId);

  const [filter, setFilter] = useState<'all' | 'unread' | 'message' | 'application' | 'payment'>('all');

  const displayedNotifications = useMemo(() => {
    if (filter === 'unread') return userNotifications.filter((n) => !n.read);
    if (filter === 'all') return userNotifications;
    return userNotifications.filter((n) => n.type === filter);
  }, [userNotifications, filter]);

  const unreadCount = userNotifications.filter((n) => !n.read).length;

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
        return <Briefcase className="h-6 w-6 text-blue-500" />;
      case 'message':
        return <MessageSquare className="h-6 w-6 text-green-500" />;
      case 'payment':
        return <DollarSign className="h-6 w-6 text-emerald-500" />;
      case 'job_update':
        return <Target className="h-6 w-6 text-purple-500" />;
      case 'system':
        return <Star className="h-6 w-6 text-yellow-500" />;
      default:
        return <Bell className="h-6 w-6 text-gray-500" />;
    }
  };

  const handleNotificationClick = (notificationId: string, read: boolean, actionUrl: string) => {
    if (!read) markNotificationAsRead(notificationId);
    if (actionUrl) navigate(actionUrl);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-gray-900">
              {t('notifications.title')}
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-sm font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="mt-1 text-gray-500">{t('notifications.page_subtitle')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-blue-600 shadow-sm transition-colors hover:bg-gray-50"
              >
                <CheckCircle2 className="h-4 w-4" /> {t('notifications.mark_all_read')}
              </button>
            ) : null}
            {userNotifications.length > 0 ? <ClearNotificationsButton userId={userId} variant="page" /> : null}
          </div>
        </div>

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-400">{t('notification_types.section_title')}</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">{t('notification_types.section_sub')}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {NOTIFICATION_PREVIEW_TYPES.map((item) => {
              const Icon = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[item.icon] ?? Icons.Bell;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </span>
                  <span className="text-sm font-bold text-slate-800">{t(item.labelKey)}</span>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mb-2 flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
          {(['all', 'unread', 'application', 'message', 'payment'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-all ${filter === f ? 'bg-gray-900 text-white shadow-md' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {f === 'all' && t('notifications.filter_all')}
              {f === 'unread' && t('notifications.filter_unread')}
              {f === 'application' && t('notifications.filter_application')}
              {f === 'message' && t('notifications.filter_message')}
              {f === 'payment' && t('notifications.filter_payment')}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              {displayedNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
                    <Bell className="h-10 w-10 text-gray-300" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-gray-900">{t('notifications.empty_now_title')}</h3>
                  <p className="max-w-sm text-gray-500">{t('notifications.empty_now_sub')}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {displayedNotifications.map((notification) => {
                    const localized = getLocalizedNotificationText(notification, t);
                    const actionUrl = getNotificationActionUrl(notification);
                    return (
                      <div
                        key={notification.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleNotificationClick(notification.id, notification.read, actionUrl)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleNotificationClick(notification.id, notification.read, actionUrl);
                          }
                        }}
                        className={`group relative flex cursor-pointer items-start gap-4 p-5 transition-all hover:bg-gray-50 sm:gap-6 sm:p-6 ${!notification.read ? 'bg-blue-50/20' : ''}`}
                      >
                        {!notification.read ? <div className="absolute left-0 top-0 h-full w-1 bg-blue-500" /> : null}

                        <div
                          className={`shrink-0 rounded-2xl p-3 ${!notification.read ? 'bg-blue-100 backdrop-blur-sm' : 'border border-transparent bg-gray-100 group-hover:border-gray-200 group-hover:bg-white'} transition-all`}
                        >
                          {getIcon(notification.type)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex flex-col justify-between gap-1 sm:flex-row sm:items-start sm:gap-4">
                            <h3 className={`truncate text-base font-bold ${!notification.read ? 'text-gray-900' : 'text-gray-800'}`}>
                              {localized.title}
                            </h3>
                            <span className="shrink-0 whitespace-nowrap text-xs font-bold text-gray-400">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>
                          <p className={`mb-3 text-sm leading-relaxed ${!notification.read ? 'font-medium text-gray-700' : 'text-gray-600'}`}>
                            {localized.message}
                          </p>

                          {actionUrl ? (
                            <button
                              type="button"
                              className="inline-flex items-center text-sm font-bold text-blue-600 transition-colors hover:text-blue-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationClick(notification.id, notification.read, actionUrl);
                              }}
                            >
                              {t('notifications.view_details')} <ChevronRight className="ml-0.5 h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 to-blue-900 p-6 text-white shadow-md">
                <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative z-10">
                  <div className="mb-3 flex items-center gap-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-bold uppercase tracking-widest text-blue-200">{t('notifications.smart_hub_badge')}</span>
                  </div>
                  <h3 className="mb-2 text-xl font-bold">{t('notifications.smart_hub_title')}</h3>
                  <p className="text-sm leading-relaxed text-blue-100/90">{t('notifications.smart_hub_sub')}</p>
                </div>
              </div>

              <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                {me.userType === 'helper' ? (
                  <>
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                        <span className="text-xl">🔥</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{t('notifications.helper_insight_cleaning_title')}</h4>
                        <p className="mt-1 text-xs leading-relaxed text-gray-500">{t('notifications.helper_insight_cleaning_body')}</p>
                      </div>
                    </div>
                    <div className="h-px w-full bg-gray-100" />
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50">
                        <span className="text-xl">📈</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{t('notifications.helper_insight_rate_title')}</h4>
                        <p className="mt-1 text-xs leading-relaxed text-gray-500">{t('notifications.helper_insight_rate_body')}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50">
                        <span className="text-xl">🌟</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{t('notifications.client_insight_near_title')}</h4>
                        <p className="mt-1 text-xs leading-relaxed text-gray-500">{t('notifications.client_insight_near_body')}</p>
                      </div>
                    </div>
                    <div className="h-px w-full bg-gray-100" />
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                        <span className="text-xl">💡</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{t('notifications.client_insight_photo_title')}</h4>
                        <p className="mt-1 text-xs leading-relaxed text-gray-500">{t('notifications.client_insight_photo_body')}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
