import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bell, CheckCircle2, MessageSquare, Briefcase, DollarSign, Target, Star, Trash2, ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { NOTIFICATION_PREVIEW_TYPES } from '@/config/notificationPreviewTypes';
import { useAppData } from '@/context/AppDataContext';
import { useSessionViewer } from '@/hooks/useSessionViewer';
import { useLanguage } from '@/context/LanguageContext';
import { getLocalizedNotificationText, getNotificationActionUrl } from '@/utils/notificationText';

export default function NotificationsPage() {
  const { t } = useLanguage();
  const me = useSessionViewer();
  const userId = me.id;
  const { notifications, markAllAsRead, markNotificationAsRead } = useAppData();
  
  const [filter, setFilter] = useState<'all' | 'unread' | 'message' | 'application' | 'payment'>('all');

  const userNotifications = notifications.filter(n => n.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
  
  let displayedNotifications = userNotifications;
  if (filter === 'unread') {
    displayedNotifications = userNotifications.filter(n => !n.read);
  } else if (filter !== 'all') {
    displayedNotifications = userNotifications.filter(n => n.type === filter);
  }

  const unreadCount = userNotifications.filter(n => !n.read).length;

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
      case 'application': return <Briefcase className="w-6 h-6 text-blue-500" />;
      case 'message': return <MessageSquare className="w-6 h-6 text-green-500" />;
      case 'payment': return <DollarSign className="w-6 h-6 text-emerald-500" />;
      case 'job_update': return <Target className="w-6 h-6 text-purple-500" />;
      case 'system': return <Star className="w-6 h-6 text-yellow-500" />;
      default: return <Bell className="w-6 h-6 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              {t('notifications.title')}
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-sm px-2.5 py-0.5 rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-gray-500 mt-1">{t('notifications.page_subtitle')}</p>
          </div>
          
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="px-4 py-2 bg-white text-blue-600 font-bold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm text-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> {t('notifications.mark_all_read')}
            </button>
          )}
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

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 hide-scrollbar">
          {(['all', 'unread', 'application', 'message', 'payment'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filter === f ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {f === 'all' && t('notifications.filter_all')}
              {f === 'unread' && t('notifications.filter_unread')}
              {f === 'application' && t('notifications.filter_application')}
              {f === 'message' && t('notifications.filter_message')}
              {f === 'payment' && t('notifications.filter_payment')}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Notifications List - 2 columns on lg */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              {displayedNotifications.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Bell className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t('notifications.empty_title')}</h3>
                  <p className="text-gray-500 max-w-sm">{t('notifications.empty_sub')}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {displayedNotifications.map((notification) => {
                    const localized = getLocalizedNotificationText(notification, t);
                    const actionUrl = getNotificationActionUrl(notification);
                    return (
                      <div
                        key={notification.id}
                        onClick={() => !notification.read && markNotificationAsRead(notification.id)}
                        className={`p-5 sm:p-6 hover:bg-gray-50 transition-all cursor-pointer relative group flex items-start gap-4 sm:gap-6 ${!notification.read ? 'bg-blue-50/20' : ''}`}
                      >
                        {!notification.read && (
                          <div className="absolute left-0 top-0 w-1 h-full bg-blue-500"></div>
                        )}

                        <div className={`p-3 rounded-2xl shrink-0 ${!notification.read ? 'bg-blue-100 backdrop-blur-sm' : 'bg-gray-100 group-hover:bg-white border border-transparent group-hover:border-gray-200'} transition-all`}>
                          {getIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4 mb-1.5">
                            <h3 className={`text-base font-bold truncate ${!notification.read ? 'text-gray-900' : 'text-gray-800'}`}>
                              {localized.title}
                            </h3>
                            <span className="text-xs font-bold text-gray-400 whitespace-nowrap shrink-0">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>
                          <p className={`text-sm leading-relaxed mb-3 ${!notification.read ? 'text-gray-700 font-medium' : 'text-gray-600'}`}>
                            {localized.message}
                          </p>

                          {actionUrl && (
                            <Link
                              to={actionUrl}
                              className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
                              onClick={(e) => {
                                 e.stopPropagation();
                                 markNotificationAsRead(notification.id);
                              }}
                            >
                              {t('notifications.view_details')} <ChevronRight className="w-4 h-4 ml-0.5" />
                            </Link>
                          )}
                        </div>

                        <button className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Central Inteligente Side Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              
              {/* Central Inteligente Header */}
              <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-3xl p-6 shadow-md text-white relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-sm tracking-widest uppercase text-blue-200">{t('notifications.smart_hub_badge')}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t('notifications.smart_hub_title')}</h3>
                  <p className="text-sm text-blue-100/90 leading-relaxed">
                    {t('notifications.smart_hub_sub')}
                  </p>
                </div>
              </div>

              {/* Suggestions items */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4">
                
                {location.pathname.includes('/helper') ? (
                  <>
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                        <span className="text-xl">🔥</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{t('notifications.helper_insight_cleaning_title')}</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t('notifications.helper_insight_cleaning_body')}</p>
                      </div>
                    </div>
                    
                    <div className="w-full h-px bg-gray-100"></div>

                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                        <span className="text-xl">📈</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{t('notifications.helper_insight_rate_title')}</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t('notifications.helper_insight_rate_body')}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <span className="text-xl">🌟</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{t('notifications.client_insight_near_title')}</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t('notifications.client_insight_near_body')}</p>
                      </div>
                    </div>
                    
                    <div className="w-full h-px bg-gray-100"></div>

                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <span className="text-xl">💡</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{t('notifications.client_insight_photo_title')}</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t('notifications.client_insight_photo_body')}</p>
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
