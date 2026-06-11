-- Profile & Account Settings enhancements
-- Adds address_updated_at to track personal address edit history (30-day lock).
-- spoken_languages already exists (migration 0018).
-- This script is idempotent.

-- 1. address_updated_at: when the user last changed their personal city/address in Settings
alter table public.profiles
  add column if not exists address_updated_at timestamptz null;

comment on column public.profiles.address_updated_at
  is 'Timestamp of last personal address/city change. Used to enforce the 30-day address-change limit.';

-- 2. Verify
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('spoken_languages', 'address_updated_at', 'phone', 'bio')
order by column_name;
