-- Cooldown applies only after the helper confirms residence coordinates (helper_base_lat/lng).
-- Text-only drafts must not start or extend the 30-day lock.

-- Legacy fix: profiles with address text but no coordinates were backfilled into cooldown by 0033.
update public.profiles
set helper_base_updated_at = null
where role = 'helper'
  and helper_base_updated_at is not null
  and (
    helper_base_lat is null
    or helper_base_lng is null
    or helper_base_lat < -90
    or helper_base_lat > 90
    or helper_base_lng < -180
    or helper_base_lng > 180
  );

create or replace function public.update_helper_base_address(
  p_address text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_lat double precision,
  p_lng double precision
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.profiles;
  v_unlock boolean;
  v_changed boolean;
  v_confirmed boolean;
  v_incoming_confirmed boolean;
  v_text_changed boolean;
  v_coords_changed boolean;
  v_coord_eps constant double precision := 0.0001;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if (p_lat is null) <> (p_lng is null) then
    raise exception 'HELPER_BASE_ADDRESS_INVALID_COORDS';
  end if;

  if p_lat is not null then
    if p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
      raise exception 'HELPER_BASE_ADDRESS_INVALID_COORDS';
    end if;
  end if;

  select * into row from public.profiles where id = auth.uid();
  if row.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if row.role is distinct from 'helper' then
    raise exception 'NOT_HELPER';
  end if;

  v_unlock := coalesce(row.helper_base_change_unlocked_by_admin, false);

  v_confirmed := row.helper_base_lat is not null
    and row.helper_base_lng is not null
    and row.helper_base_lat between -90 and 90
    and row.helper_base_lng between -180 and 180;

  v_incoming_confirmed := p_lat is not null and p_lng is not null;

  v_text_changed := coalesce(nullif(trim(p_address), ''), '') is distinct from coalesce(trim(row.helper_base_address), '')
    or coalesce(nullif(trim(p_city), ''), '') is distinct from coalesce(trim(row.helper_base_city), '')
    or coalesce(nullif(trim(p_province), ''), '') is distinct from coalesce(trim(row.helper_base_province), '')
    or coalesce(nullif(trim(p_postal_code), ''), '') is distinct from coalesce(trim(row.helper_base_postal_code), '');

  v_coords_changed := not (
    (p_lat is null and row.helper_base_lat is null and p_lng is null and row.helper_base_lng is null)
    or (
      p_lat is not null
      and row.helper_base_lat is not null
      and p_lng is not null
      and row.helper_base_lng is not null
      and abs(p_lat - row.helper_base_lat) < v_coord_eps
      and abs(p_lng - row.helper_base_lng) < v_coord_eps
    )
  );

  v_changed := v_text_changed or v_coords_changed;

  if not v_changed then
    return row;
  end if;

  -- Unconfirmed residence: allow text drafts and first GPS confirmation regardless of legacy timestamps.
  if not v_confirmed then
    perform set_config('linkhelp.allow_helper_base_update', '1', true);

    update public.profiles
    set
      helper_base_address = nullif(trim(p_address), ''),
      helper_base_city = nullif(trim(p_city), ''),
      helper_base_province = nullif(trim(p_province), ''),
      helper_base_postal_code = nullif(trim(p_postal_code), ''),
      helper_base_lat = p_lat,
      helper_base_lng = p_lng,
      helper_base_updated_at = case
        when v_incoming_confirmed then now()
        else null
      end,
      helper_base_change_unlocked_by_admin = case when v_unlock then false else helper_base_change_unlocked_by_admin end
    where id = auth.uid()
    returning * into row;

    return row;
  end if;

  -- Confirmed residence: enforce 30-day lock on real changes only.
  if not v_unlock then
    if row.helper_base_updated_at is not null
       and row.helper_base_updated_at > (now() - interval '30 days')
       and v_changed then
      raise exception 'HELPER_BASE_ADDRESS_LOCKED';
    end if;
  end if;

  perform set_config('linkhelp.allow_helper_base_update', '1', true);

  update public.profiles
  set
    helper_base_address = nullif(trim(p_address), ''),
    helper_base_city = nullif(trim(p_city), ''),
    helper_base_province = nullif(trim(p_province), ''),
    helper_base_postal_code = nullif(trim(p_postal_code), ''),
    helper_base_lat = p_lat,
    helper_base_lng = p_lng,
    helper_base_updated_at = case
      when v_changed then now()
      else helper_base_updated_at
    end,
    helper_base_change_unlocked_by_admin = case when v_unlock then false else helper_base_change_unlocked_by_admin end
  where id = auth.uid()
  returning * into row;

  return row;
end;
$$;

grant execute on function public.update_helper_base_address(text, text, text, text, double precision, double precision) to authenticated;

comment on function public.update_helper_base_address(text, text, text, text, double precision, double precision) is
  'Updates helper home base. Cooldown starts only after first valid GPS confirmation; text-only drafts do not lock.';
