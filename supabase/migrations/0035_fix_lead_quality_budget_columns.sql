-- compute_request_lead_quality referenced budget_min/budget_max which may be missing on older DBs.
-- Use budget text + urgency only so cancel/update triggers never fail.

create or replace function public.compute_request_lead_quality(p_request_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score numeric := 48;
  v_interest int := 0;
  v_ignore int := 0;
  v_proposals int := 0;
  v_hired int := 0;
  v_cancelled int := 0;
  v_urgency text;
  v_budget text;
begin
  select
    count(*) filter (
      where coalesce(event, signal) in ('interested', 'interest', 'opened')
    ),
    count(*) filter (
      where coalesce(event, signal) in ('not_interested', 'ignore')
    ),
    count(*) filter (
      where coalesce(event, signal) in ('proposal_sent', 'applied')
    ),
    count(*) filter (where coalesce(event, signal) = 'hired'),
    count(*) filter (where coalesce(event, signal) = 'cancelled')
  into v_interest, v_ignore, v_proposals, v_hired, v_cancelled
  from public.request_market_signals
  where request_id = p_request_id;

  select urgency, budget
  into v_urgency, v_budget
  from public.requests
  where id = p_request_id;

  if v_budget is not null and trim(v_budget) <> '' and v_budget <> '---' then
    v_score := v_score + 12;
  end if;

  if v_urgency = 'high' then
    v_score := v_score + 6;
  end if;

  if v_interest + v_proposals > 0 then
    v_score := v_score + least(18, (v_interest + v_proposals) * 3);
  end if;

  if v_ignore > greatest(v_interest, 1) then
    v_score := v_score - 12;
  end if;

  if v_hired > 0 then
    v_score := v_score + 22;
  end if;

  if v_cancelled > 0 then
    v_score := v_score - 8;
  end if;

  return greatest(0, least(100, round(v_score)));
end;
$$;
