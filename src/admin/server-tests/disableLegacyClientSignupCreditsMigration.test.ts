import { readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const migrationsDir = new URL('../../../supabase/migrations/', import.meta.url);
const sql = readFileSync(new URL('0059_disable_legacy_client_signup_credits.sql', migrationsDir), 'utf8');
const sql0055 = readFileSync(new URL('0055_flux_admin_management.sql', migrationsDir), 'utf8');
const sql0058 = readFileSync(new URL('0058_client_onboarding_completion.sql', migrationsDir), 'utf8');
const fn = 'public.ensure_client_signup_credits(uuid)';

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
    .filter((name) => Number.parseInt(name.slice(0, 4), 10) <= 58)
    .sort();
}

describe('0059 disable legacy client signup credits', () => {
  it('keeps the trigger signature (uuid) → int and does not grant SIGNUP_CLIENT', () => {
    expect(sql).toContain('create or replace function public.ensure_client_signup_credits(p_client_id uuid)');
    expect(sql).toContain('returns int');
    expect(sql0055).toContain("to_regprocedure('public.ensure_client_signup_credits(uuid)')");
    expect(sql0055).toContain("execute 'select public.ensure_client_signup_credits($1)' using profile_row.id");
    expect(body).not.toMatch(/SIGNUP_CLIENT/);
    expect(body).not.toMatch(/12000/);
    expect(body).not.toMatch(/grant_user_reward/i);
    expect(body).not.toMatch(/\bupdate\b/i);
    expect(body).not.toMatch(/\binsert\b/i);
    expect(body).not.toMatch(/\bdelete\b/i);
    expect(body).toMatch(/return coalesce\(bal,\s*0\)/);
    expect(body).toContain('from public.profiles p');
  });

  it('is a no-op that only returns the current client balance', () => {
    expect(body).toContain('select p.credits into bal');
    expect(body).toContain("p.role = 'client'");
    expect(sql).not.toMatch(/update\s+public\.profiles/i);
    expect(sql).not.toMatch(/insert\s+into\s+public\.user_bonus_rewards/i);
    expect(sql).not.toMatch(/delete\s+from\s+public\.user_bonus_rewards/i);
    expect(sql).not.toContain('create or replace function public.grant_user_reward');
    expect(sql).not.toContain('create or replace function public.complete_client_onboarding');
    expect(sql).not.toContain('create or replace function public.linkhelp_handle_new_user');
    expect(body).not.toMatch(/CLIENT_WELCOME_30/);
  });

  it('leaves signup profile creation and one-time 30 LC onboarding intact', () => {
    expect(sql0055).toContain('insert into public.profiles (');
    expect(sql0055).toContain('create trigger linkhelp_on_auth_user_created');
    expect(sql0055).toContain('for each row execute function public.linkhelp_handle_new_user()');
    expect(sql0058).toContain('create or replace function public.complete_client_onboarding(');
    expect(sql0058).toContain('v_amount int := 30');
    expect(sql0058).toContain("reward_type = 'CLIENT_WELCOME_30'");
    expect(sql0058).toContain('on conflict (user_id, reward_type) do nothing');
    expect(sql0058).toContain('credits = coalesce(credits, 0) + v_amount');
  });

  it('uses SECURITY DEFINER, empty search_path, and trigger-compatible grants', () => {
    expect(sql).toContain('security definer');
    expect(sql).toContain("set search_path = ''");
    expect(sql).not.toMatch(/set search_path\s*=\s*public/i);
    expect(sql).toContain(`revoke all on function ${fn} from public`);
    expect(sql).toContain(`revoke all on function ${fn} from anon`);
    expect(sql).toContain(`revoke all on function ${fn} from authenticated`);
    expect(sql).not.toMatch(/grant execute on function public\.ensure_client_signup_credits\(uuid\) to (anon|public|authenticated)/i);
    expect(body).toContain('auth.uid()');
    expect(body).toContain("raise exception 'FORBIDDEN'");
  });

  it('does not alter numbered migrations 0001–0058', () => {
    const prior = priorMigrationFiles();
    expect(prior).toHaveLength(58);
    expect(prior[0]).toBe('0001_linkhelp_production.sql');
    expect(prior[prior.length - 1]).toBe('0058_client_onboarding_completion.sql');
    expect(prior).not.toContain('0059_disable_legacy_client_signup_credits.sql');

    const changed = execSync('git diff --name-only HEAD -- supabase/migrations/', {
      encoding: 'utf8',
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((file) => /supabase\/migrations\/(000[1-9]|00[1-4]\d|005[0-8])_/.test(file.replaceAll('\\', '/')));
    expect(changed).toEqual([]);
  });
});
