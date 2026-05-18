/**
 * Applies profiles.region migration to remote Supabase when credentials exist.
 *
 * Option A — CLI (recommended):
 *   supabase login
 *   set SUPABASE_ACCESS_TOKEN=...   # or use login session
 *   npm run db:apply-region
 *
 * Option B — direct Postgres:
 *   set DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@...pooler.supabase.com:6543/postgres
 *   npm run db:apply-region
 *
 * Option C — manual:
 *   Paste supabase/apply_profiles_region.sql in Supabase Dashboard → SQL Editor
 */
import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: join(root, '.env') });
config({ path: join(root, '.env.local') });

const sqlPath = join(root, 'supabase', 'apply_profiles_region.sql');
const sql = readFileSync(sqlPath, 'utf8');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', cwd: root, shell: true, ...opts });
  return { ok: r.status === 0, stdout: r.stdout ?? '', stderr: r.stderr ?? '', status: r.status };
}

async function applyViaPg() {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!url) return false;

  let pg;
  try {
    pg = await import('pg');
  } catch {
    console.log('[apply-region] pg not installed; skip DATABASE_URL path (npm i -D pg to enable).');
    return false;
  }

  const client = new pg.default.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(sql);
    console.log('[apply-region] Applied via DATABASE_URL successfully.');
    return true;
  } finally {
    await client.end().catch(() => {});
  }
}

function applyViaSupabaseCli() {
  if (!process.env.SUPABASE_ACCESS_TOKEN) return false;
  const push = run('npx', ['supabase', 'db', 'push', '--yes']);
  if (push.ok) {
    console.log('[apply-region] supabase db push completed.');
    console.log(push.stdout);
    return true;
  }
  console.warn('[apply-region] supabase db push failed:', push.stderr || push.stdout);
  return false;
}

const ok = (await applyViaPg()) || applyViaSupabaseCli();

if (!ok) {
  console.log('\n--- Manual step required ---');
  console.log('1. Open https://supabase.com/dashboard/project/mttjbaiiaeiqqmnwnzwr/sql');
  console.log('2. Paste and run:', sqlPath);
  console.log('3. Redeploy Vercel after setting VITE_GOOGLE_MAPS_PLATFORM_KEY if using the map.\n');
  process.exit(0);
}
