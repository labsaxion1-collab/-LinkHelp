import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  new URL('../../../supabase/migrations/0058_client_onboarding_completion.sql', import.meta.url),
  'utf8',
);

const rpc = 'public.complete_client_onboarding(uuid, text)';

describe('0058 client onboarding completion SQL', () => {
  it('creates the RPC with the frontend signature (uuid, text) → jsonb', () => {
    expect(sql).toContain('create or replace function public.complete_client_onboarding(');
    expect(sql).toContain('p_client_id uuid');
    expect(sql).toContain('p_device_fingerprint text default null');
    expect(sql).toContain('returns jsonb');
  });

  it('requires authentication and caller ownership of p_client_id', () => {
    expect(sql).toContain('caller uuid := auth.uid()');
    expect(sql).toContain("raise exception 'AUTH_REQUIRED'");
    expect(sql).toContain('if caller is distinct from p_client_id then');
    expect(sql).toContain("raise exception 'FORBIDDEN'");
    expect(sql).toContain("raise exception 'CLIENT_ONLY'");
    expect(sql).toContain("p.role is distinct from 'client'");
  });

  it('is idempotent and grants exactly 30 LC only on first completion', () => {
    expect(sql).toContain('v_amount int := 30');
    expect(sql).toContain("reward_type = 'CLIENT_WELCOME_30'");
    expect(sql).toContain("reason', 'ALREADY_COMPLETED'");
    expect(sql).toContain("reason', 'ALREADY_GRANTED'");
    expect(sql).toContain('on conflict (user_id, reward_type) do nothing');
    expect(sql).toContain('credits = coalesce(credits, 0) + v_amount');
    expect(sql).toContain("client_credit_ledger_welcome_30_uidx");
    expect(sql).toContain("'granted', true");
    expect(sql).toContain("'amount', v_amount");
    expect(sql).not.toMatch(/credits\s*=\s*coalesce\(credits,\s*0\)\s*\+\s*v_amount[\s\S]*credits\s*=\s*coalesce\(credits,\s*0\)\s*\+\s*v_amount/);
  });

  it('revokes PUBLIC/anon execute and grants authenticated only', () => {
    expect(sql).toContain(`revoke all on function ${rpc} from public`);
    expect(sql).toContain(`revoke all on function ${rpc} from anon`);
    expect(sql).toContain(`revoke all on function ${rpc} from authenticated`);
    expect(sql).toContain(`grant execute on function ${rpc} to authenticated`);
    expect(sql).not.toMatch(/grant execute on function public\.complete_client_onboarding\([^)]+\) to anon/i);
    expect(sql).not.toMatch(/grant execute on function public\.complete_client_onboarding\([^)]+\) to public/i);
  });

  it('uses SECURITY DEFINER with an empty search_path and qualified public.* refs', () => {
    expect(sql).toContain('security definer');
    expect(sql).toContain("set search_path = ''");
    expect(sql).not.toMatch(/set search_path\s*=\s*public/i);
    expect(sql).toContain('from public.profiles');
    expect(sql).toContain('from public.user_bonus_rewards');
    expect(sql).toContain('insert into public.client_credit_ledger');
    expect(sql).toContain('insert into public.client_onboarding_signals');
    expect(sql).toContain('update public.profiles');
  });

  it('enables RLS with own-row ledger SELECT and no frontend writes', () => {
    expect(sql).toContain('alter table public.client_credit_ledger enable row level security');
    expect(sql).toContain('alter table public.client_onboarding_signals enable row level security');
    expect(sql).toContain('create policy client_credit_ledger_select_own on public.client_credit_ledger');
    expect(sql).toContain('for select to authenticated');
    expect(sql).toContain('using (auth.uid() = client_id)');
    expect(sql).toContain('grant select on table public.client_credit_ledger to authenticated');
    expect(sql).toContain('revoke all on table public.client_credit_ledger from public');
    expect(sql).toContain('revoke all on table public.client_credit_ledger from anon');
    expect(sql).toContain('revoke all on table public.client_onboarding_signals from public');
    expect(sql).toContain('revoke all on table public.client_onboarding_signals from anon');
    expect(sql).toContain('revoke all on table public.client_onboarding_signals from authenticated');
    expect(sql).not.toMatch(/grant (insert|update|delete) on table public\.client_credit_ledger/i);
    expect(sql).not.toMatch(/grant (select|insert|update|delete) on table public\.client_onboarding_signals/i);
    expect(sql).not.toMatch(/create policy \S+ on public\.client_credit_ledger\s+for (insert|update|delete)/i);
    expect(sql).not.toMatch(/create policy \S+ on public\.client_onboarding_signals/i);
  });

  it('does not drop tables or run destructive data operations', () => {
    expect(sql).not.toMatch(/drop table|truncate|delete from/i);
    expect(sql).not.toContain('create or replace function public.grant_user_reward');
    expect(sql).not.toContain('create or replace function public.is_valid_reward_type');
  });
});
