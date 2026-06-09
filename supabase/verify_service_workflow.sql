-- Run after apply_service_workflow.sql

select to_regclass('public.request_review_rewards') as request_review_rewards_table;

select
  p.proname as rpc_name,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'helper_submit_application',
    'helper_mark_service_awaiting_confirmation',
    'client_confirm_service_completed'
  )
order by p.proname;

select tgname as trigger_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'reviews'
  and tgname in ('reviews_client_service_reward', 'reviews_first_reward')
  and not t.tgisinternal;

-- Expected: reviews_client_service_reward present, reviews_first_reward absent

notify pgrst, 'reload schema';
