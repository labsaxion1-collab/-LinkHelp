-- =============================================================================
-- P4.0.2 staging overlay — 20a_client_scale_grants.sql
-- Origem: apply_normalize_client_profile_credits.sql (sem UPDATE ×1000)
-- =============================================================================

create or replace function public.ensure_client_signup_credits(p_client_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  bal int;
begin
  if auth.uid() is not null
    and auth.uid() <> p_client_id
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  select credits into bal
  from public.profiles
  where id = p_client_id and role = 'client';

  return coalesce(bal, 0);
end;
$$;

grant execute on function public.ensure_client_signup_credits(uuid) to authenticated;
