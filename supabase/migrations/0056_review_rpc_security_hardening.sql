-- Harden submit_service_review without changing 0049 (already applied in Production).
-- Idempotent: CREATE OR REPLACE + REVOKE/GRANT on the existing signature.

create or replace function public.submit_service_review(
  p_request_id uuid,
  p_target_user_id uuid,
  p_rating smallint,
  p_comment text default null,
  p_criteria_scores jsonb default null,
  p_reviewer_role text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  req public.requests;
  v_role text;
  existing_id uuid;
  review_id uuid;
  v_is_hired_helper boolean;
begin
  if caller is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_target_user_id is null then
    raise exception 'INVALID_REVIEW_TARGET';
  end if;

  select * into req from public.requests where id = p_request_id;
  if req.id is null then
    raise exception 'NOT_FOUND';
  end if;

  select role into v_role from public.profiles where id = caller;

  select exists (
    select 1
    from public.applications
    where request_id = p_request_id
      and helper_id = caller
      and status in ('accepted', 'completed')
  ) into v_is_hired_helper;

  if caller <> req.client_id and not v_is_hired_helper then
    raise exception 'NOT_ALLOWED';
  end if;

  if caller = req.client_id then
    if p_target_user_id = caller then
      raise exception 'INVALID_REVIEW_TARGET';
    end if;
    if not exists (
      select 1
      from public.applications
      where request_id = p_request_id
        and helper_id = p_target_user_id
        and status in ('accepted', 'completed')
    ) then
      raise exception 'INVALID_REVIEW_TARGET';
    end if;
  else
    if p_target_user_id = caller or p_target_user_id is distinct from req.client_id then
      raise exception 'INVALID_REVIEW_TARGET';
    end if;
  end if;

  if req.status <> 'completed' then
    if v_role = 'helper' and req.status = 'in_progress' then
      if not exists (
        select 1 from public.upcoming_jobs uj
        where uj.request_id = p_request_id
          and uj.helper_id = caller
          and uj.workflow_status in ('completion_requested', 'awaiting_client_confirmation', 'completed', 'auto_completed')
      ) then
        raise exception 'REQUEST_NOT_COMPLETED';
      end if;
    else
      raise exception 'REQUEST_NOT_COMPLETED';
    end if;
  end if;

  if p_reviewer_role is not null and p_reviewer_role <> v_role then
    raise exception 'ROLE_MISMATCH';
  end if;

  if p_rating < 1 or p_rating > 5 then
    raise exception 'INVALID_RATING';
  end if;

  select id into existing_id
  from public.reviews
  where request_id = p_request_id and reviewer_id = caller;

  if existing_id is not null then
    raise exception 'ALREADY_REVIEWED';
  end if;

  insert into public.reviews (
    request_id, reviewer_id, target_user_id, rating, comment, criteria_scores, reviewer_role
  )
  values (
    p_request_id, caller, p_target_user_id, p_rating,
    nullif(trim(p_comment), ''),
    p_criteria_scores,
    coalesce(p_reviewer_role, v_role)
  )
  returning id into review_id;

  begin
    insert into public.notifications (user_id, type, title, description, action_url, read)
    values (
      p_target_user_id,
      'application',
      'Nova avaliação recebida',
      format('Você recebeu uma avaliação de %s/5 em "%s".', p_rating, req.title),
      case when v_role = 'client' then '/helper/dashboard' else '/client/dashboard' end,
      false
    );
  exception when others then
    null;
  end;

  return jsonb_build_object('reviewId', review_id, 'rating', p_rating);
end;
$$;

revoke all on function public.submit_service_review(uuid, uuid, smallint, text, jsonb, text) from public;
revoke all on function public.submit_service_review(uuid, uuid, smallint, text, jsonb, text) from anon;
revoke all on function public.submit_service_review(uuid, uuid, smallint, text, jsonb, text) from authenticated;
grant execute on function public.submit_service_review(uuid, uuid, smallint, text, jsonb, text) to authenticated;
