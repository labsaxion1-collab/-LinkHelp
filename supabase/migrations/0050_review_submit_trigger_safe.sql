-- Review submit: reward triggers must never roll back the review row.
-- Apply in Supabase SQL Editor if review inserts fail with generic errors in prod.
-- Does NOT touch Stripe, credits purchase, or VIP refunds.

-- Legacy trigger can abort inserts when grant_user_reward fails.
drop trigger if exists reviews_first_reward on public.reviews;

create table if not exists public.request_review_rewards (
  request_id uuid not null references public.requests (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  amount int not null check (amount > 0),
  created_at timestamptz not null default now(),
  primary key (request_id, reviewer_id)
);

alter table public.request_review_rewards enable row level security;

drop policy if exists request_review_rewards_select_own on public.request_review_rewards;
create policy request_review_rewards_select_own on public.request_review_rewards
  for select to authenticated
  using (auth.uid() = reviewer_id);

create or replace function public.grant_client_service_review_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_request_status text;
  v_inserted boolean;
  v_reward_amount int := 3;
begin
  begin
    select role into v_role from public.profiles where id = new.reviewer_id;
    if v_role is distinct from 'client' then
      return new;
    end if;

    select status into v_request_status from public.requests where id = new.request_id;
    if v_request_status is distinct from 'completed' then
      return new;
    end if;

    insert into public.request_review_rewards (request_id, reviewer_id, amount)
    values (new.request_id, new.reviewer_id, v_reward_amount)
    on conflict (request_id, reviewer_id) do nothing
    returning true into v_inserted;

    if not coalesce(v_inserted, false) then
      return new;
    end if;

    update public.profiles
    set credits = credits + v_reward_amount, updated_at = now()
    where id = new.reviewer_id;
  exception
    when others then
      raise warning 'grant_client_service_review_reward failed for review %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists reviews_client_service_reward on public.reviews;
create trigger reviews_client_service_reward
  after insert on public.reviews
  for each row
  execute function public.grant_client_service_review_reward();

notify pgrst, 'reload schema';
