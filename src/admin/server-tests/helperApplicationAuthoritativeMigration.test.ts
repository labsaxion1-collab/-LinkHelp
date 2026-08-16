import { readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const migrationsDir = new URL('../../../supabase/migrations/', import.meta.url);
const sql = readFileSync(new URL('0061_helper_application_authoritative.sql', migrationsDir), 'utf8');
const leadQuoteRemote = readFileSync(
  new URL('../../../src/services/leadQuoteRemote.ts', import.meta.url),
  'utf8',
);
const helperApplicationService = readFileSync(
  new URL('../../../src/services/supabase/helperApplicationService.ts', import.meta.url),
  'utf8',
);
const appDataRemote = readFileSync(
  new URL('../../../src/services/supabase/appDataRemote.ts', import.meta.url),
  'utf8',
);

function functionBody(source: string, marker: string): string {
  const start = source.indexOf(marker);
  expect(start).toBeGreaterThan(-1);
  const asStart = source.indexOf('as $$', start);
  const end = source.indexOf('$$;', asStart + 5);
  expect(asStart).toBeGreaterThan(start);
  expect(end).toBeGreaterThan(asStart);
  return source.slice(asStart + 5, end);
}

const submitBody = functionBody(sql, 'create or replace function public.helper_submit_application(');
const quoteBody = functionBody(sql, 'create or replace function public.helper_compute_lead_quote(');
const validateBody = functionBody(sql, 'create or replace function public.lead_validate_service_mode(');
const hireBody = functionBody(sql, 'create or replace function public.client_accept_proposal(');
const rejectBody = functionBody(sql, 'create or replace function public.client_reject_application(');
const vipRejectRefundBody = functionBody(
  sql,
  'create or replace function public.process_vip_application_rejected_refund(',
);

function migrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
}

