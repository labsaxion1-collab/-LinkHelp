-- Helper proposal amount on applications + accepted amount on requests
alter table public.applications
  add column if not exists proposed_amount numeric;

comment on column public.applications.proposed_amount is 'Helper proposed price (CAD) when applying to a bounded-budget request';

alter table public.requests
  add column if not exists accepted_amount numeric;

comment on column public.requests.accepted_amount is 'Client-accepted helper proposal amount for the active hire';
