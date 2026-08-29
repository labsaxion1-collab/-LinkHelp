-- Restore client onboarding completion (CLIENT_WELCOME_30) as a numbered migration.
-- Objects were previously only in apply_client_welcome_30_onboarding.sql / staging drafts.
-- Does not replace grant_user_reward / is_valid_reward_type (0024 remains source of those amounts).
-- Does not backfill credits or mark existing clients complete.

-- ---------------------------------------------------------------------------
-- 1) profiles.client_onboarding_completed_at
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists client_onboarding_completed_at timestamptz null;

comment on column public.profiles.client_onboarding_completed_at is
  'Set when the client completes welcome onboarding. Credits are granted only via complete_client_onboarding.';

-- ---------------------------------------------------------------------------
-- 2) public.client_credit_ledger
-- ---------------------------------------------------------------------------
create table if not exists public.client_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  amount int not null,
  balance_after int not null,
  reward_type text null,
  description text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists client_credit_ledger_client_created_idx
  on public.client_credit_ledger (client_id, created_at desc);

create unique index if not exists client_credit_ledger_welcome_30_uidx
  on public.client_credit_ledger (client_id)
  where reward_type = 'CLIENT_WELCOME_30';

alter table public.client_credit_ledger enable row level security;

revoke all on table public.client_credit_ledger from public;
revoke all on table public.client_credit_ledger from anon;
revoke all on table public.client_credit_ledger from authenticated;
grant select on table public.client_credit_ledger to authenticated;

drop policy if exists client_credit_ledger_select_own on public.client_credit_ledger;
create policy client_credit_ledger_select_own on public.client_credit_ledger
  for select to authenticated
  using (auth.uid() = client_id);

-- ---------------------------------------------------------------------------
-- 3) public.client_onboarding_signals (audit only; writes via SECURITY DEFINER RPC)
-- ---------------------------------------------------------------------------
create table if not exists public.client_onboarding_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_fingerprint text null,
  created_at timestamptz not null default now()
);

create index if not exists client_onboarding_signals_user_idx
  on public.client_onboarding_signals (user_id, created_at desc);

create index if not exists client_onboarding_signals_fingerprint_idx
  on public.client_onboarding_signals (device_fingerprint)
  where device_fingerprint is not null;

alter table public.client_onboarding_signals enable row level security;

revoke all on table public.client_onboarding_signals from public;
revoke all on table public.client_onboarding_signals from anon;
revoke all on table public.client_onboarding_signals from authenticated;

-- ---------------------------------------------------------------------------
-- 4) public.complete_client_onboarding(uuid, text)
-- SECURITY DEFINER is required: ledger/signals/user_bonus_rewards have no client writes.
-- ---------------------------------------------------------------------------
create or replace function public.complete_client_onboarding(
  p_client_id uuid,
  p_device_fingerprint text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  p public.profiles;
  v_amount int := 30;
  v_inserted boolean;
  v_balance int;
  v_completed_at timestamptz;
begin
  if caller is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if caller is distinct from p_client_id then
    raise exception 'FORBIDDEN';
  end if;

  select * into p
  from public.profiles
  where id = p_client_id
  for update;

  if p.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if p.role is distinct from 'client' then
    raise exception 'CLIENT_ONLY';
  end if;

  v_balance := coalesce(p.credits, 0);
  v_completed_at := p.client_onboarding_completed_at;

  if v_completed_at is not null then
    return jsonb_build_object(
      'granted', false,
      'reason', 'ALREADY_COMPLETED',
      'amount', 0,
      'balance_after', v_balance,
      'completed_at', v_completed_at
    );
  end if;

  if exists (
    select 1
    from public.user_bonus_rewards ubr
    where ubr.user_id = p_client_id
      and ubr.reward_type = 'CLIENT_WELCOME_30'
  ) then
    update public.profiles
    set
      client_onboarding_completed_at = coalesce(client_onboarding_completed_at, now()),
      updated_at = now()
    where id = p_client_id
    returning client_onboarding_completed_at, credits
    into v_completed_at, v_balance;

    return jsonb_build_object(
      'granted', false,
      'reason', 'ALREADY_GRANTED',
      'amount', 0,
      'balance_after', v_balance,
      'completed_at', v_completed_at
    );
  end if;

  insert into public.user_bonus_rewards (user_id, reward_type, amount)
  values (p_client_id, 'CLIENT_WELCOME_30', v_amount)
  on conflict (user_id, reward_type) do nothing
  returning true into v_inserted;

  if not coalesce(v_inserted, false) then
    update public.profiles
    set
      client_onboarding_completed_at = coalesce(client_onboarding_completed_at, now()),
      updated_at = now()
    where id = p_client_id
    returning client_onboarding_completed_at, credits
    into v_completed_at, v_balance;

    return jsonb_build_object(
      'granted', false,
      'reason', 'ALREADY_GRANTED',
      'amount', 0,
      'balance_after', v_balance,
      'completed_at', v_completed_at
    );
  end if;

  update public.profiles
  set
    credits = coalesce(credits, 0) + v_amount,
    client_onboarding_completed_at = now(),
    updated_at = now()
  where id = p_client_id
  returning credits, client_onboarding_completed_at
  into v_balance, v_completed_at;

  insert into public.client_credit_ledger (
    client_id,
    type,
    amount,
    balance_after,
    reward_type,
    description,
    metadata
  )
  values (
    p_client_id,
    'FREE_BONUS',
    v_amount,
    v_balance,
    'CLIENT_WELCOME_30',
    'LinkCredits — CLIENT_WELCOME_30',
    jsonb_build_object('source', 'client_onboarding')
  );

  if nullif(trim(coalesce(p_device_fingerprint, '')), '') is not null then
    insert into public.client_onboarding_signals (user_id, device_fingerprint)
    values (p_client_id, left(trim(p_device_fingerprint), 512));
  end if;

  return jsonb_build_object(
    'granted', true,
    'reward_type', 'CLIENT_WELCOME_30',
    'amount', v_amount,
    'balance_after', v_balance,
    'completed_at', v_completed_at
  );
end;
$$;

revoke all on function public.complete_client_onboarding(uuid, text) from public;
revoke all on function public.complete_client_onboarding(uuid, text) from anon;
revoke all on function public.complete_client_onboarding(uuid, text) from authenticated;
grant execute on function public.complete_client_onboarding(uuid, text) to authenticated;
