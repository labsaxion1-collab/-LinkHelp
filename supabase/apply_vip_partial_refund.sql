-- =============================================================================
-- apply_vip_partial_refund.sql
-- Partial refund (+2 LC) for normal helpers displaced by a VIP/exclusive application.
-- Atomic: runs inside helper_submit_application when p_is_exclusive = true.
-- Safe to re-run (idempotent function definitions + unique index).
-- Does NOT run retroactive refunds automatically — see STEP 6 comment block.
-- Does NOT touch Stripe, client profiles.credits, or helper VIP debit logic.
--
-- If VIP apply returns FORBIDDEN with 2 normal helpers already on the request,
-- re-run STEP 2 + STEP 3 below (fixes ensure_helper_credit_wallet auth check).
--
-- Prerequisite (schema):
--   applications.is_exclusive, requests.exclusive_helper_id
--   (apply_helper_exclusive_application_fix.sql or migration 0041)
-- Optional: upsert_pending_opportunity_unlock (migration 0042) — called when present.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: Extend credit_transactions.type
-- ---------------------------------------------------------------------------
alter table public.credit_transactions
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.credit_transactions
  add column if not exists request_id uuid references public.requests(id) on delete set null;

alter table public.credit_transactions
  add column if not exists application_id uuid references public.applications(id) on delete set null;

alter table public.credit_transactions
  add column if not exists balance_before int;

alter table public.credit_transactions drop constraint if exists credit_transactions_type_check;
alter table public.credit_transactions add constraint credit_transactions_type_check check (
  type in (
    'CREDIT_PURCHASE', 'FREE_BONUS', 'OPPORTUNITY_UNLOCK', 'REFUND', 'ADMIN_ADJUSTMENT',
    'APPLICATION_INTEREST', 'APPLICATION_SELECTED', 'VIP_EXCLUSIVE_PARTIAL_REFUND'
  )
);

-- One partial refund per helper per request (idempotency)
create unique index if not exists credit_transactions_vip_partial_refund_uidx
  on public.credit_transactions (helper_id, request_id, type)
  where type = 'VIP_EXCLUSIVE_PARTIAL_REFUND' and request_id is not null;

