-- =============================================================================
-- apply_helper_submit_authoritative_interest.sql
-- Server-side authoritative application interest (replaces trusting p_interest_amount).
--
-- MVP rule (matches frontend ENABLE_FULL_HELPER_CREDIT_CHARGE=false):
--   Normal apply debit = 4 LC (fixed INTEREST_COST_LC)
--   VIP apply debit    = Normal + 4 = 8 LC
--
-- helper_submit_application computes the charge inside the transaction, debits
-- that amount, and rejects client-supplied mismatches with INTEREST_AMOUNT_MISMATCH.
--
-- Idempotent. Safe to re-run. Prerequisite: apply_vip_partial_refund.sql (or
-- equivalent helper_submit_application 7-arg + p_is_exclusive body).
-- Does NOT execute wallet fixes. Does NOT create a parallel charging system.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: Authoritative interest resolver (single source for apply debit)
-- ---------------------------------------------------------------------------
create or replace function public.helper_resolve_application_interest_lc(
  p_is_exclusive boolean default false
)
returns int
language sql
immutable
as $$
  select case
    when coalesce(p_is_exclusive, false) then 8
    else 4
  end;
$$;

comment on function public.helper_resolve_application_interest_lc(boolean) is
  'MVP apply debit: 4 LC normal, 8 LC VIP (4+4). Matches frontend interestCost + VIP surcharge.';

-- ---------------------------------------------------------------------------
-- STEP 2: Patch helper_submit_application — validate + debit authoritative amount
-- Replaces body debit/unlock calls that used coalesce(p_interest_amount, 1).
-- Full function copied from apply_vip_partial_refund.sql with charge resolution.
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
  authoritative_charge int;
begin
  authoritative_charge := public.helper_resolve_application_interest_lc(p_is_exclusive);

  if p_interest_amount is not null and p_interest_amount <> authoritative_charge then
    raise exception 'INTEREST_AMOUNT_MISMATCH';
  end if;

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
        p_request_id, p_helper_id, authoritative_charge, app_id
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
    authoritative_charge
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
          p_request_id, p_helper_id, authoritative_charge, app_id
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
      p_request_id, p_helper_id, authoritative_charge, app_id
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
    'interestCharged', authoritative_charge,
    'vipPartialRefunds', vip_refund_result,
    'unlockId', unlock_id
  );
end;
$$;

grant execute on function public.helper_resolve_application_interest_lc(boolean) to authenticated;
grant execute on function public.helper_submit_application(uuid, uuid, uuid, text, numeric, int, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- STEP 3: Post-apply sanity (definitions only)
-- ---------------------------------------------------------------------------
select 'helper_resolve_application_interest_lc defined' as check_name,
  to_regprocedure('public.helper_resolve_application_interest_lc(boolean)') is not null as ok;

select 'helper_submit_application uses authoritative_charge' as check_name,
  (
    select pg_get_functiondef(p.oid) ~* 'authoritative_charge'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'helper_submit_application'
    limit 1
  ) as ok;

select 'helper_submit_application rejects INTEREST_AMOUNT_MISMATCH' as check_name,
  (
    select pg_get_functiondef(p.oid) ~* 'INTEREST_AMOUNT_MISMATCH'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'helper_submit_application'
    limit 1
  ) as ok;
