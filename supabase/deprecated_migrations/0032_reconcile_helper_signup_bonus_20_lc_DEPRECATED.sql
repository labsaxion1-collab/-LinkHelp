-- Ensure helper signup bonus is reflected in available Link Credits.
-- Target behavior: every helper receives exactly 20 LC as signup bonus once.
-- If an older flow recorded the signup reward but did not credit the wallet,
-- this reconciles only the missing bonus amount.

create or replace function public.reconcile_helper_signup_bonus(p_helper_id uuid)
returns public.credit_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_bonus int := 20;
  v_existing_signup_bonus int := 0;
  v_missing_bonus int := 0;
  v_balance_before int := 0;
  w public.credit_wallets;
  p public.profiles;
begin
  if auth.uid() is not null
    and auth.uid() <> p_helper_id
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  select * into p from public.profiles where id = p_helper_id;
  if p.id is null or p.role <> 'helper' then
    raise exception 'HELPER_ONLY';
  end if;

  insert into public.credit_wallets (helper_id)
  values (p_helper_id)
  on conflict (helper_id) do nothing;

  insert into public.user_bonus_rewards (user_id, reward_type, amount)
  values (p_helper_id, 'SIGNUP_HELPER', v_target_bonus)
  on conflict (user_id, reward_type) do update
  set amount = greatest(public.user_bonus_rewards.amount, excluded.amount);

  select coalesce(sum(greatest(amount, 0)), 0)
  into v_existing_signup_bonus
  from public.credit_transactions
  where helper_id = p_helper_id
    and type = 'FREE_BONUS'
    and (
      description ilike '%boas-vindas%'
      or description ilike '%boas vindas%'
      or description ilike '%inicia%'
      or description ilike '%signup%'
      or description ilike '%sign up%'
      or description ilike '%SIGNUP_HELPER%'
      or description ilike '%inicial de helper%'
    );

  v_missing_bonus := greatest(0, v_target_bonus - v_existing_signup_bonus);

  if v_missing_bonus > 0 then
    select * into w
    from public.credit_wallets
    where helper_id = p_helper_id
    for update;

    v_balance_before := w.balance;

    update public.credit_wallets
    set
      balance = balance + v_missing_bonus,
      total_bonus = total_bonus + v_missing_bonus,
      updated_at = now()
    where helper_id = p_helper_id
    returning * into w;

    insert into public.credit_transactions (
      helper_id,
      type,
      amount,
      balance_before,
      balance_after,
      description
    )
    values (
      p_helper_id,
      'FREE_BONUS',
      v_missing_bonus,
      v_balance_before,
      w.balance,
      'Correcao do bonus inicial de helper'
    );
  else
    select * into w from public.credit_wallets where helper_id = p_helper_id;
  end if;

  return w;
end;
$$;

create or replace function public.ensure_helper_credit_wallet(p_helper_id uuid)
returns public.credit_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.credit_wallets;
  p public.profiles;
begin
  if auth.uid() is not null
    and auth.uid() <> p_helper_id
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  select * into p from public.profiles where id = p_helper_id;
  if p.id is null or p.role <> 'helper' then
    raise exception 'HELPER_ONLY';
  end if;

  insert into public.credit_wallets (helper_id)
  values (p_helper_id)
  on conflict (helper_id) do nothing;

  w := public.reconcile_helper_signup_bonus(p_helper_id);
  return w;
end;
$$;

do $$
declare
  r record;
begin
  for r in
    select id from public.profiles where role = 'helper'
  loop
    perform public.reconcile_helper_signup_bonus(r.id);
  end loop;
end;
$$;

grant execute on function public.reconcile_helper_signup_bonus(uuid) to authenticated;
grant execute on function public.ensure_helper_credit_wallet(uuid) to authenticated;
