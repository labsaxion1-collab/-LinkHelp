-- Public reputation dossier aggregates (security definer).
-- Run manually in Supabase SQL Editor when ready.
-- Does NOT touch Stripe, credits purchase, or VIP refunds.

create or replace function public.get_public_reputation_dossier(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_completed int := 0;
  v_published int := 0;
  v_avg numeric := 0;
  v_cancelled int := 0;
  v_review_count int := 0;
  v_member_since timestamptz;
  v_criteria jsonb := '{}'::jsonb;
  v_recent jsonb := '[]'::jsonb;
  v_expected_reviewer_role text;
begin
  select role, created_at into v_role, v_member_since
  from public.profiles
  where id = p_user_id;

  if v_role is null then
    return '{}'::jsonb;
  end if;

  select count(*)::int, coalesce(round(avg(rating)::numeric, 2), 0)
  into v_review_count, v_avg
  from public.reviews
  where target_user_id = p_user_id;

  if v_role = 'helper' then
    v_expected_reviewer_role := 'client';
    select count(*) into v_completed
    from public.applications
    where helper_id = p_user_id and status = 'completed';

    select count(*) into v_cancelled
    from public.applications a
    join public.requests req on req.id = a.request_id
    where a.helper_id = p_user_id and req.status = 'cancelled';
  else
    v_expected_reviewer_role := 'helper';
    select count(*) into v_completed
    from public.requests
    where client_id = p_user_id and status = 'completed';

    select count(*) into v_published
    from public.requests
    where client_id = p_user_id and status <> 'cancelled';

    select count(*) into v_cancelled
    from public.requests
    where client_id = p_user_id and status = 'cancelled';
  end if;

  select coalesce(
    jsonb_object_agg(criterion_key, criterion_avg),
    '{}'::jsonb
  )
  into v_criteria
  from (
    select
      kv.key as criterion_key,
      round(avg((kv.value)::numeric), 1) as criterion_avg
    from public.reviews r
    cross join lateral jsonb_each_text(coalesce(r.criteria_scores, '{}'::jsonb)) kv
    where r.target_user_id = p_user_id
      and (
        r.reviewer_role = v_expected_reviewer_role
        or (
          r.reviewer_role is null
          and exists (
            select 1 from public.profiles p
            where p.id = r.reviewer_id and p.role = v_expected_reviewer_role
          )
        )
      )
    group by kv.key
  ) crit;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'rating', r.rating,
        'comment', nullif(left(trim(coalesce(r.comment, '')), 280), ''),
        'createdAt', r.created_at,
        'reviewerRole', coalesce(r.reviewer_role, v_expected_reviewer_role)
      )
      order by r.created_at desc
    ),
    '[]'::jsonb
  )
  into v_recent
  from (
    select rating, comment, created_at, reviewer_role
    from public.reviews
    where target_user_id = p_user_id
    order by created_at desc
    limit 5
  ) r;

  return jsonb_build_object(
    'role', v_role,
    'completedCount', v_completed,
    'publishedCount', v_published,
    'averageRating', v_avg,
    'cancelledCount', v_cancelled,
    'reviewCount', v_review_count,
    'memberSince', v_member_since,
    'criteriaAverages', v_criteria,
    'recentReviews', v_recent
  );
end;
$$;

grant execute on function public.get_public_reputation_dossier(uuid) to authenticated;

notify pgrst, 'reload schema';
