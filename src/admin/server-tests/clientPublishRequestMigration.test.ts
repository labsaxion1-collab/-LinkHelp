import { readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const migrationsDir = new URL('../../../supabase/migrations/', import.meta.url);
const sql = readFileSync(new URL('0060_client_publish_request.sql', migrationsDir), 'utf8');
const sql0058 = readFileSync(new URL('0058_client_onboarding_completion.sql', migrationsDir), 'utf8');
const sql0059 = readFileSync(new URL('0059_disable_legacy_client_signup_credits.sql', migrationsDir), 'utf8');
const appDataRemote = readFileSync(
  new URL('../../../src/services/supabase/appDataRemote.ts', import.meta.url),
  'utf8',
);

const rpc = 'public.client_publish_request(jsonb, boolean)';

function functionBody(source: string): string {
  const start = source.indexOf('as $$');
  const end = source.indexOf('$$;', start + 5);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start + 5, end);
}

const body = functionBody(sql);

function priorMigrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .filter((name) => Number.parseInt(name.slice(0, 4), 10) <= 59)
    .sort();
}

describe('0060 client publish request migration', () => {
  it('adds service_mode, expires_at, ledger request_id and indexes idempotently', () => {
    expect(sql).toContain('add column if not exists service_mode text');
    expect(sql).toContain('add column if not exists expires_at timestamptz');
    expect(sql).toContain('add column if not exists request_id uuid references public.requests');
    expect(sql).toContain('requests_service_mode_check');
    expect(sql).toContain("service_mode is null or service_mode in ('remote', 'in_person')");
    expect(sql).toContain('client_credit_ledger_request_publish_uidx');
    expect(sql).toContain("where type = 'REQUEST_PUBLISH' and request_id is not null");
    expect(sql).toContain('requests_expires_at_idx');
    expect(sql).not.toMatch(/drop table|truncate|delete from public\.requests/i);
  });

  it('creates the RPC with frontend signature (jsonb, boolean) → jsonb', () => {
    expect(sql).toContain('create or replace function public.client_publish_request(');
    expect(sql).toContain('p_request jsonb');
    expect(sql).toContain('p_extended boolean default true');
    expect(sql).toContain('returns jsonb');
    expect(appDataRemote).toContain("sb.rpc('client_publish_request', { p_request: payload, p_extended: true })");
    expect(appDataRemote).toContain("sb.rpc('client_publish_request', { p_request: payload, p_extended: false })");
    expect(appDataRemote).toContain('requestId: row.request_id');
    expect(appDataRemote).toContain('balanceAfter: row.balance_after');
  });

  it('requires auth, client role, and blocks impersonation in payload', () => {
    expect(body).toContain('caller uuid := auth.uid()');
    expect(body).toContain("raise exception 'AUTH_REQUIRED'");
    expect(body).toContain("raise exception 'CLIENT_ONLY'");
    expect(body).toContain("p.role is distinct from 'client'");
    expect(body).toContain("p_request->>'client_id'");
    expect(body).toContain("p_request->>'user_id'");
    expect(body).toContain('is distinct from caller');
    expect(body).toContain("raise exception 'INVALID_REQUEST_PAYLOAD'");
  });

  it('locks profile, debits exactly 1 LC, inserts request + REQUEST_PUBLISH ledger atomically', () => {
    expect(body).toContain('for update');
    expect(body).toContain('v_cost int := 1');
    expect(body).toContain("raise exception 'INSUFFICIENT_CLIENT_CREDITS'");
    expect(body).toContain('v_balance := v_balance - v_cost');
    expect(body).toContain("if v_balance < 0 then");
    expect(body).toContain("insert into public.requests");
    expect(body).toContain("insert into public.client_credit_ledger");
    expect(body).toContain("'REQUEST_PUBLISH'");
    expect(body).toContain('-v_cost');
    expect(body).toContain('request_id');
    expect(body).toContain("'request_id', v_request_id");
    expect(body).toContain("'balance_after', v_balance");
    expect(body).not.toMatch(/partial|debt|pending_balance|refund/i);
  });

  it('validates category and title; keeps subcategory, budget and schedule optional', () => {
    expect(body).toContain("nullif(trim(p_request->>'category'), '')");
    expect(body).toContain("nullif(trim(p_request->>'title'), '')");
    expect(body).toContain("nullif(trim(p_request->>'subcategory'), '')");
    expect(body).toContain("nullif(trim(p_request->>'budget'), '')");
    expect(body).toContain("when nullif(p_request->>'preferred_date', '') is not null then");
    expect(body).not.toMatch(/subcategory is null/i);
    expect(body).not.toMatch(/budget.*required/i);
    expect(body).not.toMatch(/preferred_date.*required/i);
  });

  it('normalizes service_mode when present and requires address only for in_person', () => {
    expect(body).toContain("lower(trim(p_request->>'service_mode'))");
    expect(body).toContain("v_service_mode not in ('remote', 'in_person')");
    expect(body).toContain("v_service_mode = 'in_person'");
    expect(body).toContain("p_request->>'address'");
    expect(body).not.toContain('lead_validate_service_mode');
    expect(body).not.toMatch(/subcategory.*required/i);
    expect(body).not.toMatch(/service_mode is null/i);
  });

  it('sets expires_at to now() + 7 days without auto-deleting requests', () => {
    expect(body).toContain("v_expires_at timestamptz := now() + interval '7 days'");
    expect(body).toContain('expires_at');
    expect(sql).not.toMatch(/delete from public\.requests/i);
    expect(sql).not.toMatch(/pg_cron/i);
  });

  it('supports extended publish and p_extended=false basic fallback path', () => {
    expect(body).toContain('if coalesce(p_extended, true) then');
    expect(body).toContain('address,');
    expect(body).toContain('budget_min');
    expect(body).toContain('else');
    expect(body).toContain('latitude,');
    expect(body).toContain('service_mode,');
    expect(body).toContain('expires_at');
  });

  it('uses SECURITY DEFINER, empty search_path, qualified public.* and authenticated-only execute', () => {
    expect(sql).toContain('security definer');
    expect(sql).toContain("set search_path = ''");
    expect(sql).not.toMatch(/set search_path\s*=\s*public/i);
    expect(sql).toContain('from public.profiles');
    expect(sql).toContain('insert into public.requests');
    expect(sql).toContain('insert into public.client_credit_ledger');
    expect(sql).toContain('update public.profiles');
    expect(sql).toContain(`revoke all on function ${rpc} from public`);
    expect(sql).toContain(`revoke all on function ${rpc} from anon`);
    expect(sql).toContain(`revoke all on function ${rpc} from authenticated`);
    expect(sql).toContain(`grant execute on function ${rpc} to authenticated`);
    expect(sql).not.toMatch(/grant execute on function public\.client_publish_request\(jsonb, boolean\) to anon/i);
    expect(sql).not.toMatch(/grant (insert|update|delete) on table public\.(requests|client_credit_ledger|profiles)/i);
  });

  it('documents idempotency limitation without inventing a frontend idempotency contract', () => {
    expect(sql).toMatch(/idempotency/i);
    expect(sql).toMatch(/double-click|duplicate requests/i);
    expect(body).toContain('for update');
    expect(body).not.toMatch(/idempotency_key/i);
    expect(appDataRemote).not.toMatch(/idempotency/i);
  });

  it('does not alter onboarding, signup credits, Stripe or helper applications', () => {
    expect(sql).not.toContain('create or replace function public.complete_client_onboarding');
    expect(sql).not.toContain('create or replace function public.ensure_client_signup_credits');
    expect(sql).not.toContain('create or replace function public.confirm_client_stripe_linkcredit_purchase');
    expect(sql).not.toContain('create or replace function public.helper_submit_application');
    expect(sql).not.toMatch(/CLIENT_WELCOME_30|SIGNUP_CLIENT|stripe/i);
    expect(sql0058).toContain('CLIENT_WELCOME_30');
    expect(sql0059).toContain('ensure_client_signup_credits');
  });

  it('does not alter numbered migrations 0001–0059', () => {
    const prior = priorMigrationFiles();
    expect(prior).toHaveLength(59);
    expect(prior[0]).toBe('0001_linkhelp_production.sql');
    expect(prior[prior.length - 1]).toBe('0059_disable_legacy_client_signup_credits.sql');
    expect(prior).not.toContain('0060_client_publish_request.sql');

    const changed = execSync('git diff --name-only HEAD -- supabase/migrations/', {
      encoding: 'utf8',
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((file) => /supabase\/migrations\/(000[1-9]|00[1-4]\d|005[0-9])_/.test(file.replaceAll('\\', '/')));
    expect(changed).toEqual([]);
  });
});
