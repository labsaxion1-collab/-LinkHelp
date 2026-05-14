import { avatarUrlForName } from '@/utils/avatarUrl';
import type { HelperSubscriptionTier } from '@/types/helperSubscription';
import type { Application } from '@/types/application';
import type { Job, JobStatus, JobUrgency } from '@/types/job';
import type { AppNotification } from '@/types/notification';
import type { UpcomingJob, UpcomingWorkflowStatus } from '@/types/upcoming';
import type { ApplicationRow, MapperProfile, NotificationRow, RequestRow, UpcomingJobRow } from '@/types/database';

export function tsFromIso(iso: string): number {
  return new Date(iso).getTime();
}

export function requestRowToJob(row: RequestRow, client: MapperProfile): Job {
  const display = client.name || 'Client';
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: display,
    clientAvatar: client.avatar_url || avatarUrlForName(display, 'f1f5f9', '334155'),
    title: row.title,
    category: row.category,
    description: row.description,
    date: '',
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    subcategory: row.subcategory,
    value: row.budget?.trim() ? row.budget : '—',
    urgency: (row.urgency === 'high' ? 'high' : 'normal') as JobUrgency,
    status: row.status as JobStatus,
    createdAt: tsFromIso(row.created_at),
  };
}

export function applicationRowToApp(row: ApplicationRow, helper: MapperProfile): Application {
  const hName = helper.name || 'Helper';
  return {
    id: row.id,
    jobId: row.request_id,
    helperId: row.helper_id,
    clientId: row.client_id,
    message: row.message ?? undefined,
    helperName: hName,
    helperAvatar: helper.avatar_url || avatarUrlForName(hName, 'dcfce7', '14532d'),
    helperRating: helper.rating ?? 5,
    helperJobs: helper.jobs_completed ?? 0,
    helperPlan: (helper.plan_type as HelperSubscriptionTier | undefined) ?? 'BASIC',
    status: row.status,
    createdAt: tsFromIso(row.created_at),
  };
}

export function upcomingRowToUpcoming(row: UpcomingJobRow): UpcomingJob {
  return {
    id: row.id,
    helperId: row.helper_id,
    jobId: row.request_id,
    clientName: row.client_name,
    clientAvatar: row.client_avatar || avatarUrlForName(row.client_name, 'f1f5f9', '334155'),
    title: row.title,
    category: row.category,
    description: row.description,
    location: row.location,
    value: row.value_hint || '—',
    urgency: row.urgency === 'high' ? 'high' : 'normal',
    scheduledAt: tsFromIso(row.scheduled_at),
    workflowStatus: row.workflow_status as UpcomingWorkflowStatus,
    createdAt: tsFromIso(row.created_at),
  };
}

export function notificationRowToApp(n: NotificationRow): AppNotification {
  return {
    id: n.id,
    userId: n.user_id,
    type: n.type as AppNotification['type'],
    title: n.title,
    message: n.description,
    read: n.read,
    actionUrl: n.action_url ?? undefined,
    createdAt: tsFromIso(n.created_at),
  };
}
