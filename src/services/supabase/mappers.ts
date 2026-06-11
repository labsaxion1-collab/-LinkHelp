import { avatarUrlForName } from '@/utils/avatarUrl';
import type { HelperSubscriptionTier } from '@/types/helperSubscription';
import type { Application } from '@/types/application';
import type { Job, JobUrgency } from '@/types/job';
import type { AppNotification } from '@/types/notification';
import type { UpcomingJob, UpcomingWorkflowStatus } from '@/types/upcoming';
import type {
  ApplicationRow,
  MapperProfile,
  NotificationRow,
  RequestRow,
  UpcomingJobRow,
} from '@/types/database';
import { normalizeApplicationStatus, normalizeRequestStatus } from '@/utils/statusNormalize';

export function tsFromIso(iso: string): number {
  return new Date(iso).getTime();
}

export function requestRowToJob(row: RequestRow, client: MapperProfile): Job {
  const display = client.name || 'Client';
  const budgetValue =
    row.budget?.trim() ||
    (row.budget_type === 'fixed' && row.budget_amount
      ? `${row.currency || 'CAD'} $${Math.round(Number(row.budget_amount))}`
      : '');
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: display,
    clientAvatar: client.avatar_url || avatarUrlForName(display, 'f1f5f9', '334155'),
    clientRating: client.rating ?? null,
    title: row.title,
    category: row.category,
    description: row.description,
    date: '',
    location: row.location,
    address: row.address,
    city: row.city,
    region: row.region,
    postalCode: row.postal_code,
    latitude: row.latitude,
    longitude: row.longitude,
    preferredDate: row.preferred_date,
    preferredTimeWindow: row.preferred_time_window,
    preferredTime: row.preferred_time,
    preferredPeriod:
      (row as RequestRow & { preferred_period?: string | null }).preferred_period ??
      row.preferred_time_window,
    subcategory: row.subcategory,
    budgetType: row.budget_type,
    budgetAmount: row.budget_amount,
    currency: row.currency,
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    acceptedAmount: row.accepted_amount,
    applicantCount: row.application_count ?? 0,
    exclusiveHelperId: row.exclusive_helper_id ?? null,
    value: budgetValue || '---',
    urgency: (row.urgency === 'high' ? 'high' : 'normal') as JobUrgency,
    status: normalizeRequestStatus(row.status),
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
    proposedAmount: row.proposed_amount != null ? Number(row.proposed_amount) : null,
    isExclusive: row.is_exclusive === true,
    helperName: hName,
    helperAvatar: helper.avatar_url || avatarUrlForName(hName, 'dcfce7', '14532d'),
    helperRating: helper.rating ?? 5,
    helperJobs: helper.jobs_completed ?? 0,
    helperPlan: (helper.plan_type as HelperSubscriptionTier | undefined) ?? 'BASIC',
    status: normalizeApplicationStatus(row.status),
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
