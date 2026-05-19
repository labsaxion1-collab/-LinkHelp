import Stripe from 'npm:stripe@16.12.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!stripeSecret || !url || !serviceKey) {
    return Response.json({ error: 'STRIPE_NOT_CONFIGURED' }, { status: 503, headers: cors });
  }

  const auth = req.headers.get('Authorization') ?? '';
  const supabase = createClient(url, serviceKey, { global: { headers: { Authorization: auth } } });
  const { data: userData } = await supabase.auth.getUser();
  const helperId = userData.user?.id;
  if (!helperId) return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401, headers: cors });

  const { packageId, successUrl, cancelUrl } = await req.json();
  const { data: pkg, error } = await supabase
    .from('credit_packages')
    .select('*')
    .eq('id', packageId)
    .eq('active', true)
    .single();
  if (error || !pkg) return Response.json({ error: 'PACKAGE_NOT_FOUND' }, { status: 404, headers: cors });

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: helperId,
    metadata: { helper_id: helperId, package_id: pkg.id, credits: String(pkg.credits) },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'cad',
        unit_amount: Math.round(Number(pkg.price_cad) * 100),
        product_data: { name: `LinkHelp ${pkg.name} - ${pkg.credits} credits` },
      },
    }],
  });

  return Response.json({ url: session.url }, { headers: cors });
});
