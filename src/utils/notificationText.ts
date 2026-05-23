import type { AppNotification } from '@/types/notification';

type Translate = (key: string, variables?: Record<string, string | number>) => string;

function quotedValue(text: string): string {
  const match = text.match(/"([^"]+)"/);
  return match?.[1] ?? '';
}

function leadingName(text: string, marker: string): string {
  const index = text.toLowerCase().indexOf(marker.toLowerCase());
  return index > 0 ? text.slice(0, index).trim() : '';
}

export function getLocalizedNotificationText(notification: AppNotification, t: Translate) {
  const title = notification.title.trim();
  const message = notification.message.trim();
  const normalizedTitle = title.toLowerCase();
  const normalizedMessage = message.toLowerCase();

  if (normalizedTitle === 'new application') {
    const helper = leadingName(message, ' applied to ') || t('notifications.fallback_helper');
    const job = quotedValue(message);
    return {
      title: t('notifications.event_new_application_title'),
      message: t('notifications.event_new_application_body', { helper, job }),
    };
  }

  if (normalizedTitle === 'application accepted') {
    const job = quotedValue(message);
    return {
      title: t('notifications.event_application_accepted_title'),
      message: t('notifications.event_application_accepted_body', { job }),
    };
  }

  if (normalizedTitle === 'application update') {
    return {
      title: t('notifications.event_application_update_title'),
      message: t('notifications.event_application_update_body'),
    };
  }

  if (normalizedTitle === 'new message') {
    const sender = leadingName(message, ' sent you ') || t('notifications.fallback_user');
    return {
      title: t('notifications.event_new_message_title'),
      message: t('notifications.event_new_message_body', { sender }),
    };
  }

  if (normalizedTitle === 'application withdrawn') {
    return {
      title: t('notifications.event_application_withdrawn_title'),
      message: t('notifications.event_application_withdrawn_body'),
    };
  }

  if (normalizedTitle === 'official hire') {
    const job = quotedValue(message);
    return {
      title: t('notifications.event_official_hire_title'),
      message: t('notifications.event_official_hire_body', { job }),
    };
  }

  if (normalizedTitle === 'helper hired') {
    const job = quotedValue(message);
    return {
      title: t('notifications.event_helper_hired_title'),
      message: t('notifications.event_helper_hired_body', { job }),
    };
  }

  if (normalizedMessage.includes('client chose another helper')) {
    return {
      title: t('notifications.event_application_update_title'),
      message: t('notifications.event_application_update_body'),
    };
  }

  return { title, message };
}
