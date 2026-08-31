import { readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const migrationsDir = new URL('../../../supabase/migrations/', import.meta.url);
const migrationFile = '20260829015758_security_hardening_pause_compatibility.sql';
const sql = readFileSync(new URL(migrationFile, migrationsDir), 'utf8');
const sql0061 = readFileSync(new URL('0061_helper_application_authoritative.sql', migrationsDir), 'utf8');
const sql0065 = readFileSync(new URL('0065_client_cancel_request_authoritative.sql', migrationsDir), 'utf8');
const leadQuoteRemote = readFileSync(new URL('../../services/leadQuoteRemote.ts', import.meta.url), 'utf8');
const appDataRemote = readFileSync(new URL('../../services/supabase/appDataRemote.ts', import.meta.url), 'utf8');

function allMigrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

function numberedMigrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
}

/** Follow-up only — this migration must not mass-revoke these. */
const FUTURE_ANON_DEFINER_REVOKE_CANDIDATES = [
  'add_credits',
  'spend_credits',
  'register_credit_transaction',
  'admin_adjust_helper_credits',
  'admin_force_unlock_refund',
  'charge_helper_on_client_hire',
  'helper_debit_application_interest',
  'helper_debit_application_selected',
  'unlock_opportunity_with_credits',
  'process_expired_unlock_refunds',
  'process_expired_paused_requests',
  'process_request_helper_credit_refunds',
  'process_single_unlock_refund',
  'process_vip_exclusive_partial_refunds',
  'process_vip_application_rejected_refund',
  'grant_user_reward',
  'grant_client_service_review_reward',
  'client_accept_proposal',
  'client_reject_application',
  'client_pause_request',
  'client_resume_request',
] as const;

describe('20260829015758 security hardening pause compatibility', () => {
  it('is the CLI-created file after numbered 0001–0067', () => {
    const numbered = numberedMigrationFiles();
    expect(numbered.at(-1)).toBe('0067_stripe_credit_purchase_obligation_settlement.sql');
    const all = allMigrationFiles();
    expect(all).toContain(migrationFile);
    expect(all.indexOf(migrationFile)).toBeGreaterThan(
      all.indexOf('0067_stripe_credit_purchase_obligation_settlement.sql'),
    );
  });

  it('enables RLS on request_market_metrics without a public/authenticated SELECT policy', () => {
    expect(sql).toContain('alter table public.request_market_metrics enable row level security');
    expect(sql).toContain('revoke all on table public.request_market_metrics from public');
    expect(sql).toContain('revoke all on table public.request_market_metrics from anon');
    expect(sql).toContain('revoke insert, update, delete, truncate, references, trigger');
    expect(sql).toContain('revoke select on table public.request_market_metrics from authenticated');
    expect(sql).not.toMatch(/grant select on table public\.request_market_metrics/i);
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).not.toMatch(/force row level security/i);
    expect(sql).not.toMatch(/disable row level security/i);
  });

  it('restores paused on requests_status_check without dropping expired', () => {
    expect(sql).toContain("check (status in ('open', 'paused', 'in_progress', 'completed', 'cancelled', 'expired'))");
    expect(sql).toContain("v_def ilike '%paused%'");
    expect(sql).toContain("v_def ilike '%expired%'");
    expect(sql).toContain('requests_status_check');
    expect(sql).not.toMatch(/\bupdate\s+public\.requests\b/i);
    expect(sql).not.toMatch(/\binsert\s+into\s+public\.requests\b/i);
    expect(sql).not.toMatch(/\bdelete\s+from\s+public\.requests\b/i);
  });

  it('revokes helper_compute_lead_quote EXECUTE from PUBLIC/anon without replacing the function', () => {
    expect(sql).toContain('revoke all on function public.helper_compute_lead_quote(uuid, uuid) from public');
    expect(sql).toContain('revoke all on function public.helper_compute_lead_quote(uuid, uuid) from anon');
    expect(sql).toContain('grant execute on function public.helper_compute_lead_quote(uuid, uuid) to authenticated');
    expect(sql).toContain('grant execute on function public.helper_compute_lead_quote(uuid, uuid) to postgres');
    expect(sql).toContain('grant execute on function public.helper_compute_lead_quote(uuid, uuid) to service_role');
    expect(sql).not.toMatch(/create or replace function public\.helper_compute_lead_quote/i);
    expect(sql).not.toMatch(/drop function public\.helper_compute_lead_quote/i);
    expect(sql0061).toContain("set search_path = ''");
    expect(leadQuoteRemote).toContain("sb.rpc('helper_compute_lead_quote', {");
  });

  it('locks the legacy cancel overload without dropping it or rewriting (uuid)', () => {
    expect(sql).toContain("to_regprocedure('public.client_cancel_request(uuid, text)')");
    expect(sql).toContain('revoke all on function public.client_cancel_request(uuid, text) from public');
    expect(sql).toContain('revoke all on function public.client_cancel_request(uuid, text) from anon');
    expect(sql).toContain('grant execute on function public.client_cancel_request(uuid, text) to authenticated');
    expect(sql).toContain('grant execute on function public.client_cancel_request(uuid, text) to service_role');
    expect(sql).not.toMatch(/drop function public\.client_cancel_request/i);
    expect(sql).not.toMatch(/create or replace function public\.client_cancel_request/i);
    expect(sql0065).toContain('create or replace function public.client_cancel_request(p_request_id uuid)');
    expect(appDataRemote).toContain("sb.rpc('client_cancel_request', {");
    expect(appDataRemote).not.toContain('p_reason');
  });

  it('revokes MAINTAIN on obligation tables without touching SELECT/RLS/policies', () => {
    expect(sql).toContain('revoke maintain on table public.credit_obligations from authenticated');
    expect(sql).toContain('revoke maintain on table public.credit_obligation_settlements from authenticated');
    expect(sql).not.toMatch(/revoke select on table public\.credit_obligations/i);
    expect(sql).not.toMatch(/revoke select on table public\.credit_obligation_settlements/i);
    expect(sql).not.toMatch(/drop policy/i);
    expect(sql).not.toMatch(/disable row level security/i);
    expect(sql).not.toMatch(/revoke (all|select|insert|update|delete) on table public\.credit_obligations from (postgres|service_role)/i);
    expect(sql).not.toMatch(/revoke (all|select|insert|update|delete) on table public\.credit_obligation_settlements from (postgres|service_role)/i);
  });

  it('does not change Stripe, credit formulas, or mass-revoke other DEFINER RPCs', () => {
    expect(sql).not.toMatch(/confirm_stripe|confirm_credit_purchase|credit_packages|amount_cents/i);
    expect(sql).not.toMatch(/create or replace function/i);
    expect(sql).not.toMatch(/\binsert\s+into\s+public\./i);
    expect(sql).not.toMatch(/\bupdate\s+public\./i);
    expect(sql).not.toMatch(/\bdelete\s+from\s+public\./i);
    for (const name of FUTURE_ANON_DEFINER_REVOKE_CANDIDATES) {
      expect(sql).not.toContain(`function public.${name}`);
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

  it('does not alter numbered migrations 0001–0067', () => {
    const changed = execSync('git diff --name-only HEAD -- supabase/migrations/', {
      encoding: 'utf8',
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((file) => /supabase\/migrations\/\d{4}_/.test(file.replaceAll('\\', '/')))
      .filter((file) => !file.replaceAll('\\', '/').includes(migrationFile));
    expect(changed).toEqual([]);
  });
});
