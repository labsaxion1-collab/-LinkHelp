-- Integration checks for opportunity unlock refunds (run in staging/dev with service_role).
-- 1) Create expired pending unlock without client reply → run process_expired_unlock_refunds → balance increases.
-- 2) Run job again → processedCount = 0 (idempotent).
-- 3) Responded unlock past deadline → never refunded.

-- Example manual probe (replace UUIDs):
-- select public.process_expired_unlock_refunds();
-- select public.admin_force_unlock_refund('<unlock_id>');

select
  ou.id,
  ou.status,
  ou.refund_status,
  ou.response_deadline,
  ou.credits_spent,
  cw.balance
from public.opportunity_unlocks ou
join public.credit_wallets cw on cw.helper_id = ou.helper_id
where ou.refund_status = 'none'
order by ou.response_deadline asc
limit 20;
