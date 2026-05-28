alter table public.requests
  add column if not exists preferred_period text;

comment on column public.requests.preferred_period is 'morning | afternoon | evening — period of day when no exact time';

update public.requests
set preferred_period = preferred_time_window
where preferred_period is null
  and preferred_time_window in ('morning', 'afternoon', 'evening');
