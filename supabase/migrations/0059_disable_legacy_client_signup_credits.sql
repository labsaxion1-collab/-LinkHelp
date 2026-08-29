-- Disable the leftover SIGNUP_CLIENT 12000 grant in ensure_client_signup_credits (0015).
-- New clients keep profiles.credits default (0). Welcome LC is only CLIENT_WELCOME_30 (0058).
-- Does not replace grant_user_reward, does not backfill, and does not remove existing rewards.

create or replace function public.ensure_client_signup_credits(p_client_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  bal int;
begin
  -- auth.users trigger runs with auth.uid() IS NULL. A session may only read its own row.
  if auth.uid() is not null
    and auth.uid() is distinct from p_client_id then
    raise exception 'FORBIDDEN';
  end if;

  select p.credits into bal
  from public.profiles p
  where p.id = p_client_id
    and p.role = 'client';

  return coalesce(bal, 0);
end;
$$;

-- Trigger linkhelp_handle_new_user is SECURITY DEFINER (owner execute). Clients must not RPC this.
revoke all on function public.ensure_client_signup_credits(uuid) from public;
revoke all on function public.ensure_client_signup_credits(uuid) from anon;
revoke all on function public.ensure_client_signup_credits(uuid) from authenticated;
