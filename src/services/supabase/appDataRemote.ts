import { getSupabase } from '@/lib/supabase';
import type { Job } from '@/types/job';
import type { Application, ApplicationStatus } from '@/types/application';
import type { UpcomingJob } from '@/types/upcoming';
import type { AppNotification } from '@/types/notification';
import type { ApplicationRow, NotificationRow, RequestRow, RequestStatus, UpcomingJobRow } from '@/types/database';
import {
  applicationRowToApp,
  notificationRowToApp,
  requestRowToJob,
  upcomingRowToUpcoming,
} from '@/services/supabase/mappers';
import { fetchProfilesAsMapperMap } from '@/services/supabase/fetchUserViews';
import { ensureConversation } from '@/services/supabase/conversationEnsure';

export async function fetchRemoteJobsAndApps(): Promise<{
  jobs: Job[];
  applications: Application[];
  upcomingJobs: UpcomingJob[];
  notifications: AppNotification[];
}> {
  const sb = getSupabase();
  if (!sb) {
    return { jobs: [], applications: [], upcomingJobs: [], notifications: [] };
  }

  const [
    { data: reqRows, error: reqErr },
    { data: appRows, error: appErr },
    { data: upRows },
    { data: notifRows, error: nErr },
    { data: convRows },
  ] = await Promise.all([
    sb.from('requests').select('*').order('created_at', { ascending: false }),
    sb.from('applications').select('*').order('created_at', { ascending: false }),
    sb.from('upcoming_jobs').select('*').order('scheduled_at', { ascending: true }),
    sb.from('notifications').select('*').order('created_at', { ascending: false }),
    sb.from('conversations').select('request_id, helper_id, contact_unlocked'),
  ]);

  if (reqErr) console.error(reqErr);
  if (appErr) console.error(appErr);
  if (nErr) console.error(nErr);

  const requests = (reqRows ?? []) as RequestRow[];
  const applicationsRaw = (appRows ?? []) as ApplicationRow[];
  const upcomingRaw = (upRows ?? []) as UpcomingJobRow[];
  const notifsRaw = (notifRows ?? []) as NotificationRow[];

  const userIds = new Set<string>();
  for (const r of requests) userIds.add(r.client_id);
  for (const a of applicationsRaw) {
    userIds.add(a.helper_id);
    userIds.add(a.client_id);
  }
  const profilesMap = await fetchProfilesAsMapperMap([...userIds]);

  const jobs: Job[] = requests.map((r) => {
    const c = profilesMap.get(r.client_id);
    return requestRowToJob(r, c ?? { name: null, avatar_url: null, rating: null, jobs_completed: null, plan_type: null });
  });

  const chatUnlockedKeys = new Set(
    ((convRows ?? []) as { request_id: string; helper_id: string; contact_unlocked: boolean }[])
      .filter((c) => c.contact_unlocked)
      .map((c) => `${c.request_id}:${c.helper_id}`),
  );

  const applications: Application[] = applicationsRaw.map((a) => {
    const h = profilesMap.get(a.helper_id);
    const app = applicationRowToApp(
      a,
      h ?? { name: null, avatar_url: null, rating: null, jobs_completed: null, plan_type: null },
    );
    return {
      ...app,
      chatUnlocked: chatUnlockedKeys.has(`${a.request_id}:${a.helper_id}`),
    };
  });

  const upcomingJobs = upcomingRaw.map(upcomingRowToUpcoming);
  const notifications = notifsRaw.map(notificationRowToApp);

  return { jobs, applications, upcomingJobs, notifications };
}

export function subscribeRemoteData(onChange: () => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};

  const ch = sb
    .channel('linkhelp-app-data')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'upcoming_jobs' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, onChange)
    .subscribe();

  return () => {
    sb.removeChannel(ch);
  };
}

