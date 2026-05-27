-- Helper signup: 20 LC once. Profile-completion rewards disabled (0 LC).

create or replace function public.grant_user_reward(
  p_user_id uuid,
  p_reward_type text,
  p_amount int default null,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_amount int;
  v_desc text;
  v_inserted boolean;
  v_balance int;
  w public.credit_wallets;
begin
  if auth.uid() is not null
    and auth.uid() <> p_user_id
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  if not public.is_valid_reward_type(p_reward_type) then
    raise exception 'INVALID_REWARD_TYPE';
  end if;

  v_amount := coalesce(p_amount, case p_reward_type
    when 'SIGNUP_CLIENT' then 0
    when 'SIGNUP_HELPER' then 20
    when 'PROFILE_PHOTO' then 0
    when 'PROFILE_DESCRIPTION' then 0
    when 'PROFILE_SKILLS' then 0
    when 'PHONE_VERIFIED' then 0
    when 'FIRST_REQUEST_CREATED' then 5
    when 'FIRST_APPLICATION_SENT' then 5
    when 'FIRST_REVIEW_RECEIVED' then 3
    when 'REFERRAL_COMPLETED' then 10
    else null
  end);

  if v_amount is null or v_amount <= 0 then
    return jsonb_build_object('granted', false, 'reward_type', p_reward_type, 'reason', 'ZERO_AMOUNT');
  end if;

  v_desc := coalesce(nullif(trim(p_description), ''), 'LinkCredits - ' || p_reward_type);

  insert into public.user_bonus_rewards (user_id, reward_type, amount)
  values (p_user_id, p_reward_type, v_amount)
  on conflict (user_id, reward_type) do nothing
  returning true into v_inserted;

  if not coalesce(v_inserted, false) then
    return jsonb_build_object(
      'granted', false,
      'reward_type', p_reward_type,
      'reason', 'ALREADY_GRANTED'
    );
  end if;

  select role into v_role from public.profiles where id = p_user_id;
  if v_role is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_role = 'helper' then
    insert into public.credit_wallets (helper_id)
    values (p_user_id)
    on conflict (helper_id) do nothing;

    w := public.add_credits(p_user_id, v_amount, 'FREE_BONUS', v_desc);
    v_balance := w.balance;
  else
    update public.profiles
    set credits = credits + v_amount, updated_at = now()
    where id = p_user_id
    returning credits into v_balance;
  end if;

  return jsonb_build_object(
    'granted', true,
    'reward_type', p_reward_type,
    'amount', v_amount,
    'balance_after', v_balance
  );
end;
$$;
