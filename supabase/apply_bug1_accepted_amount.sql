-- BUG 1 FIX: Add missing accepted_amount column to requests table
-- The RPC client_accept_proposal tries to UPDATE requests.accepted_amount but the column
-- was never applied to this database (migration 0023 was skipped).
-- This script is idempotent (safe to run multiple times).

alter table public.requests
  add column if not exists accepted_amount numeric;

comment on column public.requests.accepted_amount
  is 'Client-accepted helper proposal amount after hiring a helper';

-- Also ensure applications.proposed_amount exists (same migration 0023)
alter table public.applications
  add column if not exists proposed_amount numeric;

comment on column public.applications.proposed_amount
  is 'Amount proposed by the helper when applying for this request';

-- Verify
select
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('requests', 'applications')
  and column_name in ('accepted_amount', 'proposed_amount')
order by table_name, column_name;
