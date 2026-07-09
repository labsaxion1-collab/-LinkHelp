import { getSupabase } from '@/lib/supabase';
import type { Job } from '@/types/job';
import type { Application, ApplicationStatus } from '@/types/application';
import type { UpcomingJob } from '@/types/upcoming';
import type { AppNotification } from '@/types/notification';
import type { ApplicationRow, NotificationRow, RequestRow, RequestStatus, UpcomingJobRow } from '@/types/database';
export type { NotificationRow };
import {
  applicationRowToApp,
  notificationRowToApp,
  requestRowToJob,
  upcomingRowToUpcoming,
} from '@/services/supabase/mappers';
import { fetchProfilesAsMapperMap } from '@/services/supabase/fetchUserViews';
import { ensureConversation } from '@/services/supabase/conversationEnsure';
import { isPostgrestMissingResource } from '@/utils/postgrestErrors';

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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'upcoming_jobs' }, onChange)
    // notifications: subscribeNotificationsChannel (granular, per-user)
    // messages / conversations: subscribeConversationChannel in chatRemote (per-thread)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, onChange)
    .subscribe();

  return () => {
    sb.removeChannel(ch);
  };
}

/**
 * Granular realtime subscription for the notifications table.
 * Handles INSERT/UPDATE/DELETE individually so the UI updates
 * instantly without a full app-data refetch.
 *
 * Requires `REPLICA IDENTITY FULL` on the notifications table
 * (see supabase/apply_notifications_realtime_fix.sql).
 */
