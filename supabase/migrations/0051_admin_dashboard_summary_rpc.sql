-- Aggregate-only admin dashboard payload. Called server-side with service_role.
create or replace function public.admin_dashboard_summary()
returns table (
  total_requests bigint,
  open_requests bigint,
  in_progress_requests bigint,
  total_applications bigint,
  pending_applications bigint,
  hired_applications bigint,
  hire_rate integer,
  categories jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with request_base as materialized (
    select
      r.id,
      r.category,
      r.status,
      coalesce(r.budget_max, r.budget_amount, r.budget_min) as selected_budget
    from public.requests as r
  ),
  application_base as materialized (
    select a.request_id, a.status
    from public.applications as a
  ),
  request_totals as (
    select
      count(*)::bigint as total_requests,
      count(*) filter (where status = 'open')::bigint as open_requests,
      count(*) filter (where status = 'in_progress')::bigint as in_progress_requests
    from request_base
  ),
  application_totals as (
    select
      count(*)::bigint as total_applications,
      count(*) filter (where status in ('pending', 'viewed'))::bigint as pending_applications,
      count(*) filter (where status = 'accepted')::bigint as hired_applications
    from application_base
  ),
  request_categories as (
    select
      category,
      count(*) filter (where status = 'open')::bigint as open_requests,
      round(avg(selected_budget) filter (where selected_budget > 0))::numeric as average_budget
    from request_base
    where category is not null and category <> ''
    group by category
  ),
  application_categories as (
    select
      r.category,
      count(a.request_id)::bigint as applications,
      count(a.request_id) filter (where a.status = 'accepted')::bigint as hired_applications
    from request_base as r
    left join application_base as a on a.request_id = r.id
    where r.category is not null and r.category <> ''
    group by r.category
  ),
  category_payload as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'category', rc.category,
          'open_requests', rc.open_requests,
          'applications', coalesce(ac.applications, 0),
          'hired_applications', coalesce(ac.hired_applications, 0),
          'hire_rate', case
            when coalesce(ac.applications, 0) = 0 then 0
            else round(ac.hired_applications * 100.0 / ac.applications)::integer
          end,
          'average_budget', rc.average_budget
        )
        order by rc.category
      ),
      '[]'::jsonb
    ) as categories
    from request_categories as rc
    left join application_categories as ac on ac.category = rc.category
  )
  select
    rt.total_requests,
    rt.open_requests,
    rt.in_progress_requests,
    at.total_applications,
    at.pending_applications,
    at.hired_applications,
    case
      when at.total_applications = 0 then 0
      else round(at.hired_applications * 100.0 / at.total_applications)::integer
    end as hire_rate,
    cp.categories
  from request_totals as rt
  cross join application_totals as at
  cross join category_payload as cp;
$$;

revoke all on function public.admin_dashboard_summary() from public;
revoke all on function public.admin_dashboard_summary() from anon;
revoke all on function public.admin_dashboard_summary() from authenticated;
grant execute on function public.admin_dashboard_summary() to service_role;
