-- Apply/repair admin dashboard RPCs for FLUX Admin (server-side service_role only).
-- Safe to run multiple times (CREATE OR REPLACE).
-- Compare pg_get_functiondef output with audit_admin_dashboard_prod.sql before applying in production.

-- ---------------------------------------------------------------------------
-- admin_dashboard_summary — platform activity aggregates (no PII)
-- Mirrors supabase/migrations/0051_admin_dashboard_summary_rpc.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- admin_dashboard_financial_summary — CAD revenue + LinkCredits economy
-- Authoritative revenue: payment_events.status = 'paid' (confirmed Stripe purchases)
-- Never derives CAD from credit consumption.
-- ---------------------------------------------------------------------------
create or replace function public.admin_dashboard_financial_summary(p_time_range text default 'all')
returns table (
  revenue_cad_cents bigint,
  purchase_count bigint,
  lc_sold bigint,
  lc_consumed bigint,
  lc_refunded bigint,
  lc_granted bigint,
  lc_in_circulation bigint,
  net_credit_burn bigint,
  time_range text
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select
      case lower(coalesce(p_time_range, 'all'))
        when 'today' then date_trunc('day', now())
        when '7d' then now() - interval '7 days'
        when '30d' then now() - interval '30 days'
        else null::timestamptz
      end as since_ts,
      lower(coalesce(p_time_range, 'all')) as range_key
  ),
  paid_purchases as (
    select pe.amount_cents, pe.credits, pe.created_at
    from public.payment_events as pe
    cross join bounds as b
    where pe.status = 'paid'
      and upper(coalesce(pe.currency, 'CAD')) = 'CAD'
      and (b.since_ts is null or pe.created_at >= b.since_ts)
  ),
  credit_rows as (
    select ct.type, ct.amount, ct.created_at
    from public.credit_transactions as ct
    cross join bounds as b
    where b.since_ts is null or ct.created_at >= b.since_ts
  ),
  purchase_agg as (
    select
      coalesce(sum(amount_cents), 0)::bigint as revenue_cad_cents,
      count(*)::bigint as purchase_count,
      coalesce(sum(credits), 0)::bigint as lc_sold
    from paid_purchases
  ),
  credit_agg as (
    select
      coalesce(sum(abs(amount)), 0)::bigint as lc_consumed
    from credit_rows
    where type in ('APPLICATION_INTEREST', 'APPLICATION_SELECTED', 'OPPORTUNITY_UNLOCK')
      and amount < 0
  ),
  refund_agg as (
    select coalesce(sum(amount), 0)::bigint as lc_refunded
    from credit_rows
    where type in ('REFUND', 'VIP_EXCLUSIVE_PARTIAL_REFUND', 'VIP_APPLICATION_REJECTED_REFUND')
      and amount > 0
  ),
  grant_agg as (
    select coalesce(sum(amount), 0)::bigint as lc_granted
    from credit_rows
    where type in ('FREE_BONUS', 'ADMIN_ADJUSTMENT')
      and amount > 0
  ),
  circulation_agg as (
    select coalesce(sum(balance), 0)::bigint as lc_in_circulation
    from public.credit_wallets
  )
  select
    pa.revenue_cad_cents,
    pa.purchase_count,
    pa.lc_sold,
    ca.lc_consumed,
    ra.lc_refunded,
    ga.lc_granted,
    circ.lc_in_circulation,
    greatest(ca.lc_consumed - ra.lc_refunded, 0)::bigint as net_credit_burn,
    b.range_key as time_range
  from purchase_agg as pa
  cross join credit_agg as ca
  cross join refund_agg as ra
  cross join grant_agg as ga
  cross join circulation_agg as circ
  cross join bounds as b;
$$;

revoke all on function public.admin_dashboard_financial_summary(text) from public;
revoke all on function public.admin_dashboard_financial_summary(text) from anon;
revoke all on function public.admin_dashboard_financial_summary(text) from authenticated;
grant execute on function public.admin_dashboard_financial_summary(text) to service_role;
