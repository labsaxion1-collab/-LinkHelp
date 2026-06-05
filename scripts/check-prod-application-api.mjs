/**
 * Probes PostgREST paths that candidatura uses. 404 = SQL not applied or schema cache stale.
 * Usage: node scripts/check-prod-application-api.mjs
 */
const base = process.env.SUPABASE_URL || 'https://mttjbaiiaeiqqmnwnzwr.supabase.co';
const key =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_kuU4jIL7kgFonY4IXTcS_Q_sfzC7i8_';

const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function probe(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { path, status: res.status, ok: res.status !== 404, snippet: text.slice(0, 120) };
}

const checks = [
  await probe('GET', '/rest/v1/applications?select=id&limit=1'),
  await probe('GET', '/rest/v1/credit_wallets?select=helper_id&limit=1'),
  await probe('GET', '/rest/v1/credit_transactions?select=id&limit=1'),
  await probe('GET', '/rest/v1/credit_packages?select=id&limit=1'),
  await probe('GET', '/rest/v1/opportunity_unlocks?select=id&limit=1'),
  await probe('POST', '/rest/v1/rpc/helper_submit_application', {}),
  await probe('POST', '/rest/v1/rpc/helper_debit_application_interest', {}),
  await probe('POST', '/rest/v1/rpc/ensure_conversation', {}),
  await probe('POST', '/rest/v1/rpc/ensure_helper_credit_wallet', {}),
];

for (const c of checks) {
  console.log(`${c.ok ? 'OK ' : '404'} ${c.status} ${c.path}`);
  if (!c.ok) console.log('     ', c.snippet);
}

const allOk = checks.every((c) => c.ok);
console.log(allOk ? '\nAPI paths exist (401/400 without auth is expected).' : '\nApply supabase/apply_helper_application_flow.sql in Dashboard.');
process.exit(allOk ? 0 : 1);
