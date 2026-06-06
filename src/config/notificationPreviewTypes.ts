/** Visual notification types aligned with live in-app events. */

export const NOTIFICATION_PREVIEW_TYPES = [
  { id: 'new_application', icon: 'Briefcase', labelKey: 'notification_types.new_application', tone: 'blue' },
  { id: 'application_accepted', icon: 'UserCheck', labelKey: 'notification_types.application_accepted', tone: 'emerald' },
  { id: 'official_hire', icon: 'Handshake', labelKey: 'notification_types.official_hire', tone: 'indigo' },
  { id: 'new_message', icon: 'MessageSquare', labelKey: 'notification_types.new_message', tone: 'blue' },
  { id: 'request_cancelled', icon: 'Ban', labelKey: 'notification_types.request_cancelled', tone: 'rose' },
  { id: 'service_completed', icon: 'CheckCircle2', labelKey: 'notification_types.service_completed', tone: 'purple' },
  { id: 'review_received', icon: 'Star', labelKey: 'notification_types.review_received', tone: 'amber' },
] as const;
