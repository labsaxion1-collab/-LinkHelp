-- LinkHelp — remove demo/fake marketplace data; keep auth.users + matching profiles.
-- Run in Supabase SQL Editor after 0001–0007.
-- Preserves: all rows in auth.users and public.profiles where profiles.id = auth.users.id

-- ---------------------------------------------------------------------------
-- Transactional / demo content (full wipe — real users keep profile rows only)
-- ---------------------------------------------------------------------------
delete from public.messages;
delete from public.conversations;
delete from public.applications;
delete from public.upcoming_jobs;
delete from public.notifications;
delete from public.reviews;
delete from public.requests;

-- Portfolio & skills for profiles that are not real auth users
delete from public.helper_portfolio_items
where helper_id not in (select id from auth.users);

delete from public.helper_skills
where helper_id not in (select id from auth.users);

-- Orphan / seed profiles (no Supabase Auth account)
delete from public.profiles
where id not in (select id from auth.users);
