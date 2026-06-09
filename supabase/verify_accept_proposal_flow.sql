-- Run after apply_accept_proposal_flow.sql to confirm Production is ready.

-- Diagnose a specific application (replace id if needed):
-- select
--   a.id as application_id,
--   a.helper_id,
--   a.client_id as application_client_id,
--   a.request_id,
--   a.status as application_status,
--   r.client_id as request_client_id,
--   r.title,
--   r.status as request_status
-- from public.applications a
-- join public.requests r on r.id = a.request_id
-- where a.id = '7803912b-499e-4651-8b94-15116e6fcbb1';

select
  to_regclass('public.applications') as applications_table,
  to_regclass('public.upcoming_jobs') as upcoming_jobs_table,
  to_regclass('public.credit_transactions') as credit_transactions_table;

select
  p.proname as rpc_name,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'client_accept_proposal',
    'charge_helper_on_client_hire',
    'helper_debit_application_selected',
    'ensure_conversation',
    'ensure_helper_credit_wallet'
  )
order by p.proname;

-- Expected signatures:
--   client_accept_proposal(p_application_id uuid, p_charge_amount integer)
--   charge_helper_on_client_hire(p_application_id uuid, p_amount integer)
--   helper_debit_application_selected(p_helper_id uuid, p_request_id uuid, p_application_id uuid, p_amount integer)

notify pgrst, 'reload schema';