-- ---------------------------------------------------------------------------
-- STEP 2: process_vip_exclusive_partial_refunds
-- Credits +2 LC to each prior normal applicant on the same request.
-- ---------------------------------------------------------------------------
create or replace function public.process_vip_exclusive_partial_refunds(
  p_request_id uuid,
  p_vip_helper_id uuid,
  p_vip_application_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  norm record;
  refund_amount int := 2;
  w public.credit_wallets;
  bal_before int;
  bal_after int;
  total_refunded int := 0;
  helpers_refunded int := 0;
begin
  if p_request_id is null or p_vip_helper_id is null then
    return jsonb_build_object('refundedHelpers', 0, 'totalRefunded', 0, 'skipped', true);
  end if;

  for norm in
    select a.id as application_id, a.helper_id
    from public.applications a
    where a.request_id = p_request_id
      and a.helper_id <> p_vip_helper_id
      and coalesce(a.is_exclusive, false) = false
      and a.status in ('pending', 'viewed', 'accepted')
      and a.id is distinct from p_vip_application_id
      -- Must have paid application interest (normal candidatura debit)
      and exists (
        select 1
        from public.credit_transactions ct
        where ct.helper_id = a.helper_id
          and ct.type = 'APPLICATION_INTEREST'
          and (
            ct.request_id = p_request_id
            or ct.related_opportunity_id = p_request_id
          )
      )
      -- Idempotency guard (unique index is the hard stop)
      and not exists (
        select 1
        from public.credit_transactions ct
        where ct.helper_id = a.helper_id
          and ct.type = 'VIP_EXCLUSIVE_PARTIAL_REFUND'
          and (
            ct.request_id = p_request_id
            or ct.related_opportunity_id = p_request_id
          )
      )
  loop
    -- Do not call ensure_helper_credit_wallet here: it raises FORBIDDEN when
    -- auth.uid() is the VIP helper crediting displaced helpers' wallets.
    select * into w
    from public.credit_wallets
    where helper_id = norm.helper_id;

    if not found then
      insert into public.credit_wallets (helper_id)
      values (norm.helper_id)
      on conflict (helper_id) do nothing;

      select * into w
      from public.credit_wallets
      where helper_id = norm.helper_id;

      if not found then
        continue;
      end if;
    end if;

    bal_before := w.balance;
    bal_after := bal_before + refund_amount;

    update public.credit_wallets
    set
      balance = bal_after,
      total_spent = greatest(0, total_spent - refund_amount),
      updated_at = now()
    where helper_id = norm.helper_id;

    insert into public.credit_transactions (
      helper_id,
      type,
      amount,
      balance_before,
      balance_after,
      related_opportunity_id,
      request_id,
      application_id,
      description,
      metadata
    ) values (
      norm.helper_id,
      'VIP_EXCLUSIVE_PARTIAL_REFUND',
      refund_amount,
      bal_before,
      bal_after,
      p_request_id,
      p_request_id,
      norm.application_id,
      'Reembolso parcial por exclusividade VIP',
      jsonb_build_object(
        'vip_application_id', p_vip_application_id,
        'vip_helper_id', p_vip_helper_id,
        'refund_reason', 'vip_exclusive_displacement',
        'refund_amount_lc', refund_amount
      )
    );

    insert into public.notifications (
      user_id, type, title, description, action_url, read
    ) values (
      norm.helper_id,
      'payment',
      'Reembolso parcial recebido',
      'Sua candidatura foi substituída por uma candidatura VIP exclusiva. Devolvemos 2 LinkCredits para sua carteira.',
      '/helper/credits',
      false
    );

    begin
      perform private.enqueue_push(
        norm.helper_id,
        'Reembolso parcial recebido',
        'Sua candidatura foi substituída por uma candidatura VIP exclusiva. Devolvemos 2 LinkCredits para sua carteira.',
        '/helper/credits'
      );
    exception
      when undefined_function or invalid_schema_name then
        null;
    end;

    total_refunded := total_refunded + refund_amount;
    helpers_refunded := helpers_refunded + 1;
  end loop;

  return jsonb_build_object(
    'refundedHelpers', helpers_refunded,
    'totalRefunded', total_refunded
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- STEP 3: helper_submit_application — VIP exclusive + partial refunds
-- Preserves opportunity_unlock upsert when migration 0042 function exists.
-- ---------------------------------------------------------------------------
drop function if exists public.helper_submit_application(uuid, uuid, uuid, text, numeric, int);
drop function if exists public.helper_submit_application(uuid, uuid, uuid, text, numeric, int, boolean);

create or replace function public.helper_submit_application(
  p_request_id uuid,
  p_helper_id uuid,
  p_client_id uuid,
  p_message text default null,
  p_proposed_amount numeric default null,
  p_interest_amount int default 1,
  p_is_exclusive boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  app_id uuid;
  conv_id uuid;
  req_title text;
  helper_name text;
  proposal_part text;
  active_count int := 0;
  unlock_id uuid;
  vip_refund_result jsonb := '{}'::jsonb;
  has_unlock_fn boolean := false;
begin
  select exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'upsert_pending_opportunity_unlock'
  ) into has_unlock_fn;

  if caller is null or caller <> p_helper_id then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_helper_id = p_client_id then
    raise exception 'SELF_REQUEST';
  end if;

  if not exists (
    select 1 from public.requests r
    where r.id = p_request_id
      and r.client_id = p_client_id
      and r.status = 'open'
  ) then
    raise exception 'REQUEST_NOT_OPEN';
  end if;

  select id into app_id
  from public.applications
  where request_id = p_request_id
    and helper_id = p_helper_id
    and status <> 'cancelled'
  limit 1;

  if app_id is not null then
    conv_id := public.ensure_conversation(p_request_id, p_client_id, p_helper_id, false);
    if has_unlock_fn then
      unlock_id := public.upsert_pending_opportunity_unlock(
        p_request_id, p_helper_id, coalesce(p_interest_amount, 1), app_id
      );
    end if;
    return jsonb_build_object(
      'alreadyExists', true,
      'applicationId', app_id,
      'conversationId', conv_id,
      'created', false,
      'unlockId', unlock_id
    );
  end if;

  if exists (
    select 1
    from public.applications
    where request_id = p_request_id
      and is_exclusive = true
      and status in ('pending', 'viewed', 'accepted')
  ) then
    raise exception 'EXCLUSIVE_APPLICATION_LOCKED';
  end if;

  select count(*)::int into active_count
  from public.applications
  where request_id = p_request_id
    and status in ('pending', 'viewed', 'accepted');

  if not coalesce(p_is_exclusive, false) and active_count >= 3 then
    raise exception 'APPLICATION_LIMIT_REACHED';
  end if;

  perform public.helper_debit_application_interest(
    p_helper_id,
    p_request_id,
    coalesce(p_interest_amount, 1)
  );

  begin
    insert into public.applications (
      request_id, helper_id, client_id, message, proposed_amount, is_exclusive, status
    ) values (
      p_request_id,
      p_helper_id,
      p_client_id,
      p_message,
      p_proposed_amount,
      coalesce(p_is_exclusive, false),
      'pending'
    )
    returning id into app_id;
  exception
    when unique_violation then
      select id into app_id
      from public.applications
      where request_id = p_request_id
        and helper_id = p_helper_id
        and status <> 'cancelled'
      limit 1;
      if app_id is null then
        raise;
      end if;
      conv_id := public.ensure_conversation(p_request_id, p_client_id, p_helper_id, false);
      if has_unlock_fn then
        unlock_id := public.upsert_pending_opportunity_unlock(
          p_request_id, p_helper_id, coalesce(p_interest_amount, 1), app_id
        );
      end if;
      return jsonb_build_object(
        'alreadyExists', true,
        'applicationId', app_id,
        'conversationId', conv_id,
        'created', false,
        'unlockId', unlock_id
      );
  end;

  if has_unlock_fn then
    unlock_id := public.upsert_pending_opportunity_unlock(
      p_request_id, p_helper_id, coalesce(p_interest_amount, 1), app_id
    );
  end if;

  conv_id := public.ensure_conversation(p_request_id, p_client_id, p_helper_id, false);

  if coalesce(p_is_exclusive, false) then
    update public.requests
    set exclusive_helper_id = p_helper_id
    where id = p_request_id;

    vip_refund_result := public.process_vip_exclusive_partial_refunds(
      p_request_id,
      p_helper_id,
      app_id
    );
  end if;

  select title into req_title from public.requests where id = p_request_id;
  select name into helper_name from public.profiles where id = p_helper_id;

  proposal_part := case
    when p_proposed_amount is not null then
      ' sent a proposal of CAD $' || round(p_proposed_amount)::text || ' for "' || coalesce(req_title, 'Request') || '".'
    else
      ' applied to "' || coalesce(req_title, 'Request') || '".'
  end;

  insert into public.notifications (
    user_id, type, title, description, action_url, read
  ) values (
    p_client_id,
    'application',
    'New application',
    coalesce(helper_name, 'A helper') || proposal_part,
    '/client/dashboard',
    false
  );

  return jsonb_build_object(
    'alreadyExists', false,
    'applicationId', app_id,
    'conversationId', conv_id,
    'created', true,
    'isExclusive', coalesce(p_is_exclusive, false),
    'vipPartialRefunds', vip_refund_result,
    'unlockId', unlock_id
  );
end;
$$;

grant execute on function public.helper_submit_application(uuid, uuid, uuid, text, numeric, int, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- STEP 4: Post-apply sanity (definitions only — no data mutation)
-- ---------------------------------------------------------------------------
select
  'process_vip_exclusive_partial_refunds defined' as check_name,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'process_vip_exclusive_partial_refunds'
  ) as ok;

select
  'VIP_EXCLUSIVE_PARTIAL_REFUND in type check' as check_name,
  pg_get_constraintdef(oid) like '%VIP_EXCLUSIVE_PARTIAL_REFUND%'
from pg_constraint
where conname = 'credit_transactions_type_check';

-- ---------------------------------------------------------------------------
-- STEP 5: Preview — existing requests that WOULD qualify for retroactive refund
-- (READ ONLY — does NOT insert refunds)
-- ---------------------------------------------------------------------------
select
  'PREVIEW retroactive VIP partial refunds (NOT APPLIED)' as step,
  r.id as request_id,
  r.title,
  vip.helper_id as vip_helper_id,
  norm.helper_id as displaced_helper_id,
  norm.id as displaced_application_id
from public.requests r
join public.applications vip
  on vip.request_id = r.id
 and vip.is_exclusive = true
 and vip.status in ('pending', 'viewed', 'accepted')
join public.applications norm
  on norm.request_id = r.id
 and norm.helper_id <> vip.helper_id
 and coalesce(norm.is_exclusive, false) = false
 and norm.status in ('pending', 'viewed', 'accepted')
where not exists (
  select 1 from public.credit_transactions ct
  where ct.helper_id = norm.helper_id
    and ct.type = 'VIP_EXCLUSIVE_PARTIAL_REFUND'
    and (ct.request_id = r.id or ct.related_opportunity_id = r.id)
)
order by r.created_at desc
limit 50;

-- ---------------------------------------------------------------------------
-- STEP 6: Retroactive refunds — DISABLED by default
-- Uncomment ONLY after reviewing STEP 5 preview and confirming with product.
-- ---------------------------------------------------------------------------
-- do $$
-- declare
--   rec record;
--   result jsonb;
-- begin
--   for rec in
--     select distinct r.id as request_id, vip.helper_id as vip_helper_id, vip.id as vip_application_id
--     from public.requests r
--     join public.applications vip
--       on vip.request_id = r.id
--      and vip.is_exclusive = true
--      and vip.status in ('pending', 'viewed', 'accepted')
--   loop
--     result := public.process_vip_exclusive_partial_refunds(
--       rec.request_id, rec.vip_helper_id, rec.vip_application_id
--     );
--     raise notice 'Retro VIP refund request=% result=%', rec.request_id, result;
--   end loop;
-- end;
-- $$;

notify pgrst, 'reload schema';
