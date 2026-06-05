-- Run after apply_helper_application_flow.sql to confirm Production is ready.

select
  to_regclass('public.applications') as applications_table,
  to_regclass('public.conversations') as conversations_table,
  to_regclass('public.credit_transactions') as credit_transactions_table;

select proname as rpc_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'helper_submit_application',
    'helper_debit_application_interest',
    'ensure_conversation',
    'ensure_helper_credit_wallet'
  )
order by proname;

-- Optional: reload PostgREST schema cache again
notify pgrst, 'reload schema';
