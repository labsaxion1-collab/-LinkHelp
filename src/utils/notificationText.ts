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

  if (normalizedTitle.includes('official hire') || normalizedTitle.includes('contratação oficial')) {
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

  // ── Chat / hire — open messages ─────────────────────────────────────
  if (
    title.includes('message') ||
    title.includes('nova mensagem') ||
    title.includes('nouveau message') ||
    title.includes('official hire') ||
    title.includes('contratação oficial') ||
    title.includes('contratação confirmada') ||
    title.includes('embauche officielle') ||
    title.includes('helper hired') ||
    title.includes('helper contratado') ||
    title.includes('helper embauché')
  ) {
    return ROUTES.messages;
  }

  // ── New application — open client dashboard ──────────────────────────
  if (
    title.includes('new application') ||
    title.includes('nova candidatura') ||
    title.includes('nouvelle candidature') ||
    title.includes('application withdrawn') ||
    title.includes('candidatura retirada')
  ) {
    return ROUTES.clientDashboard;
  }

  // ── Application accepted / official hire (helper side) — open chat ──
  if (
    title.includes('application accepted') ||
    title.includes('candidatura aceita') ||
    title.includes('candidature acceptée')
  ) {
    return ROUTES.messages;
  }

  // ── Application update / declined ────────────────────────────────────
  if (
    title.includes('application update') ||
    title.includes('atualização de candidatura') ||
    title.includes('declined')
  ) {
    return ROUTES.helperOpportunities;
  }

  // ── Request cancelled ────────────────────────────────────────────────
  if (
    title.includes('request cancelled') ||
    title.includes('pedido cancelado') ||
    title.includes('chamado cancelado') ||
    title.includes('demande annulée')
  ) {
    if (
      message.includes('client cancelled') ||
      message.includes('the client cancelled') ||
      message.includes('cliente cancelou') ||
      message.includes('o cliente cancelou') ||
      message.includes('le client a annulé')
    ) {
      return ROUTES.helperDashboard;
    }
    return ROUTES.clientDashboard;
  }

  // ── Credits / payment ────────────────────────────────────────────────
  if (
    title.includes('credit') ||
    title.includes('crédito') ||
    title.includes('linkcredit') ||
    title.includes('payment') ||
    title.includes('pagamento')
  ) {
    return ROUTES.helperDashboard;
  }

  // ── Service / job completed ──────────────────────────────────────────
  if (
    title.includes('service completed') ||
    title.includes('serviço concluído') ||
    title.includes('work completed') ||
    title.includes('job completed')
  ) {
    return ROUTES.clientDashboard;
  }

  // ── Review pending ───────────────────────────────────────────────────
  if (
    title.includes('review') ||
    title.includes('avaliação') ||
    title.includes('évaluation')
  ) {
    return ROUTES.clientDashboard;
  }

  return ROUTES.notifications;
}

/**
 * Extracts a request ID from a notification action URL of the form
 * "/client/dashboard?request=UUID". Returns null if not present.
 */
export function getNotificationRequestId(notification: AppNotification): string | null {
  if (!notification.actionUrl) return null;
  try {
    const url = new URL(notification.actionUrl, 'http://x');
    return url.searchParams.get('request');
  } catch {
    return null;
  }
}
