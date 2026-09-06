-- Harden EXECUTE grants on SECURITY DEFINER RPCs introduced/replaced by:
--   20260831014124_helper_base_initial_gps_confirmation.sql
--   20260904033022_service_completion_workflow.sql
--
-- Goal: remove PUBLIC / anon execute paths; keep authenticated app access;
-- preserve owner/admin roles (postgres, service_role) untouched.
-- Idempotent revoke/grant only — no function body or business-logic changes.

-- update_helper_base_address(text, text, text, text, double precision, double precision)
revoke execute on function public.update_helper_base_address(text, text, text, text, double precision, double precision) from public;
revoke execute on function public.update_helper_base_address(text, text, text, text, double precision, double precision) from anon;
grant execute on function public.update_helper_base_address(text, text, text, text, double precision, double precision) to authenticated;

-- helper_mark_service_awaiting_confirmation(uuid)
revoke execute on function public.helper_mark_service_awaiting_confirmation(uuid) from public;
revoke execute on function public.helper_mark_service_awaiting_confirmation(uuid) from anon;
grant execute on function public.helper_mark_service_awaiting_confirmation(uuid) to authenticated;

-- client_confirm_service_completed(uuid)
revoke execute on function public.client_confirm_service_completed(uuid) from public;
revoke execute on function public.client_confirm_service_completed(uuid) from anon;
grant execute on function public.client_confirm_service_completed(uuid) to authenticated;

-- finalize_service_completion(uuid)
revoke execute on function public.finalize_service_completion(uuid) from public;
revoke execute on function public.finalize_service_completion(uuid) from anon;
grant execute on function public.finalize_service_completion(uuid) to authenticated;
