const base = process.env.SUPABASE_URL || 'https://mttjbaiiaeiqqmnwnzwr.supabase.co';
const key =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_kuU4jIL7kgFonY4IXTcS_Q_sfzC7i8_';

const headers = { apikey: key, Authorization: `Bearer ${key}` };

const candidates = [
  'id',
  'helper_id',
  'request_id',
  'job_id',
  'related_opportunity_id',
  'opportunity_id',
  'application_id',
  'type',
  'amount',
  'balance_before',
  'balance_after',
  'description',
  'created_at',
];

for (const col of candidates) {
  const res = await fetch(`${base}/rest/v1/credit_transactions?select=${col}&limit=1`, { headers });
  const text = await res.text();
  console.log(`${res.status === 200 ? 'OK ' : 'ERR'} ${res.status} ${col}`);
  if (res.status !== 200) console.log('     ', text.slice(0, 200));
}