export type RemoteCreateRequestInput = {
  clientId: string;
  category: string;
  subcategory?: string | null;
  title: string;
  description: string;
  urgency: string;
  location: string;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  preferredDate?: string | null;
  preferredTimeWindow?: string | null;
  preferredTime?: string | null;
  preferredPeriod?: string | null;
  dateLabel: string;
  budgetHint: string;
  budgetType?: 'fixed' | 'negotiable';
  budgetAmount?: number | null;
  currency?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  timezone?: string | null;
  createdTimezone?: string | null;
};

const EXTENDED_REQUEST_COLUMNS = [
  'address',
  'city',
  'region',
  'postal_code',
  'preferred_date',
  'preferred_time_window',
  'preferred_time',
  'budget_type',
  'budget_amount',
  'currency',
  'budget_min',
  'budget_max',
  'timezone',
  'created_timezone',
] as const;

function isMissingColumnError(error: { code?: string; message?: string } | null, column: string): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  const msg = (error.message ?? '').toLowerCase();
  return (
    (code === 'PGRST204' || code === '42703') &&
    (msg.includes(`'${column}'`) || msg.includes(`"${column}"`) || msg.includes(column))
  );
}

function buildRequestInsertPayload(input: RemoteCreateRequestInput, extended: boolean): Record<string, unknown> {
  const base: Record<string, unknown> = {
    client_id: input.clientId,
    category: input.category,
    subcategory: input.subcategory ?? null,
    title: input.title,
    description: input.description,
    urgency: input.urgency,
    location: input.location,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    budget: input.budgetHint?.trim() ? input.budgetHint : null,
    status: 'open',
  };

  if (!extended) return base;

  return {
    ...base,
    address: input.address ?? null,
    city: input.city ?? null,
    region: input.region ?? null,
    postal_code: input.postalCode ?? null,
    preferred_date: input.preferredDate ?? null,
    preferred_time_window: input.preferredPeriod ?? input.preferredTimeWindow ?? null,
    preferred_time: input.preferredTime?.trim() ? input.preferredTime : null,
    preferred_period: input.preferredPeriod ?? input.preferredTimeWindow ?? null,
    budget_type: input.budgetType ?? 'negotiable',
    budget_amount: input.budgetType === 'fixed' ? input.budgetAmount ?? null : null,
    currency: input.currency ?? 'CAD',
    budget_min: input.budgetMin ?? null,
    budget_max: input.budgetMax ?? null,
    timezone: input.timezone ?? input.createdTimezone ?? null,
    created_timezone: input.createdTimezone ?? input.timezone ?? null,
  };
}

export async function remoteCreateRequest(input: RemoteCreateRequestInput): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  let payload = buildRequestInsertPayload(input, true);
  let { error } = await sb.from('requests').insert(payload);

  if (error && EXTENDED_REQUEST_COLUMNS.some((col) => isMissingColumnError(error, col))) {
    if (import.meta.env.DEV) {
      console.warn('[LinkHelp] requests insert: retrying without extended location columns', error);
    }
    payload = buildRequestInsertPayload(input, false);
    ({ error } = await sb.from('requests').insert(payload));
  }

  if (error) {
    if (import.meta.env.DEV) {
      console.error('[LinkHelp] remoteCreateRequest failed', { code: error.code, message: error.message, details: error.details });
    }
    throw error;
  }
}

