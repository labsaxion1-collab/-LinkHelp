-- Merge duplicate conversations per request/helper and keep a single thread.

do $$
declare
  grp record;
  keep_id uuid;
  dup_id uuid;
begin
  for grp in
    select request_id, helper_id
    from public.conversations
    group by request_id, helper_id
    having count(*) > 1
  loop
    select id into keep_id
    from public.conversations
    where request_id = grp.request_id and helper_id = grp.helper_id
    order by contact_unlocked desc, created_at asc
    limit 1;

    for dup_id in
      select id from public.conversations
      where request_id = grp.request_id and helper_id = grp.helper_id and id <> keep_id
    loop
      update public.messages set conversation_id = keep_id where conversation_id = dup_id;
      delete from public.conversations where id = dup_id;
    end loop;
  end loop;
end $$;

create unique index if not exists conversations_request_client_helper_idx
  on public.conversations (request_id, client_id, helper_id);

create or replace function public.ensure_conversation(
  p_request_id uuid,
  p_client_id uuid,
  p_helper_id uuid,
  p_contact_unlocked boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conv public.conversations;
begin
  select * into conv from public.conversations
  where request_id = p_request_id and client_id = p_client_id and helper_id = p_helper_id;

  if conv.id is not null then
    if p_contact_unlocked and conv.contact_unlocked is false then
      update public.conversations set contact_unlocked = true where id = conv.id;
    end if;
    return conv.id;
  end if;

  begin
    insert into public.conversations (request_id, client_id, helper_id, contact_unlocked)
    values (p_request_id, p_client_id, p_helper_id, p_contact_unlocked)
    returning id into conv.id;
  exception
    when unique_violation then
      select * into conv from public.conversations
      where request_id = p_request_id and helper_id = p_helper_id;
      if p_contact_unlocked and conv.contact_unlocked is false then
        update public.conversations set contact_unlocked = true where id = conv.id;
      end if;
  end;

  return conv.id;
end;
$$;

grant execute on function public.ensure_conversation(uuid, uuid, uuid, boolean) to authenticated;
