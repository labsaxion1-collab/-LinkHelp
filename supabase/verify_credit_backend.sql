-- Run after apply_credit_backend_fix.sql

select
  to_regclass('public.credit_wallets') as credit_wallets,
  to_regclass('public.credit_transactions') as credit_transactions,
  to_regclass('public.credit_packages') as credit_packages,
  to_regclass('public.opportunity_unlocks') as opportunity_unlocks;

select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in ('ensure_helper_credit_wallet', 'get_wallet_balance')
order by proname;

notify pgrst, 'reload schema';
