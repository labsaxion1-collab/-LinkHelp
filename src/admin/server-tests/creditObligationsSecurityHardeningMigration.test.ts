import { readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const migrationsDir = new URL('../../../supabase/migrations/', import.meta.url);
const sql = readFileSync(new URL('0064_credit_obligations_security_hardening.sql', migrationsDir), 'utf8');

function migrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
}

function obligationFnBody(): string {
  const start = sql.indexOf('create or replace function public.has_active_credit_obligation(');
  expect(start).toBeGreaterThan(-1);
  const asStart = sql.indexOf('as $$', start);
  const end = sql.indexOf('$$;', asStart + 5);
  expect(asStart).toBeGreaterThan(start);
  expect(end).toBeGreaterThan(asStart);
  return sql.slice(asStart + 5, end);
}

const helperBody = obligationFnBody();
const helperSql = sql.slice(sql.indexOf('create or replace function public.has_active_credit_obligation('));

describe('0064 credit obligations security hardening migration', () => {
  it('is sequential after 0063', () => {
    const files = migrationFiles();
    const idx = files.indexOf('0064_credit_obligations_security_hardening.sql');
    expect(idx).toBeGreaterThan(-1);
    expect(files[idx - 1]).toBe('0063_credit_obligations_foundation.sql');
    expect(files.at(-1)).toBe('0064_credit_obligations_security_hardening.sql');
  });

  it('revokes authenticated write privileges while keeping SELECT', () => {
    expect(sql).toContain('revoke all on table public.credit_obligations from public');
    expect(sql).toContain('revoke all on table public.credit_obligations from anon');
    expect(sql).toContain('revoke insert, update, delete, truncate, references, trigger');
    expect(sql).toMatch(/from authenticated/i);
    expect(sql).toContain('grant select on table public.credit_obligations to authenticated');
    expect(sql).not.toMatch(/grant (insert|update|delete|truncate) on table public\.credit_obligations/i);
    expect(sql).not.toMatch(/revoke all on table public\.credit_obligations from (postgres|service_role)/i);
    expect(sql).not.toMatch(/revoke (select|insert|update|delete) on table public\.credit_obligations from (postgres|service_role)/i);
  });

  it('does not drop RLS or the ownership SELECT policy', () => {
    expect(sql).not.toMatch(/disable row level security/i);
    expect(sql).not.toMatch(/drop policy if exists credit_obligations_select_own/i);
    expect(sql).not.toMatch(/drop policy credit_obligations_select_own/i);
    expect(sql).not.toMatch(/force row level security/i);
    expect(sql).not.toMatch(/for insert to authenticated/i);
    expect(sql).not.toMatch(/for update to authenticated/i);
    expect(sql).not.toMatch(/for delete to authenticated/i);
  });

  it('recreates has_active_credit_obligation as SECURITY INVOKER with empty search_path', () => {
    expect(helperSql).toContain('security invoker');
    expect(helperSql).not.toMatch(/security definer/i);
    expect(helperSql).toContain("set search_path = ''");
    expect(helperSql).toContain('from public.credit_obligations');
    expect(helperBody).toContain('caller is distinct from p_owner_user_id');
    expect(helperBody).toContain("raise exception 'NOT_ALLOWED'");
    expect(helperBody).toContain("o.status = 'open'");
    expect(helperBody).toContain('o.amount_outstanding > 0');
  });

  it('revokes PUBLIC/anon EXECUTE and grants authenticated plus service_role', () => {
    expect(sql).toContain('revoke all on function public.has_active_credit_obligation(uuid) from public');
    expect(sql).toContain('revoke all on function public.has_active_credit_obligation(uuid) from anon');
    expect(sql).toContain('grant execute on function public.has_active_credit_obligation(uuid) to authenticated');
    expect(sql).toContain('grant execute on function public.has_active_credit_obligation(uuid) to service_role');
    expect(sql).not.toMatch(/grant execute on function public\.has_active_credit_obligation\(uuid\) to anon/i);
    expect(sql).not.toMatch(/grant execute on function public\.has_active_credit_obligation\(uuid\) to public/i);
  });

  it('does not mutate obligations, credits, requests or applications', () => {
    expect(sql).not.toMatch(/\binsert\s+into\s+public\./i);
    expect(sql).not.toMatch(/\bupdate\s+public\./i);
    expect(sql).not.toMatch(/\bdelete\s+from\s+public\./i);
    expect(sql).not.toMatch(/\btruncate\s+/i);
    expect(sql).not.toMatch(/client_cancel_request|process_request_expiry|confirm_stripe/i);
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

  it('does not alter numbered migrations 0001–0063', () => {
    const changed = execSync('git diff --name-only HEAD -- supabase/migrations/', {
      encoding: 'utf8',
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((file) =>
        /supabase\/migrations\/(000[1-9]|00[1-4]\d|005[0-9]|006[0-3])_/.test(file.replaceAll('\\', '/')),
      );
    expect(changed).toEqual([]);
  });
});
