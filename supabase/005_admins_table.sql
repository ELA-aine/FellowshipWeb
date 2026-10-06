-- Migration for an existing project: move the admin check from a hard-coded email to a table.
-- Run in Supabase > SQL Editor. Then add yourself (separate query; do NOT commit this line):
--   insert into public.admins (email) values ('your-admin-email@example.com');
-- All existing policies keep working because they call public.is_admin() by name.
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security;   -- no policies: unreadable via the API

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;
