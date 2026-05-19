import Stripe from 'npm:stripe@16.12.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!stripeSecret || !webhookSecret || !url || !serviceKey) {
    return new Response('Not configured', { status: 503 });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    return new Response(err instanceof Error ? err.message : 'Invalid signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const helperId = session.metadata?.helper_id;
    const packageId = session.metadata?.package_id;
    if (helperId && packageId) {
      const supabase = createClient(url, serviceKey);
      const { data: pkg } = await supabase.from('credit_packages').select('*').eq('id', packageId).single();
      if (pkg) {
        await supabase.rpc('confirm_credit_purchase', {
          p_helper_id: helperId,
          p_package_id: packageId,
          p_payment_id: session.id,
        });
      }
    }
  }

  return new Response('ok');
});
