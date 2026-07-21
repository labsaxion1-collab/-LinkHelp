import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authorizeBackoffice,
  backofficeJsonError,
  logBackofficeRead,
  parseLimitOffset,
} from '../lib/backofficeAuth.server.js';
import { createSupabaseServiceRoleClient } from '../lib/supabaseAdmin.server.js';
import { buildEconomySnapshot } from '../../src/backoffice/economy/economySnapshot.js';

type Resource = 'users' | 'requests' | 'credits' | 'economy' | 'audit' | 'support';

function parseResource(req: VercelRequest): Resource | null {
  const raw = req.query?.resource;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (
    value === 'users' ||
    value === 'requests' ||
    value === 'credits' ||
    value === 'economy' ||
    value === 'audit' ||
    value === 'support'
  ) {
    return value;
  }
  return null;
}

async function handleUsers(req: VercelRequest, res: VercelResponse) {
  const auth = await authorizeBackoffice(req.headers.authorization, 'users.read');
  if (auth.ok === false) return backofficeJsonError(res, auth.status, auth.error);

  const userId = typeof req.query?.userId === 'string' ? req.query.userId : null;
  const admin = createSupabaseServiceRoleClient();

  if (userId) {
    const { data, error } = await admin.rpc('admin_get_user_detail', { p_user_id: userId });
    if (error) {
      console.error('[backoffice/users] detail', error.message);
      return backofficeJsonError(res, 502, 'BACKOFFICE_USER_DETAIL_FAILED');
    }
    await logBackofficeRead(auth.user.id, 'users.view_detail', 'user', userId);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json(data);
  }

  const { limit, offset } = parseLimitOffset(req);
  const { data, error } = await admin.rpc('admin_list_users', {
    p_role: typeof req.query?.role === 'string' ? req.query.role : null,
    p_search: typeof req.query?.search === 'string' ? req.query.search : null,
    p_city: typeof req.query?.city === 'string' ? req.query.city : null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    console.error('[backoffice/users] list', error.message);
    return backofficeJsonError(res, 502, 'BACKOFFICE_USERS_LIST_FAILED');
  }
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json(data);
}

async function handleRequests(req: VercelRequest, res: VercelResponse) {
  const auth = await authorizeBackoffice(req.headers.authorization, 'requests.read');
  if (auth.ok === false) return backofficeJsonError(res, auth.status, auth.error);

  const requestId = typeof req.query?.requestId === 'string' ? req.query.requestId : null;
  const admin = createSupabaseServiceRoleClient();

  if (requestId) {
    const { data, error } = await admin.rpc('admin_get_request_detail', {
      p_request_id: requestId,
    });
    if (error) {
      console.error('[backoffice/requests] detail', error.message);
      return backofficeJsonError(res, 502, 'BACKOFFICE_REQUEST_DETAIL_FAILED');
    }
    await logBackofficeRead(auth.user.id, 'requests.view_detail', 'request', requestId);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json(data);
  }

  const { limit, offset } = parseLimitOffset(req);
  const { data, error } = await admin.rpc('admin_list_requests', {
    p_status: typeof req.query?.status === 'string' ? req.query.status : null,
    p_search: typeof req.query?.search === 'string' ? req.query.search : null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    console.error('[backoffice/requests] list', error.message);
    return backofficeJsonError(res, 502, 'BACKOFFICE_REQUESTS_LIST_FAILED');
  }
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json(data);
}

async function handleCredits(req: VercelRequest, res: VercelResponse) {
  const auth = await authorizeBackoffice(req.headers.authorization, 'credits.read');
  if (auth.ok === false) return backofficeJsonError(res, auth.status, auth.error);

  const { limit, offset } = parseLimitOffset(req);
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin.rpc('admin_list_credit_transactions', {
    p_helper_id: typeof req.query?.helperId === 'string' ? req.query.helperId : null,
    p_type: typeof req.query?.type === 'string' ? req.query.type : null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    console.error('[backoffice/credits]', error.message);
    return backofficeJsonError(res, 502, 'BACKOFFICE_CREDITS_LIST_FAILED');
  }
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json(data);
}

async function handleEconomy(req: VercelRequest, res: VercelResponse) {
  const auth = await authorizeBackoffice(req.headers.authorization, 'economy.read');
  if (auth.ok === false) return backofficeJsonError(res, auth.status, auth.error);

  const codeSnapshot = buildEconomySnapshot();
  let dbPackages: unknown[] = [];
  try {
    const admin = createSupabaseServiceRoleClient();
    const { data } = await admin.from('credit_packages').select('*').order('credits', { ascending: true });
    dbPackages = data ?? [];
  } catch {
    dbPackages = [];
  }
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({ ...codeSnapshot, dbPackages });
}

async function handleAudit(req: VercelRequest, res: VercelResponse) {
  const auth = await authorizeBackoffice(req.headers.authorization, 'audit.read');
  if (auth.ok === false) return backofficeJsonError(res, auth.status, auth.error);

  const { limit, offset } = parseLimitOffset(req);
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin.rpc('admin_list_audit_logs', {
    p_admin_id: typeof req.query?.adminId === 'string' ? req.query.adminId : null,
    p_action: typeof req.query?.action === 'string' ? req.query.action : null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    console.error('[backoffice/audit]', error.message);
    return backofficeJsonError(res, 502, 'BACKOFFICE_AUDIT_LIST_FAILED');
  }
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json(data);
}

async function handleSupport(req: VercelRequest, res: VercelResponse) {
  const auth = await authorizeBackoffice(req.headers.authorization, 'support.view');
  if (auth.ok === false) return backofficeJsonError(res, auth.status, auth.error);

  const userId = typeof req.query?.userId === 'string' ? req.query.userId : null;
  if (!userId) return backofficeJsonError(res, 400, 'USER_ID_REQUIRED');

  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin.rpc('admin_get_user_detail', { p_user_id: userId });
  if (error) {
    console.error('[backoffice/support]', error.message);
    return backofficeJsonError(res, 502, 'BACKOFFICE_SUPPORT_VIEW_FAILED');
  }
  await logBackofficeRead(auth.user.id, 'support.view_read_only', 'user', userId, {
    mode: 'read_only_view',
  });
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({
    mode: 'read_only_view',
    impersonation: false,
    user: data,
  });
}

/** Single serverless entry — routes /api/backoffice/:resource (Vercel Hobby function limit). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return backofficeJsonError(res, 405, 'METHOD_NOT_ALLOWED');

  const resource = parseResource(req);
  if (!resource) return backofficeJsonError(res, 404, 'BACKOFFICE_RESOURCE_NOT_FOUND');

  try {
    switch (resource) {
      case 'users':
        return await handleUsers(req, res);
      case 'requests':
        return await handleRequests(req, res);
      case 'credits':
        return await handleCredits(req, res);
      case 'economy':
        return await handleEconomy(req, res);
      case 'audit':
        return await handleAudit(req, res);
      case 'support':
        return await handleSupport(req, res);
      default:
        return backofficeJsonError(res, 404, 'BACKOFFICE_RESOURCE_NOT_FOUND');
    }
  } catch (e) {
    console.error('[backoffice]', e instanceof Error ? e.message : e);
    return backofficeJsonError(res, 503, 'BACKOFFICE_UNAVAILABLE');
  }
}