export function subscribeNotificationsChannel(
  userId: string,
  handlers: {
    onInsert: (row: NotificationRow) => void;
    onUpdate: (row: NotificationRow) => void;
    onDelete: (id: string) => void;
  },
): () => void {
  const sb = getSupabase();
  if (!sb || !userId) return () => {};

  const ch = sb
    .channel(`linkhelp-notifs-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => handlers.onInsert(payload.new as NotificationRow),
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => handlers.onUpdate(payload.new as NotificationRow),
    )
    .on(
      'postgres_changes',
      {
        // DELETE: old row may only have pk without REPLICA IDENTITY FULL,
        // but with RI FULL the user_id filter also works on DELETE.
        // We pass the id from payload.old regardless.
        event: 'DELETE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const oldRow = payload.old as { id?: string };
        if (oldRow?.id) handlers.onDelete(oldRow.id);
      },
    )
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

export function isMissingColumnError(error: { code?: string; message?: string } | null, column: string): boolean {
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

export class InsufficientClientCreditsError extends Error {
  readonly code = 'INSUFFICIENT_CLIENT_CREDITS';

  constructor() {
    super('INSUFFICIENT_CLIENT_CREDITS');
  }
}

export type ClientPublishRequestResult = {
  requestId: string;
  balanceAfter: number;
};

function isRpcMissingColumnError(error: { message?: string } | null, column: string): boolean {
  if (!error?.message) return false;
  const msg = error.message.toLowerCase();
  return msg.includes(column.toLowerCase()) && (msg.includes('column') || msg.includes('42703'));
}

export async function remoteCreateRequest(input: RemoteCreateRequestInput): Promise<ClientPublishRequestResult> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  let payload = buildRequestInsertPayload(input, true);
  delete payload.client_id;
  delete payload.status;

  let { data, error } = await sb.rpc('client_publish_request', { p_request: payload, p_extended: true });

  if (error && EXTENDED_REQUEST_COLUMNS.some((col) => isRpcMissingColumnError(error, col))) {
    if (import.meta.env.DEV) {
      console.warn('[LinkHelp] client_publish_request: retrying without extended columns', error);
    }
    payload = buildRequestInsertPayload(input, false);
    delete payload.client_id;
    delete payload.status;
    ({ data, error } = await sb.rpc('client_publish_request', { p_request: payload, p_extended: false }));
  }

  if (error) {
    if (import.meta.env.DEV) {
      console.error('[LinkHelp] remoteCreateRequest failed', { code: error.code, message: error.message, details: error.details });
    }
    if (error.message?.includes('INSUFFICIENT_CLIENT_CREDITS')) {
      throw new InsufficientClientCreditsError();
    }
    throw error;
  }

  const row = (data ?? {}) as { request_id?: string; balance_after?: number };
  return {
    requestId: row.request_id ?? '',
    balanceAfter: row.balance_after ?? 0,
  };
}

export async function remoteApply(input: {
  requestId: string;
  helperId: string;
  clientId: string;
  message?: string | null;
  proposedAmount?: number | null;
  isExclusive?: boolean;
}): Promise<{ outcome: 'created' } | { outcome: 'already_exists'; applicationId: string }> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  if (input.clientId === input.helperId) {
    throw new Error('SELF_REQUEST');
  }

  const { count, error: countErr } = await sb
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('request_id', input.requestId)
    .in('status', ['pending', 'viewed', 'accepted']);
  if (countErr) throw new Error(countErr.message || 'APPLICATION_COUNT_FAILED');
  if ((count ?? 0) >= 3) throw new Error('APPLICATION_LIMIT_REACHED');

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
    is_exclusive: input.isExclusive === true,
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
    if (isMissingColumnError(error, 'is_exclusive')) {
      delete payload.is_exclusive;
      const { error: retryErr } = await sb.from('applications').insert(payload);
      if (retryErr) {
        if (retryErr.code === '23505') {
          const existingId = await findExisting();
          return { outcome: 'already_exists', applicationId: existingId ?? '' };
        }
        throw new Error(retryErr.message || 'APPLICATION_INSERT_FAILED');
      }
    } else if (input.proposedAmount != null && isMissingColumnError(error, 'proposed_amount')) {
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
    action_url: `/client/dashboard?request=${input.requestId}`,
    read: false,
  });

  await ensureConversation({
    requestId: input.requestId,
    clientId: input.clientId,
    helperId: input.helperId,
    contactUnlocked: false,
  }).catch((e) => {
    console.warn('[LinkHelp] ensureConversation after apply (non-fatal)', e);
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
        type: 'application',
        title: 'Request cancelled',
        description: `The client cancelled the request "${title}".`,
        action_url: '/helper/jobs',
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
    type: 'application',
    title: 'Request cancelled',
    description: `Your request "${title}" was cancelled.`,
    action_url: `/client/dashboard?request=${requestId}`,
    read: false,
  });
}

/** Client rejects a candidate — uses RPC for VIP lock sync + helper notification. */
export async function remoteClientRejectApplication(applicationId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  const { error } = await sb.rpc('client_reject_application', {
    p_application_id: applicationId,
  });

  if (error) {
    const isMissingRpc =
      isPostgrestMissingResource(error) || (error.message ?? '').includes('client_reject_application');
    if (isMissingRpc) {
      const { error: upErr } = await sb
        .from('applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId);
      if (upErr) throw new Error(upErr.message || 'APPLICATION_UPDATE_FAILED');
      return;
    }
    throw new Error(error.message || 'REJECT_FAILED');
  }
}

export async function remoteUpdateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  jobSnapshot?: Job,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  if (status === 'rejected') {
    await remoteClientRejectApplication(applicationId);
    return;
  }

  const { data: appRow, error: fetchErr } = await sb.from('applications').select('*').eq('id', applicationId).single();
  if (fetchErr || !appRow) throw fetchErr ?? new Error('NOT_FOUND');

  const app = appRow as ApplicationRow;

  const { error: upErr } = await sb.from('applications').update({ status }).eq('id', applicationId);
  if (upErr) throw new Error(upErr.message || 'APPLICATION_UPDATE_FAILED');

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
  }
}

/** Creates/unlocks chat — only after client clicks “Aceitar proposta”. */
export async function remoteOfficiallyHireHelper(
  payload: { requestId: string; applicationId: string; helperId: string },
  jobSnapshot: Job,
  initialMessage?: string,
  options?: { chargeAmount?: number | null },
): Promise<string | null> {
  const { requestId, applicationId, helperId } = payload;
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  const chargeAmount =
    options?.chargeAmount != null && options.chargeAmount > 0 ? Math.round(options.chargeAmount) : null;

  const { data, error } = await sb.rpc('client_accept_proposal', {
    p_application_id: applicationId,
    p_charge_amount: chargeAmount,
  });

  if (error) {
    const isMissingRpc =
      error.code === 'PGRST202' ||
      error.message?.includes('client_accept_proposal') ||
      error.message?.includes('Could not find the function');
    if (isMissingRpc) {
      return remoteOfficiallyHireHelperLegacy(payload, jobSnapshot, initialMessage, chargeAmount);
    }
    console.error('[Accept proposal] supabase error', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(error.message || 'HIRE_FAILED');
  }

  const row = (data ?? {}) as { conversationId?: string };
  const conversationId = row.conversationId ?? null;
  if (!conversationId) {
    throw new Error('HIRE_MISSING_CONVERSATION');
  }

  const cleanInitialMessage = initialMessage?.trim();
  if (cleanInitialMessage) {
    const { data: appRow } = await sb.from('applications').select('client_id').eq('id', applicationId).maybeSingle();
    const clientId = (appRow as { client_id?: string } | null)?.client_id;
    if (clientId) {
      const { error: msgErr } = await sb.from('messages').insert({
        conversation_id: conversationId,
        sender_id: clientId,
        content: cleanInitialMessage,
        read: false,
      });
      if (msgErr) console.warn('[LinkHelp] Could not save hire intro message', msgErr.message);
    }
  }

  return conversationId;
}

async function remoteOfficiallyHireHelperLegacy(
  payload: { requestId: string; applicationId: string; helperId: string },
  jobSnapshot: Job,
  initialMessage?: string,
  chargeAmount?: number | null,
): Promise<string | null> {
  const { requestId, applicationId, helperId } = payload;
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');

  if (chargeAmount != null && chargeAmount > 0) {
    const { error: chargeErr } = await sb.rpc('charge_helper_on_client_hire', {
      p_application_id: applicationId,
      p_amount: chargeAmount,
    });
    if (chargeErr) {
      console.error('[Accept proposal] supabase error (charge)', chargeErr);
      throw new Error(chargeErr.message || 'CHARGE_FAILED');
    }
  }

  const { data: appRow, error: fetchErr } = await sb.from('applications').select('*').eq('id', applicationId).single();
  if (fetchErr || !appRow) {
    console.error('[Accept proposal] supabase error (fetch application)', fetchErr);
    throw new Error(fetchErr?.message || 'NOT_FOUND');
  }

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
    const { error: reqErr } = await sb.from('requests').update({ status: 'in_progress' }).eq('id', app.request_id);
    if (reqErr) throw new Error(reqErr.message || 'REQUEST_UPDATE_FAILED');
    if (acceptedAmount != null) {
      const reqUpdate: Record<string, unknown> = {
        accepted_amount: acceptedAmount,
        budget: valueHint,
      };
      const { error: amtErr } = await sb.from('requests').update(reqUpdate as Partial<RequestRow>).eq('id', app.request_id);
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
      const { error: upJobErr } = await sb.from('upcoming_jobs').insert({
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
      if (upJobErr) console.warn('[LinkHelp] upcoming_jobs insert', upJobErr.message);
    }

    const { error: rejectErr } = await sb
      .from('applications')
      .update({ status: 'rejected' })
      .eq('request_id', app.request_id)
      .neq('id', applicationId)
      .in('status', ['pending', 'viewed']);
    if (rejectErr) console.warn('[LinkHelp] reject other applications', rejectErr.message);
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

  const notifySafe = async (row: Record<string, unknown>) => {
    try {
      const { error: notifErr } = await sb.from('notifications').insert(row);
      if (notifErr) console.warn('[LinkHelp] hire notification insert', notifErr.message);
    } catch (e) {
      console.warn('[LinkHelp] hire notification insert', e);
    }
  };

  await notifySafe({
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

  await notifySafe({
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

export async function remoteClearAllNotifications(userId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('notifications').delete().eq('user_id', userId);
  if (error) console.warn('[LinkHelp] remoteClearAllNotifications', error.message);
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
  if (!sb) throw new Error('NO_SUPABASE');
  const { error } = await sb.from('upcoming_jobs').update({ workflow_status: workflowStatus }).eq('id', id);
  if (error) throw error;
}

export async function remoteMarkServiceAwaitingConfirmation(upcomingJobId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');
  const { error } = await sb.rpc('helper_mark_service_awaiting_confirmation', {
    p_upcoming_job_id: upcomingJobId,
  });
  if (error) throw new Error(error.message || 'MARK_COMPLETED_FAILED');
}

export async function remoteConfirmServiceCompleted(requestId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('NO_SUPABASE');
  const { error } = await sb.rpc('client_confirm_service_completed', {
    p_request_id: requestId,
  });
  if (error) throw new Error(error.message || 'CONFIRM_SERVICE_FAILED');
}

const AWAITING_COMPLETION_STATUSES = ['completion_requested', 'awaiting_client_confirmation'] as const;

/** Request IDs where helper marked completion and client must confirm. */
export async function remoteFetchClientAwaitingCompletionJobIds(clientId: string): Promise<string[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data: reqs, error: reqErr } = await sb
    .from('requests')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'in_progress');

  if (reqErr) {
    console.error('[LinkHelp] fetch in_progress requests for completion', reqErr);
    return [];
  }

  const requestIds = ((reqs ?? []) as { id: string }[]).map((r) => r.id);
  if (requestIds.length === 0) return [];

  const { data: upcoming, error: upErr } = await sb
    .from('upcoming_jobs')
    .select('request_id, workflow_status')
    .in('request_id', requestIds)
    .in('workflow_status', [...AWAITING_COMPLETION_STATUSES]);

  if (upErr) {
    console.error('[LinkHelp] fetch awaiting completion upcoming jobs', upErr);
    return [];
  }

  return ((upcoming ?? []) as { request_id: string }[]).map((u) => u.request_id);
}

/**
 * Returns how many messages the given user has sent in the pre-hire conversation
 * for a specific request + helper pair. Returns 0 if no conversation exists or
 * if the conversation is already unlocked (post-hire).
 */
export async function remoteGetPreMatchClientCount(
  userId: string,
  requestId: string,
  helperId: string,
): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;

  const { data: conv } = await sb
    .from('conversations')
    .select('id, contact_unlocked')
    .eq('request_id', requestId)
    .eq('helper_id', helperId)
    .maybeSingle();

  if (!conv || conv.contact_unlocked) return 0;

  const { count } = await sb
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conv.id)
    .eq('sender_id', userId);

  return count ?? 0;
}
