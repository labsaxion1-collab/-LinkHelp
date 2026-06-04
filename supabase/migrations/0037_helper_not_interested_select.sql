-- Helpers can read their own market signals (e.g. not_interested) to hide dismissed jobs after refresh.

drop policy if exists request_market_signals_select_service on public.request_market_signals;

create policy request_market_signals_select_own
  on public.request_market_signals
  for select
  to authenticated
  using (helper_id = auth.uid());

create index if not exists request_market_signals_helper_event_idx
  on public.request_market_signals (helper_id, event, created_at desc);
