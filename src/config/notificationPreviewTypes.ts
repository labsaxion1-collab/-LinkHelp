/** Visual notification types — wire to push/in-app events later. */

export const NOTIFICATION_PREVIEW_TYPES = [
  { id: 'new_message', icon: 'MessageSquare', labelKey: 'notification_types.new_message', tone: 'blue' },
  { id: 'reschedule', icon: 'CalendarClock', labelKey: 'notification_types.reschedule', tone: 'amber' },
  { id: 'task_update', icon: 'ClipboardList', labelKey: 'notification_types.task_update', tone: 'purple' },
  { id: 'helper_replied', icon: 'UserCheck', labelKey: 'notification_types.helper_replied', tone: 'emerald' },
  { id: 'client_replied', icon: 'MessagesSquare', labelKey: 'notification_types.client_replied', tone: 'slate' },
] as const;