describe('0061 helper application authoritative migration', () => {
  it('is the next sequential migration after 0060', () => {
    const files = migrationFiles();
    expect(files.at(-1)).toBe('0061_helper_application_authoritative.sql');
    expect(files).toContain('0060_client_publish_request.sql');
  });

  it('creates pricing catalog tables and lead snapshot columns idempotently', () => {
    expect(sql).toContain('create table if not exists public.lead_pricing_versions');
    expect(sql).toContain('create table if not exists public.lead_category_prices');
    expect(sql).toContain('create table if not exists public.lead_distance_tiers');
    expect(sql).toContain('create table if not exists public.lead_subcategory_service_mode_policies');
    expect(sql).toContain('add column if not exists lead_total_lc int');
    expect(sql).toContain('add column if not exists lead_debit_lc int');
    expect(sql).toContain('add column if not exists lead_service_mode text');
    expect(sql).toContain('applications_lead_snapshot_nonneg_check');
    expect(sql).toContain('fe_SERVICE_COST_LC_v1');
    expect(sql).toContain("'cleaning', null, null, 7");
    expect(sql).toContain('(v_id, 5, 0, 1)');
    expect(sql).toContain('(v_id, 1e9, 12, 6)');
  });

  it('seeds SERVICE_COST_LC aligned with calculateHelperLeadCreditCost (interest=4, other fallback=5)', () => {
    expect(quoteBody).toContain('v_interest int := 4');
    expect(quoteBody).toContain("v_category_id := coalesce(nullif(trim(req.category), ''), 'other')");
    expect(quoteBody).toContain("and p.category_id = 'other'");
    expect(submitBody).toContain('authoritative_charge := 4');
    expect(submitBody).toContain('authoritative_charge := snap_total + 4');
  });

  it('exposes single PostgREST-safe helper_submit_application overload for the frontend', () => {
    expect(sql.match(/create or replace function public\.helper_submit_application/g)?.length).toBe(1);
    expect(sql).toContain('drop function if exists public.helper_submit_application(uuid, uuid, uuid, text, numeric, int);');
    expect(sql).toContain(
      'grant execute on function public.helper_submit_application(uuid, uuid, uuid, text, numeric, int, boolean) to authenticated',
    );
    expect(helperApplicationService).toContain("await sb.rpc('helper_submit_application', rpcPayload)");
    expect(helperApplicationService).toContain('p_is_exclusive');
  });

  it('wires helper_compute_lead_quote RPC expected by leadQuoteRemote', () => {
    expect(sql).toContain('create or replace function public.helper_compute_lead_quote(');
    expect(sql).toContain(
      'grant execute on function public.helper_compute_lead_quote(uuid, uuid) to authenticated',
    );
    expect(leadQuoteRemote).toContain("sb.rpc('helper_compute_lead_quote', {");
    expect(leadQuoteRemote).toContain('p_request_id: job.id');
    expect(leadQuoteRemote).toContain('p_helper_id: helperId');
  });

  it('requires auth, helper role, open non-expired request, and blocks duplicate/VIP lock/limit', () => {
    expect(submitBody).toContain('caller uuid := auth.uid()');
    expect(submitBody).toContain("raise exception 'NOT_ALLOWED'");
    expect(submitBody).toContain("raise exception 'HELPER_ONLY'");
    expect(submitBody).toContain("raise exception 'REQUEST_EXPIRED'");
    expect(submitBody).toContain("raise exception 'REQUEST_NOT_OPEN'");
    expect(submitBody).toContain("raise exception 'EXCLUSIVE_APPLICATION_LOCKED'");
    expect(submitBody).toContain("raise exception 'APPLICATION_LIMIT_REACHED'");
    expect(submitBody).toContain('for update');
    expect(submitBody).toContain('helper_debit_application_interest');
    expect(submitBody).toContain('lead_total_lc');
    expect(submitBody).toContain('lead_debit_lc');
  });

  it('allows nullable subcategory in quote validation and remote distance zero', () => {
    expect(validateBody).toContain("if nullif(trim(p_subcategory_id), '') is null then");
    expect(validateBody).toContain("return 'both'");
    expect(quoteBody).toContain("if v_service_mode = 'remote' then");
    expect(quoteBody).toContain('v_distance_km := 0');
    expect(quoteBody).toContain('lead_haversine_km');
  });

  it('implements downstream hire/reject/refund compatibility', () => {
    expect(sql).toContain('create or replace function public.client_reject_application(');
    expect(sql).toContain('create or replace function public.process_vip_exclusive_partial_refunds(');
    expect(hireBody).toContain('LEAD_SNAPSHOT_MISSING');
    expect(hireBody).toContain('greatest(0, app.lead_total_lc - 4)');
    expect(hireBody).toContain("raise exception 'VIP_HIRE_MUST_BE_ZERO'");
    expect(hireBody).toContain("raise exception 'VIP_LOCK_ACTIVE_NORMAL_HIRE_FORBIDDEN'");
    expect(rejectBody).toContain('process_vip_application_rejected_refund');
    expect(vipRejectRefundBody).toContain('ceil(debit_amount::numeric / 2)');
    expect(submitBody).toContain('process_vip_exclusive_partial_refunds');
    expect(appDataRemote).toContain("sb.rpc('client_accept_proposal'");
    expect(appDataRemote).toContain("sb.rpc('client_reject_application'");
  });

  it('hardens SECURITY DEFINER functions with empty search_path and revokes PUBLIC execute', () => {
    expect(sql).not.toMatch(/security definer[\s\S]{0,120}set search_path = public/i);
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain(
      'revoke all on function public.helper_submit_application(uuid, uuid, uuid, text, numeric, int, boolean) from public',
    );
    expect(sql).toContain('revoke all on function public.helper_compute_lead_quote(uuid, uuid) from public');
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('lead_pricing_versions_select_authenticated');
  });

  it('does not redefine client_publish_request or mutate historical migrations', () => {
    expect(sql).not.toContain('create or replace function public.client_publish_request(');
    const prior = migrationFiles().filter((name) => name.startsWith('0060_') === false && name !== '0061_helper_application_authoritative.sql');
    for (const name of prior) {
      const body = readFileSync(new URL(name, migrationsDir), 'utf8');
      expect(body).not.toContain('0061_helper_application_authoritative');
    }
  });

  it('keeps exactly six Vercel API route handlers', () => {
    const routes = execSync('git ls-files api', { encoding: 'utf8' })
      .split(/\r?\n/)
      .filter((line) => line.endsWith('.ts') && !line.includes('/_lib/'));
    expect(routes.sort()).toEqual(
      [
        'api/admin/dashboard-summary.ts',
        'api/gamification/me.ts',
        'api/gamification/recalculate.ts',
        'api/stripe/create-checkout-session.ts',
        'api/stripe/create-client-checkout-session.ts',
        'api/stripe/webhook.ts',
      ].sort(),
    );
  });
});
