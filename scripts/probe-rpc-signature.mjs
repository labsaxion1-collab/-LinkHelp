/**
 * Probes helper_submit_application signature on Supabase.
 */
const base = process.env.SUPABASE_URL || 'https://mttjbaiiaeiqqmnwnzwr.supabase.co';
const key =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_kuU4jIL7kgFonY4IXTcS_Q_sfzC7i8_';

const fakeUuid = '00000000-0000-4000-8000-000000000001';

async function rpc(payload, label) {
  const res = await fetch(`${base}/rest/v1/rpc/helper_submit_application`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  console.log(`\n--- ${label} ---`);
  console.log('status:', res.status);
  console.log('code:', parsed?.code);
  console.log('message:', parsed?.message ?? String(parsed).slice(0, 200));
}

const base6 = {
  p_request_id: fakeUuid,
  p_helper_id: fakeUuid,
  p_client_id: fakeUuid,
  p_interest_amount: 1,
};

await rpc(base6, '6 params');
await rpc({ ...base6, p_is_exclusive: false }, '7 params exclusive false');
await rpc({ ...base6, p_is_exclusive: true }, '7 params exclusive true');
await rpc({ ...base6, p_unknown_param: true }, 'unknown param');
await rpc({ ...base6, p_proposed_amount: 'not-a-number' }, 'bad proposed_amount type');

// Check is_exclusive column
const colRes = await fetch(
  `${base}/rest/v1/applications?select=is_exclusive&limit=1`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } },
);
console.log('\n--- is_exclusive column ---');
console.log('status:', colRes.status);
console.log('body:', (await colRes.text()).slice(0, 200));

// Function signatures via pg - not available via REST; use verify SQL in dashboard
