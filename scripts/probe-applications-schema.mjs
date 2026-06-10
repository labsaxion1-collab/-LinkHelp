const base = process.env.SUPABASE_URL || 'https://mttjbaiiaeiqqmnwnzwr.supabase.co';
const key =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_kuU4jIL7kgFonY4IXTcS_Q_sfzC7i8_';

const headers = { apikey: key, Authorization: `Bearer ${key}` };

const candidates = [
  'id',
  'request_id',
  'job_id',
  'helper_id',
  'client_id',
  'status',
  'message',
  'is_exclusive',
  'proposed_amount',
  'proposed_value',
  'amount',
  'budget',
  'created_at',
  'updated_at',
];

for (const col of candidates) {
  const res = await fetch(`${base}/rest/v1/applications?select=${col}&limit=1`, { headers });
  console.log(`${res.status === 200 ? 'OK ' : 'ERR'} ${res.status} applications.${col}`);
}