export async function remoteApply(input: {
  requestId: string;
  helperId: string;
  clientId: string;
  message?: string | null;
  proposedAmount?: number | null;
}): Promise<{ outcome: 'created' } | { outcome: 'already_exists'; applicationId: string }> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  if (input.clientId === input.helperId) {
    throw new Error('SELF_REQUEST');
  }

  const findExisting = async (): Promise<string | null> => {
    const { data } = await sb
      .from('applications')
      .select('id')
      .eq('request_id', input.requestId)
      .eq('helper_id', input.helperId)
      .neq('status', 'cancelled')
      .maybeSingle();
    return (data as { id?: string } | null)?.id ?? null;
  };

  const payload: Record<string, unknown> = {
    request_id: input.requestId,
    helper_id: input.helperId,
    client_id: input.clientId,
    message: input.message ?? null,
    status: 'pending',
  };
  if (input.proposedAmount != null) {
    payload.proposed_amount = input.proposedAmount;
  }

  const { error } = await sb.from('applications').insert(payload);

  if (error) {
    if (error.code === '23505') {
      const existingId = await findExisting();
      return { outcome: 'already_exists', applicationId: existingId ?? '' };
    }
    if (input.proposedAmount != null && isMissingColumnError(error, 'proposed_amount')) {
      delete payload.proposed_amount;
      const { error: retryErr } = await sb.from('applications').insert(payload);
      if (retryErr) {
        if (retryErr.code === '23505') {
          const existingId = await findExisting();
          return { outcome: 'already_exists', applicationId: existingId ?? '' };
        }
        throw new Error(retryErr.message || 'APPLICATION_INSERT_FAILED');
      }
    } else {
      throw new Error(error.message || 'APPLICATION_INSERT_FAILED');
    }
  }

  const { data: req } = await sb.from('requests').select('title').eq('id', input.requestId).maybeSingle();
  const title = (req as { title?: string } | null)?.title ?? 'Request';

  const { data: helper } = await sb.from('profiles').select('name').eq('id', input.helperId).maybeSingle();
  const hName = (helper as { name?: string } | null)?.name ?? 'A helper';

  const proposalPart =
    input.proposedAmount != null
      ? ` sent a proposal of CAD $${Math.round(input.proposedAmount)} for "${title}".`
      : ` applied to "${title}".`;

  await sb.from('notifications').insert({
    user_id: input.clientId,
    type: 'application',
    title: 'New application',
    description: `${hName}${proposalPart}`,
    action_url: '/client/dashboard',
    read: false,
  });

  await ensureConversation({
    requestId: input.requestId,
    clientId: input.clientId,
    helperId: input.helperId,
    contactUnlocked: false,
  });

  return { outcome: 'created' };
}

export async function remoteUpdateRequestStatus(requestId: string, status: RequestStatus): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');
  const { error } = await sb.from('requests').update({ status }).eq('id', requestId);
  if (error) throw new Error(error.message || 'REQUEST_UPDATE_FAILED');
}

/** Client cancels an open/in-progress request — hides it from feeds and notifies helpers. */
export async function remoteCancelClientRequest(requestId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  const { data: req, error: reqErr } = await sb
    .from('requests')
    .select('title, client_id')
    .eq('id', requestId)
    .single();
  if (reqErr || !req) throw new Error(reqErr?.message || 'NOT_FOUND');

  const title = (req as { title?: string }).title ?? 'Request';
  const clientId = (req as { client_id: string }).client_id;

  const { error: upErr } = await sb.from('requests').update({ status: 'cancelled' }).eq('id', requestId);
  if (upErr) throw new Error(upErr.message || 'REQUEST_UPDATE_FAILED');

  const { data: apps } = await sb
    .from('applications')
    .select('id, helper_id')
    .eq('request_id', requestId)
    .neq('status', 'cancelled');

  if (apps?.length) {
    const { error: appErr } = await sb
      .from('applications')
      .update({ status: 'cancelled' })
      .eq('request_id', requestId)
      .neq('status', 'cancelled');
    if (appErr) throw new Error(appErr.message || 'APPLICATION_UPDATE_FAILED');

    for (const app of apps as { id: string; helper_id: string }[]) {
      await sb.from('notifications').insert({
        user_id: app.helper_id,
        type: 'job_update',
        title: 'Request cancelled',
        description: `The client cancelled the request "${title}".`,
        action_url: '/helper/dashboard',
        read: false,
      });
    }
  }

  await sb
    .from('upcoming_jobs')
    .update({ workflow_status: 'cancelled' })
    .eq('request_id', requestId);

  await sb.from('notifications').insert({
    user_id: clientId,
    type: 'job_update',
    title: 'Request cancelled',
    description: `Your request "${title}" was cancelled.`,
    action_url: '/client/dashboard',
    read: false,
  });
}

