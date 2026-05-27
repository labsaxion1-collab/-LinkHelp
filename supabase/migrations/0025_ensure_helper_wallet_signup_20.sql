-- Ensure helper wallet grants 20 LC signup bonus once (uses grant_user_reward defaults from 0024).

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

  if not exists (
    select 1 from public.user_bonus_rewards
    where user_id = p_helper_id and reward_type = 'SIGNUP_HELPER'
  ) then
    perform public.grant_user_reward(
      p_helper_id,
      'SIGNUP_HELPER',
      null,
      'Créditos iniciais de boas-vindas'
    );
  end if;

  select * into w from public.credit_wallets where helper_id = p_helper_id;
  return w;
end;
$$;
