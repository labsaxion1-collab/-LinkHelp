-- =============================================================================
-- P4.0.3b — verify_staging_baseline_readonly.sql (read-only)
-- =============================================================================

select 'col_service_mode' as check_name,
  exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='requests' and column_name='service_mode'
  ) as ok;

select 'col_app_lead_total' as check_name,
  exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='applications' and column_name='lead_total_lc'
  ) as ok;

select 'table_service_mode_policies' as check_name,
  to_regclass('public.lead_subcategory_service_mode_policies') is not null as ok;

select 'service_mode_policies_seeded_count' as check_name,
  (select count(*)::int = 78 from public.lead_subcategory_service_mode_policies) as ok,
  (select count(*)::int from public.lead_subcategory_service_mode_policies) as actual_count;

select 'policy_translation_immigration_both' as check_name,
  exists (
    select 1 from public.lead_subcategory_service_mode_policies
    where category_id = 'translation' and subcategory_id = 'immigration' and policy = 'both'
  ) as ok;

select 'policy_translation_document_remote' as check_name,
  exists (
    select 1 from public.lead_subcategory_service_mode_policies
    where category_id = 'translation' and subcategory_id = 'document' and policy = 'remote_only'
  ) as ok;

select 'policy_tech_tv_in_person' as check_name,
  exists (
    select 1 from public.lead_subcategory_service_mode_policies
    where category_id = 'tech' and subcategory_id = 'tv' and policy = 'in_person_only'
  ) as ok;

select 'policy_no_education_category' as check_name,
  not exists (
    select 1 from public.lead_subcategory_service_mode_policies
    where category_id ilike '%educat%' or category_id = 'education'
  ) as ok;

select 'one_active_pricing_version' as check_name,
  (select count(*)::int = 1 from public.lead_pricing_versions where is_active and region_code is null) as ok;

select 'fn_helper_compute_lead_quote' as check_name,
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='helper_compute_lead_quote'
  ) as ok;

select 'fn_compute_total_takes_helper' as check_name,
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='helper_compute_lead_estimated_total_lc'
      and pg_get_function_identity_arguments(p.oid) like '%uuid, uuid%'
  ) as ok;

select 'no_legacy_compute_numeric_distance' as check_name,
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='helper_compute_lead_estimated_total_lc'
      and pg_get_function_identity_arguments(p.oid) like '%numeric%'
  ) as ok;

select 'submit_uses_compute_quote' as check_name,
  (
    select pg_get_functiondef(p.oid) ~ 'helper_compute_lead_quote'
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='helper_submit_application'
      and pg_get_function_identity_arguments(p.oid) like '%boolean%'
    limit 1
  ) as ok;

select 'submit_stores_snapshot' as check_name,
  (
    select pg_get_functiondef(p.oid) ~ 'lead_total_lc'
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='helper_submit_application'
      and pg_get_function_identity_arguments(p.oid) like '%boolean%'
    limit 1
  ) as ok;

select 'hire_uses_snapshot' as check_name,
  (
    select pg_get_functiondef(p.oid) ~ 'LEAD_SNAPSHOT_MISSING'
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='client_accept_proposal'
    limit 1
  ) as ok;

select 'hire_vip_zero' as check_name,
  (
    select pg_get_functiondef(p.oid) ~ 'VIP_HIRE_MUST_BE_ZERO'
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='client_accept_proposal'
    limit 1
  ) as ok;

select 'reject_ceil' as check_name,
  (
    select pg_get_functiondef(p.oid) ~* 'ceil\(debit_amount'
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='process_vip_application_rejected_refund'
    limit 1
  ) as ok;

select 'publish_validates_mode' as check_name,
  (
    select pg_get_functiondef(p.oid) ~ 'lead_validate_service_mode'
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='client_publish_request'
    limit 1
  ) as ok;

select 'no_fe_distance_in_compute' as check_name,
  (
    select pg_get_functiondef(p.oid) !~ 'p_distance_km'
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='helper_compute_lead_quote'
    limit 1
  ) as ok;

-- P4.0.5 concurrency
select 'debit_wallet_for_update' as check_name,
  (
    select pg_get_functiondef(p.oid) ~* 'credit_wallets[\s\S]*for update'
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='helper_debit_application_interest'
    limit 1
  ) as ok;

select 'submit_locks_request' as check_name,
  (
    select pg_get_functiondef(p.oid) ~* 'from public\.requests[\s\S]*for update'
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='helper_submit_application'
      and pg_get_function_identity_arguments(p.oid) like '%boolean%'
    limit 1
  ) as ok;

select 'interest_uidx' as check_name,
  exists (
    select 1 from pg_indexes
    where schemaname='public'
      and indexname='credit_transactions_helper_request_interest_uidx'
  ) as ok;

select 'vip_active_uidx' as check_name,
  exists (
    select 1 from pg_indexes
    where schemaname='public'
      and indexname='applications_one_active_exclusive_uidx'
  ) as ok;

select 'vip_partial_refund_uidx' as check_name,
  exists (
    select 1 from pg_indexes
    where schemaname='public'
      and indexname='credit_transactions_vip_partial_refund_uidx'
  ) as ok;

select 'vip_rejected_refund_uidx' as check_name,
  exists (
    select 1 from pg_indexes
    where schemaname='public'
      and indexname='credit_transactions_vip_rejected_refund_uidx'
  ) as ok;

-- Pack 60 completion RPCs
select 'fn_helper_mark_service_awaiting' as check_name,
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='helper_mark_service_awaiting_confirmation'
      and pg_get_function_identity_arguments(p.oid) = 'uuid'
  ) as ok;

select 'fn_client_confirm_service' as check_name,
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='client_confirm_service_completed'
      and pg_get_function_identity_arguments(p.oid) = 'uuid'
  ) as ok;

select 'fn_finalize_service_completion' as check_name,
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='finalize_service_completion'
      and pg_get_function_identity_arguments(p.oid) = 'uuid'
  ) as ok;

select 'mark_idempotent' as check_name,
  (
    select pg_get_functiondef(p.oid) ~ 'alreadyMarked'
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='helper_mark_service_awaiting_confirmation'
    limit 1
  ) as ok;

select 'finalize_idempotent' as check_name,
  (
    select pg_get_functiondef(p.oid) ~ 'alreadyCompleted'
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='finalize_service_completion'
    limit 1
  ) as ok;

select 'pack60_grant_mark' as check_name,
  has_function_privilege('authenticated', 'public.helper_mark_service_awaiting_confirmation(uuid)', 'execute') as ok;

select 'pack60_grant_confirm' as check_name,
  has_function_privilege('authenticated', 'public.client_confirm_service_completed(uuid)', 'execute') as ok;

select 'pack60_grant_finalize' as check_name,
  has_function_privilege('authenticated', 'public.finalize_service_completion(uuid)', 'execute') as ok;

select 'col_completion_requested_at' as check_name,
  exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='upcoming_jobs'
      and column_name='completion_requested_at'
  ) as ok;