export async function remoteUpdateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  jobSnapshot?: Job,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  const { data: appRow, error: fetchErr } = await sb.from('applications').select('*').eq('id', applicationId).single();
  if (fetchErr || !appRow) throw fetchErr ?? new Error('NOT_FOUND');

  const app = appRow as ApplicationRow;

  const { error: upErr } = await sb.from('applications').update({ status }).eq('id', applicationId);
  if (upErr) throw new Error(upErr.message || 'APPLICATION_UPDATE_FAILED');

  const notifyClient = async (payload: { title: string; description: string; action_url: string }) => {
    if (!app.client_id) return;
    try {
      const { error: notifErr } = await sb.from('notifications').insert({
        user_id: app.client_id,
        type: 'application',
        title: payload.title,
        description: payload.description,
        action_url: payload.action_url,
        read: false,
      });
      if (notifErr) console.warn('[LinkHelp] cancel notification insert', notifErr.message);
    } catch (e) {
      console.warn('[LinkHelp] cancel notification insert', e);
    }
  };

  const notifyHelper = async (payload: { title: string; description: string; action_url: string }) => {
    try {
      const { error: notifErr } = await sb.from('notifications').insert({
        user_id: app.helper_id,
        type: 'application',
        title: payload.title,
        description: payload.description,
        action_url: payload.action_url,
        read: false,
      });
      if (notifErr) console.warn('[LinkHelp] application notification insert', notifErr.message);
    } catch (e) {
      console.warn('[LinkHelp] application notification insert', e);
    }
  };

  if (status === 'accepted' && jobSnapshot) {
    await sb.from('requests').update({ status: 'in_progress' }).eq('id', app.request_id);

    const scheduledAt = new Date(Date.now() + 48 * 3600000).toISOString();
    await sb.from('upcoming_jobs').insert({
      request_id: app.request_id,
      helper_id: app.helper_id,
      client_name: jobSnapshot.clientName,
      client_avatar: jobSnapshot.clientAvatar,
      title: jobSnapshot.title,
      category: jobSnapshot.category,
      description: jobSnapshot.description,
      location: jobSnapshot.location,
      value_hint: jobSnapshot.value,
      urgency: jobSnapshot.urgency,
      scheduled_at: scheduledAt,
      workflow_status: 'scheduled',
    });

    await notifyHelper({
      title: 'Application accepted',
      description: `The client accepted your application for "${jobSnapshot.title}".`,
      action_url: '/helper/jobs',
    });
  } else if (status === 'rejected') {
    await notifyHelper({
      title: 'Application update',
      description: 'The client chose another helper this time.',
      action_url: '/helper/opportunities',
    });
  } else if (status === 'cancelled') {
    await notifyClient({
      title: 'Application withdrawn',
      description: 'A helper cancelled their application for your request.',
      action_url: '/client/dashboard',
    });
  }
}

