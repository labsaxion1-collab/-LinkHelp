-- LinkHelp — full body of candidatura-related trigger functions (read-only)
-- Run in Supabase Dashboard → SQL Editor.

select
  n.nspname as function_schema,
  p.proname as function_name,
  format_type(p.prorettype, null) as return_type,
  pg_get_functiondef(p.oid) as full_function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where (n.nspname, p.proname) in (
  ('public', 'linkhelp_grant_first_application_reward'),
  ('public', 'set_updated_at'),
  ('private', 'trg_push_on_application_inserted'),
  ('private', 'trg_push_on_application_accepted'),
  ('public', 'trg_application_lead_quality'),
  ('public', 'linkhelp_profiles_ensure_helper_wallet'),
  ('public', 'linkhelp_profiles_signup_credits')
)
order by n.nspname, p.proname;
