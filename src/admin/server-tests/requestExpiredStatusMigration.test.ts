import { readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const migrationsDir = new URL('../../../supabase/migrations/', import.meta.url);
const sql = readFileSync(new URL('0062_request_expired_status.sql', migrationsDir), 'utf8');

function migrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
}

describe('0062 request expired status migration', () => {
  it('is sequential after 0061', () => {
    const files = migrationFiles();
    const idx = files.indexOf('0062_request_expired_status.sql');
    expect(idx).toBeGreaterThan(-1);
    expect(files[idx - 1]).toBe('0061_helper_application_authoritative.sql');
    expect(files[idx + 1]).toBe('0063_credit_obligations_foundation.sql');
  });

  it('locates and replaces the requests.status check to include expired only', () => {
    expect(sql).toContain('pg_constraint');
    expect(sql).toContain("t.relname = 'requests'");
    expect(sql).toContain("pg_get_constraintdef(c.oid) ilike '%status%'");
    expect(sql).toContain('requests_status_check');
    expect(sql).toContain("'expired'");
    expect(sql).toContain("'open'");
    expect(sql).toContain("'in_progress'");
    expect(sql).toContain("'completed'");
    expect(sql).toContain("'cancelled'");
    expect(sql).not.toContain("'paused'");
    expect(sql).toMatch(/v_def is not null and v_def ilike '%expired%'/i);
  });

  it('creates the open+expires_at partial index idempotently', () => {
    expect(sql).toContain('create index if not exists requests_open_expires_at_idx');
    expect(sql).toContain("where status = 'open' and expires_at is not null");
  });

  it('does not mutate request rows or expire data during apply', () => {
    expect(sql).not.toMatch(/\bupdate\s+public\.requests\b/i);
    expect(sql).not.toMatch(/\binsert\s+into\s+public\.requests\b/i);
    expect(sql).not.toMatch(/\bdelete\s+from\s+public\.requests\b/i);
    expect(sql).not.toMatch(/pg_cron/i);
  });

  it('does not alter numbered migrations 0001–0061', () => {
    const changed = execSync('git diff --name-only HEAD -- supabase/migrations/', {
      encoding: 'utf8',
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((file) =>
        /supabase\/migrations\/(000[1-9]|00[1-4]\d|005[0-9]|006[01])_/.test(file.replaceAll('\\', '/')),
      );
    expect(changed).toEqual([]);
  });
});