/** Creates/unlocks chat — only after client clicks “Contratar oficialmente”. */
export async function remoteOfficiallyHireHelper(
  payload: { requestId: string; applicationId: string; helperId: string },
  jobSnapshot: Job,
  initialMessage?: string,
): Promise<string | null> {
  const { requestId, applicationId, helperId } = payload;
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  const { data: appRow, error: fetchErr } = await sb.from('applications').select('*').eq('id', applicationId).single();
  if (fetchErr || !appRow) throw fetchErr ?? new Error('NOT_FOUND');

  const app = appRow as ApplicationRow;
  if (app.request_id !== requestId || app.helper_id !== helperId) {
    throw new Error('APPLICATION_MISMATCH');
  }
  const acceptedAmount = app.proposed_amount != null ? Number(app.proposed_amount) : null;
  const valueHint =
    acceptedAmount != null
      ? `${jobSnapshot.currency?.trim() || 'CAD'} $${Math.round(acceptedAmount)}`
      : jobSnapshot.value;

  if (app.status !== 'accepted') {
    const { error: upErr } = await sb.from('applications').update({ status: 'accepted' }).eq('id', applicationId);
    if (upErr) throw new Error(upErr.message || 'APPLICATION_UPDATE_FAILED');
    await sb.from('requests').update({ status: 'in_progress' }).eq('id', app.request_id);
    if (acceptedAmount != null) {
      const reqUpdate: Record<string, unknown> = {
        accepted_amount: acceptedAmount,
        budget: valueHint,
      };
      const { error: amtErr } = await sb.from('requests').update(reqUpdate).eq('id', app.request_id);
      if (amtErr && isMissingColumnError(amtErr, 'accepted_amount')) {
        await sb.from('requests').update({ budget: valueHint }).eq('id', app.request_id);
      }
    }

    const { data: existingUpcoming } = await sb
      .from('upcoming_jobs')
      .select('id')
      .eq('request_id', app.request_id)
      .eq('helper_id', app.helper_id)
      .maybeSingle();

    if (!existingUpcoming) {
      const scheduledAt = new Date(Date.now() + 48 * 3600000).toISOString();
      await sb.from('upcoming_jobs').insert({
        request_id: app.request_id,
        helper_id: app.helper_id,
        client_name: jobSnapshot.clientName,
        client_avatar: jobSnapshot.clientAvatar,
        title: jobSnapshot.title,
        category: jobSnapshot.category,
        description: jobSnapshot.description,
        location: jobSnapshot.location,
        value_hint: valueHint,
        urgency: jobSnapshot.urgency,
        scheduled_at: scheduledAt,
        workflow_status: 'scheduled',
      });
    }

    await sb
      .from('applications')
      .update({ status: 'rejected' })
      .eq('request_id', app.request_id)
      .neq('id', applicationId)
      .in('status', ['pending', 'viewed']);
  }

  const conversationId = await ensureConversation({
    requestId: app.request_id,
    clientId: app.client_id,
    helperId: app.helper_id,
    contactUnlocked: true,
  });

  const cleanInitialMessage = initialMessage?.trim();
  if (cleanInitialMessage) {
    const { error: msgErr } = await sb.from('messages').insert({
      conversation_id: conversationId,
      sender_id: app.client_id,
      content: cleanInitialMessage,
      read: false,
    });
    if (msgErr) console.warn('[LinkHelp] Could not save hire intro message', msgErr);
  }

  await sb.from('notifications').insert({
    user_id: app.helper_id,
    type: 'application',
    title: 'Official hire',
    description:
      acceptedAmount != null
        ? `Your proposal of CAD $${Math.round(acceptedAmount)} was accepted for "${jobSnapshot.title}". Chat is now open.`
        : `The client officially hired you for "${jobSnapshot.title}". Chat is now open.`,
    action_url: `/messages?c=${conversationId}`,
    read: false,
  });

  await sb.from('notifications').insert({
    user_id: app.client_id,
    type: 'application',
    title: 'Helper hired',
    description: `You can now chat with your helper about "${jobSnapshot.title}".`,
    action_url: `/messages?c=${conversationId}`,
    read: false,
  });

  return conversationId;
}

export async function remoteInsertNotification(n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('notifications').insert({
    user_id: n.userId,
    type: n.type,
    title: n.title,
    description: n.message,
    action_url: n.actionUrl ?? null,
    read: false,
  });
}

export async function remoteMarkNotificationRead(id: string, read: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('notifications').update({ read }).eq('id', id);
  if (error) console.warn('[LinkHelp] remoteMarkNotificationRead', error.message);
}

export async function remoteMarkAllNotificationsRead(userId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  if (error) console.warn('[LinkHelp] remoteMarkAllNotificationsRead', error.message);
}

export async function remoteUpdateUpcomingWorkflow(id: string, workflowStatus: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('upcoming_jobs').update({ workflow_status: workflowStatus }).eq('id', id);
}
