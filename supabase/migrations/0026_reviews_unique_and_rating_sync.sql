-- One review per reviewer per completed request; keep profiles.rating in sync.

create unique index if not exists reviews_request_reviewer_uidx
  on public.reviews (request_id, reviewer_id);

create or replace function public.sync_profile_rating_from_reviews()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid;
begin
  v_target := coalesce(new.target_user_id, old.target_user_id);
  if v_target is null then
    return coalesce(new, old);
  end if;

  update public.profiles p
  set
    rating = sub.avg_rating,
    updated_at = now()
  from (
    select round(avg(r.rating)::numeric, 2) as avg_rating
    from public.reviews r
    where r.target_user_id = v_target
  ) sub
  where p.id = v_target;

  return coalesce(new, old);
end;
$$;

drop trigger if exists reviews_sync_profile_rating on public.reviews;
create trigger reviews_sync_profile_rating
  after insert or update or delete on public.reviews
  for each row
  execute function public.sync_profile_rating_from_reviews();
