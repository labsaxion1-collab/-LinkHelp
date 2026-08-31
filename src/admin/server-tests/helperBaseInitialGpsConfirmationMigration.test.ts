import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const migrationsDir = new URL('../../../supabase/migrations/', import.meta.url);
const sql = readFileSync(
  new URL('20260831014124_helper_base_initial_gps_confirmation.sql', migrationsDir),
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

const rpcBody = functionBody(sql, 'create or replace function public.update_helper_base_address(');

describe('20260831014124 helper base initial GPS confirmation migration', () => {
  it('clears legacy cooldown timestamps for helpers without confirmed coordinates', () => {
    expect(sql).toContain('set helper_base_updated_at = null');
    expect(sql).toContain('helper_base_lat is null');
    expect(sql).toContain('helper_base_lng is null');
  });

  it('2. first GPS confirmation starts cooldown only when incoming coords are valid', () => {
    expect(rpcBody).toContain('when v_incoming_confirmed then now()');
    expect(rpcBody).toContain('else null');
  });

  it('3. text-only saves without coords do not start cooldown', () => {
    expect(rpcBody).toContain('if not v_confirmed then');
    expect(rpcBody).toMatch(
      /helper_base_updated_at = case[\s\S]*when v_incoming_confirmed then now\(\)[\s\S]*else null/,
    );
  });

  it('4. confirmed residence cannot change inside 30 days', () => {
    expect(rpcBody).toContain("interval '30 days'");
    expect(rpcBody).toContain('HELPER_BASE_ADDRESS_LOCKED');
    expect(rpcBody).toContain('v_confirmed :=');
  });

  it('5. confirmed residence may change after cooldown elapses', () => {
    expect(rpcBody).toContain('when v_changed then now()');
  });

  it('6. unchanged payload returns early without touching timestamps', () => {
    expect(rpcBody).toContain('if not v_changed then');
    expect(rpcBody).toContain('return row;');
  });

  it('7. invalid coordinates are rejected', () => {
    expect(rpcBody).toContain('HELPER_BASE_ADDRESS_INVALID_COORDS');
    expect(rpcBody).toContain('p_lat < -90');
  });

  it('8. coordinate comparison uses precision epsilon', () => {
    expect(rpcBody).toContain('v_coord_eps constant double precision := 0.0001');
    expect(rpcBody).toContain('abs(p_lat - row.helper_base_lat) < v_coord_eps');
  });

  it('does not add email/user-specific bypasses', () => {
    expect(sql.toLowerCase()).not.toContain('@');
    expect(sql.toLowerCase()).not.toContain('test account');
    expect(sql.toLowerCase()).not.toContain('labsaxion');
  });

  it('still exposes exactly six public Vercel handlers', () => {
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

describe('financial gate remains unchanged', () => {
  it('13-14. in-person apply still gates on persisted coords before debit RPC', () => {
    const dashboard = readFileSync(
      new URL('../../../src/pages/helper/HelperDashboard.tsx', import.meta.url),
      'utf8',
    );
    const submitStart = dashboard.indexOf('const submitApply =');
    const submitBlock = dashboard.slice(submitStart, submitStart + 2000);
    expect(submitBlock).toContain('decideHelperApplyLocation');
    expect(submitBlock.indexOf('decideHelperApplyLocation')).toBeLessThan(
      submitBlock.indexOf('appDataActionsRef.current.applyForJob'),
    );
  });
});
