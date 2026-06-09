-- Paste this entire file in Supabase Dashboard → SQL Editor when the client sees:
--   Could not find the function public.charge_helper_on_client_hire(...)
--   Could not find the function public.client_accept_proposal(...)
--   PGRST202 / 404 on POST /rest/v1/rpc/client_accept_proposal
--   Error: FORBIDDEN on POST /rest/v1/rpc/client_accept_proposal
--     (client JWT debiting helper wallet via ensure_helper_credit_wallet)
--
-- Same as supabase/migrations/0034_fix_client_hire_helper_flow.sql (idempotent).
-- Prerequisite: apply_helper_application_flow.sql (helper candidatura RPCs).
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Columns used by accept-proposal flow
-- ---------------------------------------------------------------------------

alter table public.applications
  add column if not exists proposed_amount numeric;

alter table public.requests
  add column if not exists accepted_amount numeric;

alter table public.credit_transactions
  add column if not exists request_id uuid references public.requests(id) on delete set null,
  add column if not exists application_id uuid references public.applications(id) on delete set null,
  add column if not exists balance_before int;

alter table public.credit_transactions drop constraint if exists credit_transactions_type_check;
alter table public.credit_transactions add constraint credit_transactions_type_check check (
  type in (
    'CREDIT_PURCHASE', 'FREE_BONUS', 'OPPORTUNITY_UNLOCK', 'REFUND', 'ADMIN_ADJUSTMENT',
    'APPLICATION_INTEREST', 'APPLICATION_SELECTED'
  )
);

-- ---------------------------------------------------------------------------
-- RPCs: conversation, debit credits (idempotent), accept proposal (atomic)
-- ---------------------------------------------------------------------------

