-- Public gamification peer profile (minimal exposure).
-- Keeps public.user_gamification private; exposes only fields needed by peer UI.

drop policy if exists "user_gamification_select_peers" on public.user_gamification;

create or replace function public.get_public_gamification_profile(
  target_user_id uuid,
  target_user_type text
)
returns table (
  user_id uuid,
  user_type text,
  hero_key text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_type not in ('client', 'helper') then
    raise exception 'INVALID_USER_TYPE';
  end if;

  return query
  select
    ug.user_id,
    ug.user_type,
    ug.hero_key
  from public.user_gamification ug
  where ug.user_id = target_user_id
    and ug.user_type = target_user_type
  limit 1;
end;
$$;

revoke all on function public.get_public_gamification_profile(uuid, text) from public;
revoke all on function public.get_public_gamification_profile(uuid, text) from anon;
grant execute on function public.get_public_gamification_profile(uuid, text) to authenticated;
