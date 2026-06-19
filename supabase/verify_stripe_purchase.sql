-- =============================================================================
-- verify_stripe_purchase.sql
-- Diagnose why Stripe purchases are not crediting the wallet.
-- Run in Supabase SQL Editor (read-only diagnostics + one optional RPC test).
-- =============================================================================

-- 1. Check if payment_events table exists and has rows
-- =============================================================================
select
  'payment_events'           as table_name,
  count(*)                   as total_rows,
  count(*) filter (where status = 'paid') as paid_rows,
  max(created_at)            as last_event
from public.payment_events;

-- 2. Check credit_transactions for CREDIT_PURCHASE
-- =============================================================================
select
  type,
  count(*)   as count,
  sum(amount) as total_lc,
  max(created_at) as last_tx
from public.credit_transactions
group by type
order by count desc;

-- 3. Check credit_wallets for recent updates
-- =============================================================================
select
  p.email,
  cw.balance,
  cw.total_purchased,
  cw.updated_at
from public.credit_wallets cw
join public.profiles p on p.id = cw.helper_id
order by cw.updated_at desc
limit 10;

-- 4. Check if confirm_stripe_linkcredit_purchase is service_role only
-- =============================================================================
select
  r.rolname,
  has_function_privilege(r.rolname, 'public.confirm_stripe_linkcredit_purchase(jsonb)', 'execute') as can_execute
from pg_roles r
where r.rolname in ('authenticated', 'anon', 'service_role', 'postgres')
order by r.rolname;

-- 5. Verify credit_transactions.metadata column exists
-- =============================================================================
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'credit_transactions'
  and column_name  in ('metadata', 'balance_before', 'balance_after', 'unlock_id')
order by column_name;

-- =============================================================================
-- MANUAL RPC TEST (OPTIONAL — uncomment to test end-to-end with a real helper)
-- Replace <<HELPER_UUID>> with an actual helper's user ID.
-- This will credit 1 LC to that helper's wallet and create a test CREDIT_PURCHASE.
-- Use session id 'cs_test_manual_verify_001' (run again to confirm idempotency).
-- =============================================================================
/*
select public.confirm_stripe_linkcredit_purchase(jsonb_build_object(
  'user_id',                '<<HELPER_UUID>>',
  'stripe_session_id',      'cs_test_manual_verify_001',
  'stripe_payment_intent_id', 'pi_test_manual_verify_001',
  'package_id',             'starter',
  'price_id',               'price_test',
  'credits',                1,
  'amount_total',           1499,
  'currency',               'CAD',
  'status',                 'paid'
));
*/

-- 6. Recent payment_events (if any)
-- =============================================================================
select
  user_id,
  stripe_session_id,
  package_id,
  credits,
  status,
  created_at
from public.payment_events
order by created_at desc
limit 20;

-- =============================================================================
-- CHECKLIST — if payment_events is EMPTY, check these in Vercel dashboard:
-- 1. STRIPE_WEBHOOK_SECRET  matches the secret in Stripe dashboard → Webhooks
-- 2. SUPABASE_URL           must be set (not VITE_SUPABASE_URL) — or both
-- 3. SUPABASE_SERVICE_ROLE_KEY  is the service_role key, NOT the anon key
-- 4. Stripe webhook URL:    https://YOUR_APP.vercel.app/api/stripe/webhook
-- 5. Webhook listens to:    checkout.session.completed
-- 6. After updating env vars: redeploy Vercel (or trigger a redeploy)
-- =============================================================================