create or replace function public.ensure_conversation(
  p_request_id uuid,
  p_client_id uuid,
  p_helper_id uuid,
  p_contact_unlocked boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conv public.conversations;
begin
  select * into conv from public.conversations
  where request_id = p_request_id and client_id = p_client_id and helper_id = p_helper_id;

  if conv.id is not null then
    if p_contact_unlocked and conv.contact_unlocked is false then
      update public.conversations set contact_unlocked = true where id = conv.id;
    end if;
    return conv.id;
  end if;

  begin
    insert into public.conversations (request_id, client_id, helper_id, contact_unlocked)
    values (p_request_id, p_client_id, p_helper_id, p_contact_unlocked)
    returning id into conv.id;
  exception
    when unique_violation then
      select * into conv from public.conversations
      where request_id = p_request_id and client_id = p_client_id and helper_id = p_helper_id;
      if p_contact_unlocked and conv.contact_unlocked is false then
        update public.conversations set contact_unlocked = true where id = conv.id;
      end if;
  end;

  return conv.id;
end;
$$;

create or replace function public.helper_debit_application_selected(
  p_helper_id uuid,
  p_request_id uuid,
  p_application_id uuid,
  p_amount int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  w public.credit_wallets;
  bal_before int;
  bal_after int;
  tx_id uuid;
  req_client uuid;
begin
  if caller is null then raise exception 'AUTH_REQUIRED'; end if;
  if caller <> p_helper_id then
    select client_id into req_client from public.requests where id = p_request_id;
    if req_client is null or req_client <> caller then raise exception 'NOT_ALLOWED'; end if;
  end if;
  if p_amount < 1 or p_amount > 30 then raise exception 'INVALID_AMOUNT'; end if;

  select id into tx_id from public.credit_transactions
  where helper_id = p_helper_id and request_id = p_request_id and type = 'APPLICATION_SELECTED'
  limit 1;
  if tx_id is not null then
    return jsonb_build_object('alreadyCharged', true, 'amount', p_amount);
  end if;

  -- Do not call ensure_helper_credit_wallet here: client_accept_proposal runs as the
  -- request owner (client JWT). ensure_helper_credit_wallet raises FORBIDDEN when
  -- auth.uid() <> p_helper_id, even after NOT_ALLOWED checks above pass.
  insert into public.credit_wallets (helper_id)
  values (p_helper_id)
  on conflict (helper_id) do nothing;

  select * into w from public.credit_wallets where helper_id = p_helper_id for update;
  if w.id is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  bal_before := w.balance;
  if bal_before < p_amount then raise exception 'INSUFFICIENT_CREDITS'; end if;
  bal_after := bal_before - p_amount;

  update public.credit_wallets
  set balance = bal_after, total_spent = total_spent + p_amount
  where helper_id = p_helper_id;

  insert into public.credit_transactions (
    helper_id, type, amount, balance_before, balance_after, related_opportunity_id, request_id, application_id, description
  ) values (
    p_helper_id, 'APPLICATION_SELECTED', -p_amount, bal_before, bal_after, p_request_id, p_request_id, p_application_id,
    'Contratação confirmada pelo cliente'
  );

  return jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'balanceBefore', bal_before,
    'balanceAfter', bal_after
  );
end;
$$;

create or replace function public.charge_helper_on_client_hire(
  p_application_id uuid,
  p_amount int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  app public.applications;
  req public.requests;
begin
  if caller is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into app from public.applications where id = p_application_id;
  if app.id is null then raise exception 'NOT_FOUND'; end if;
  select * into req from public.requests where id = app.request_id;
  if req.client_id <> caller then raise exception 'NOT_ALLOWED'; end if;

  return public.helper_debit_application_selected(app.helper_id, app.request_id, app.id, p_amount);
end;
$$;

create or replace function public.client_accept_proposal(
  p_application_id uuid,
  p_charge_amount int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  app public.applications;
  req public.requests;
  conv_id uuid;
  accepted_amt numeric;
  value_hint text;
  scheduled_at timestamptz;
  client_name text;
  client_avatar text;
begin
  if caller is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into app from public.applications where id = p_application_id for update;
  if app.id is null then
    raise exception 'NOT_FOUND';
  end if;

  select * into req from public.requests where id = app.request_id for update;
  if req.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if req.client_id <> caller then
    raise exception 'NOT_ALLOWED';
  end if;

  if app.request_id <> req.id or app.client_id <> req.client_id then
    raise exception 'APPLICATION_MISMATCH';
  end if;

  if app.status in ('cancelled', 'rejected') then
    raise exception 'APPLICATION_NOT_ACTIVE';
  end if;

  if p_charge_amount is not null and p_charge_amount > 0 and app.status <> 'accepted' then
    perform public.helper_debit_application_selected(
      app.helper_id,
      app.request_id,
      app.id,
      p_charge_amount
    );
  end if;

  if app.status <> 'accepted' then
    update public.applications set status = 'accepted', updated_at = now() where id = app.id;

    update public.requests set status = 'in_progress', updated_at = now() where id = req.id;

    accepted_amt := app.proposed_amount;
    if accepted_amt is not null then
      value_hint := 'CAD $' || round(accepted_amt)::text;
      update public.requests
      set accepted_amount = accepted_amt,
          budget = value_hint,
          updated_at = now()
      where id = req.id;
    end if;

    update public.applications
    set status = 'rejected', updated_at = now()
    where request_id = app.request_id
      and id <> app.id
      and status in ('pending', 'viewed');

    if not exists (
      select 1 from public.upcoming_jobs
      where request_id = app.request_id and helper_id = app.helper_id
    ) then
      select coalesce(p.name, 'Client'), p.avatar_url
      into client_name, client_avatar
      from public.profiles p
      where p.id = req.client_id;

      scheduled_at := now() + interval '48 hours';

      insert into public.upcoming_jobs (
        request_id,
        helper_id,
        client_name,
        client_avatar,
        title,
        category,
        description,
        location,
        value_hint,
        urgency,
        scheduled_at,
        workflow_status
      ) values (
        app.request_id,
        app.helper_id,
        client_name,
        client_avatar,
        req.title,
        req.category,
        req.description,
        req.location,
        coalesce(value_hint, req.budget),
        coalesce(req.urgency, 'normal'),
        scheduled_at,
        'scheduled'
      );
    end if;
  end if;

  conv_id := public.ensure_conversation(
    app.request_id,
    app.client_id,
    app.helper_id,
    true
  );

  begin
    insert into public.notifications (user_id, type, title, description, action_url, read)
    values (
      app.helper_id,
      'application',
      'Official hire',
      case
        when accepted_amt is not null then
          format('Your proposal of CAD $%s was accepted for "%s". Chat is now open.', round(accepted_amt), req.title)
        else
          format('The client officially hired you for "%s". Chat is now open.', req.title)
      end,
      '/messages?c=' || conv_id::text,
      false
    );
  exception when others then
    null;
  end;

  begin
    insert into public.notifications (user_id, type, title, description, action_url, read)
    values (
      app.client_id,
      'application',
      'Helper hired',
      format('You can now chat with your helper about "%s".', req.title),
      '/messages?c=' || conv_id::text,
      false
    );
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'conversationId', conv_id,
    'requestId', app.request_id,
    'applicationId', app.id,
    'helperId', app.helper_id,
    'requestStatus', 'in_progress',
    'applicationStatus', 'accepted'
  );
end;
$$;

grant execute on function public.ensure_conversation(uuid, uuid, uuid, boolean) to authenticated;
grant execute on function public.helper_debit_application_selected(uuid, uuid, uuid, int) to authenticated;
grant execute on function public.charge_helper_on_client_hire(uuid, int) to authenticated;
grant execute on function public.client_accept_proposal(uuid, int) to authenticated;

notify pgrst, 'reload schema';
