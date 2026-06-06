import type { AppNotification } from '@/types/notification';
import { ROUTES } from '@/utils/constants';
import { translateJobTitle } from '@/utils/translateCategory';

type Translate = (key: string, variables?: Record<string, string | number>) => string;

function quotedValue(text: string): string {
  const match = text.match(/"([^"]+)"/);
  return match?.[1] ?? '';
}

function leadingName(text: string, marker: string): string {
  const index = text.toLowerCase().indexOf(marker.toLowerCase());
  return index > 0 ? text.slice(0, index).trim() : '';
}

function localizedQuotedJob(text: string, t: Translate): string {
  const raw = quotedValue(text);
  return raw ? translateJobTitle(raw, '', null, t) : raw;
}

export function getLocalizedNotificationText(notification: AppNotification, t: Translate) {
  const title = notification.title.trim();
  const message = notification.message.trim();
  const normalizedTitle = title.toLowerCase();
  const normalizedMessage = message.toLowerCase();

  if (normalizedTitle.includes('new application') || normalizedTitle.includes('nova candidatura')) {
    const helper =
      leadingName(message, ' applied to ') ||
      leadingName(message, ' se candidatou') ||
      leadingName(message, ' enviou uma proposta') ||
      t('notifications.fallback_helper');
    const job = localizedQuotedJob(message, t);
    return {
      title: t('notifications.event_new_application_title'),
      message: t('notifications.event_new_application_body', { helper, job }),
    };
  }

  if (normalizedTitle.includes('request cancelled') || normalizedTitle.includes('chamado cancelado')) {
    const job = localizedQuotedJob(message, t);
    if (
      normalizedMessage.includes('your request') ||
      normalizedMessage.includes('seu pedido') ||
      normalizedMessage.includes('seu chamado')
    ) {
      return {
        title: t('notifications.event_request_cancelled_title'),
        message: t('notifications.event_request_cancelled_client_body', { job }),
      };
    }
    if (
      normalizedMessage.includes('client cancelled') ||
      normalizedMessage.includes('the client cancelled') ||
      normalizedMessage.includes('cliente cancelou') ||
      normalizedMessage.includes('o cliente cancelou')
    ) {
      return {
        title: t('notifications.event_request_cancelled_title'),
        message: t('notifications.event_request_cancelled_helper_body', { job }),
      };
    }
    return {
      title: t('notifications.event_request_cancelled_title'),
      message: job ? t('notifications.event_request_cancelled_client_body', { job }) : message,
    };
  }

  if (normalizedTitle.includes('application accepted')) {
    const job = localizedQuotedJob(message, t);
    return {
      title: t('notifications.event_application_accepted_title'),
      message: t('notifications.event_application_accepted_body', { job }),
    };
  }

  if (normalizedTitle.includes('application update')) {
    return {
      title: t('notifications.event_application_update_title'),
      message: t('notifications.event_application_update_body'),
    };
  }

  if (normalizedTitle.includes('new message')) {
    const sender = leadingName(message, ' sent you ') || t('notifications.fallback_user');
    return {
      title: t('notifications.event_new_message_title'),
      message: t('notifications.event_new_message_body', { sender }),
    };
  }

  if (normalizedTitle.includes('application withdrawn')) {
    return {
      title: t('notifications.event_application_withdrawn_title'),
      message: t('notifications.event_application_withdrawn_body'),
    };
  }

  if (normalizedTitle.includes('official hire')) {
    const job = localizedQuotedJob(message, t);
    return {
      title: t('notifications.event_official_hire_title'),
      message: t('notifications.event_official_hire_body', { job }),
    };
  }

  if (normalizedTitle.includes('helper hired')) {
    const job = localizedQuotedJob(message, t);
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

export function getNotificationActionUrl(notification: AppNotification): string {
  if (notification.actionUrl) return notification.actionUrl;

  const title = notification.title.trim().toLowerCase();
  const message = notification.message.trim().toLowerCase();

  if (title.includes('message') || title.includes('official hire') || title.includes('helper hired')) {
    return ROUTES.messages;
  }

  if (title.includes('new application') || title.includes('nova candidatura') || title.includes('application withdrawn')) {
    return ROUTES.clientDashboard;
  }

  if (title.includes('application accepted')) {
    return ROUTES.messages;
  }

  if (title.includes('application update') || title.includes('declined')) {
    return ROUTES.helperOpportunities;
  }

  if (title.includes('request cancelled') || title.includes('chamado cancelado')) {
    if (
      message.includes('client cancelled') ||
      message.includes('the client cancelled') ||
      message.includes('cliente cancelou') ||
      message.includes('o cliente cancelou')
    ) {
      return ROUTES.helperDashboard;
    }
    return ROUTES.clientDashboard;
  }

  return ROUTES.notifications;
}
