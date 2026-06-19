-- =============================================================================
-- apply_fix_stripe_credit_purchase.sql
-- =============================================================================
-- ROOT CAUSE
--   The `metadata` column is missing from `credit_transactions` in production.
--   The RPC confirm_stripe_linkcredit_purchase references it in two places:
--     1. Idempotency check: "metadata->>'stripe_session_id' = …"
--     2. INSERT:           "insert into credit_transactions (…, metadata)"
--   Both fail with "column does not exist", rolling back the whole transaction.
--   The webhook returns 500 to Stripe → credits are never added to the wallet.
--
-- WHAT THIS SCRIPT DOES
--   1. Adds `metadata` column if not present (non-destructive, existing rows → {}).
--   2. Adds `balance_before` column if not present (read by frontend mapper).
--   3. Adds `unlock_id` column if not present (used by refund logic).
--   4. Verifies the columns exist.
--   5. Verifies the RPC function is still present and callable by service_role.
--   6. Provides diagnostic queries to inspect recent payment_events.
--
-- HOW TO RUN
--   Paste into Supabase SQL Editor → Run.
--   Expected final output: NOTICE success
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1 — Add missing columns (all idempotent)
-- ─────────────────────────────────────────────────────────────────────────────

-- Primary fix: metadata column used by confirm_stripe_linkcredit_purchase RPC
alter table public.credit_transactions
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- balance_before — read by creditsRemote.ts txFromRow mapper
alter table public.credit_transactions
  add column if not exists balance_before int;

-- unlock_id — used by refund / opportunity unlock flow
alter table public.credit_transactions
  add column if not exists unlock_id uuid
    references public.opportunity_unlocks (id) on delete set null;

-- Recreate the index the RPC uses for idempotency lookups on metadata
create index if not exists credit_transactions_metadata_stripe_session_idx
  on public.credit_transactions ((metadata->>'stripe_session_id'))
  where metadata ? 'stripe_session_id';


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2 — Verify columns exist
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  missing text[] := array[]::text[];
  col text;
  required text[] := array['metadata', 'balance_before', 'unlock_id',
                            'helper_id', 'type', 'amount', 'balance_after',
                            'related_payment_id', 'description', 'created_at'];
begin
  foreach col in array required loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name   = 'credit_transactions'
        and column_name  = col
    ) then
      missing := missing || col;
    end if;
  end loop;

  if array_length(missing, 1) > 0 then
    raise exception 'credit_transactions still missing columns: %', array_to_string(missing, ', ');
  else
    raise notice '✅ credit_transactions columns OK';
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3 — Verify RPC exists and service_role can call it
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regprocedure('public.confirm_stripe_linkcredit_purchase(jsonb)') is null then
    raise exception '❌ confirm_stripe_linkcredit_purchase RPC not found — re-run 0036_stripe_linkcredits_payments.sql';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.confirm_stripe_linkcredit_purchase(jsonb)',
    'EXECUTE'
  ) then
    raise exception '❌ service_role cannot EXECUTE confirm_stripe_linkcredit_purchase — re-apply GRANT';
  end if;

  raise notice '✅ confirm_stripe_linkcredit_purchase accessible by service_role';
end $$;

-- Harden: ensure authenticated cannot call the RPC
revoke all on function public.confirm_stripe_linkcredit_purchase(jsonb) from public;
revoke all on function public.confirm_stripe_linkcredit_purchase(jsonb) from authenticated;
grant execute on function public.confirm_stripe_linkcredit_purchase(jsonb) to service_role;

do $$
begin
  if has_function_privilege('authenticated', 'public.confirm_stripe_linkcredit_purchase(jsonb)', 'EXECUTE') then
    raise warning '⚠️  authenticated can still execute RPC — check Supabase grants';
  else
    raise notice '✅ authenticated correctly blocked from RPC';
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4 — Diagnostic: recent payment_events
-- ─────────────────────────────────────────────────────────────────────────────

select
  pe.id,
  pe.user_id,
  p.email,
  pe.package_id,
  pe.credits,
  pe.status,
  pe.stripe_session_id,
  pe.created_at
from public.payment_events pe
left join public.profiles p on p.id = pe.user_id
order by pe.created_at desc
limit 20;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5 — Diagnostic: recent CREDIT_PURCHASE transactions
-- ─────────────────────────────────────────────────────────────────────────────

select
  ct.id,
  ct.helper_id,
  p.email,
  ct.amount,
  ct.balance_before,
  ct.balance_after,
  ct.related_payment_id as stripe_session_id,
  ct.description,
  ct.created_at
from public.credit_transactions ct
left join public.profiles p on p.id = ct.helper_id
where ct.type = 'CREDIT_PURCHASE'
order by ct.created_at desc
limit 20;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6 — Diagnostic: current wallet balances
-- ─────────────────────────────────────────────────────────────────────────────

select
  cw.helper_id,
  p.email,
  p.name,
  cw.balance,
  cw.total_purchased,
  cw.total_bonus,
  cw.total_spent,
  cw.updated_at
from public.credit_wallets cw
join public.profiles p on p.id = cw.helper_id
order by cw.updated_at desc
limit 20;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7 — Detect mismatches: payment_events paid but no CREDIT_PURCHASE
-- These are purchases where payment was confirmed but credits were NOT added.
-- ─────────────────────────────────────────────────────────────────────────────

select
  pe.stripe_session_id,
  pe.user_id,
  p.email,
  pe.credits,
  pe.status,
  pe.created_at as payment_at,
  'MISSING CREDIT_PURCHASE — credits were never added' as diagnosis
from public.payment_events pe
left join public.profiles p on p.id = pe.user_id
where pe.status = 'paid'
  and not exists (
    select 1 from public.credit_transactions ct
    where ct.type = 'CREDIT_PURCHASE'
      and (
        ct.related_payment_id = pe.stripe_session_id
        or ct.metadata->>'stripe_session_id' = pe.stripe_session_id
      )
  )
order by pe.created_at desc;
