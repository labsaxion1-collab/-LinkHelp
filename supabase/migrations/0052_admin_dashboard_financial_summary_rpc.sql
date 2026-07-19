-- Financial aggregates for FLUX Admin dashboard (service_role only).
-- See supabase/apply_admin_dashboard_repair.sql for the full definition.

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
    select coalesce(sum(abs(amount)), 0)::bigint as lc_consumed
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
