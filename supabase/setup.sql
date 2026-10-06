-- Joshua Fellowship: database setup for Supabase.
-- Run once: Supabase dashboard > SQL Editor > New query > paste > Run.
-- To add another admin later, insert their email into public.admins (SQL editor only).

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  category text not null default 'Fellowship activity',
  start_at timestamptz not null,
  end_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  url text not null,
  caption text,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  provider text,
  url text not null,
  cover_url text,
  created_at timestamptz not null default now()
);

-- Admin emails live in this table, NOT in the code. RLS is on with no policies, so the
-- table cannot be read or changed through the public API (only in the SQL editor).
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

-- AFTER running this file, add yourself once in the SQL editor (do NOT save this line in the repo):
--   insert into public.admins (email) values ('your-admin-email@example.com');

alter table public.events enable row level security;
alter table public.photos enable row level security;
alter table public.albums enable row level security;

-- Everyone can read; only admins can change.
create policy "events read" on public.events for select using (true);
create policy "events admin write" on public.events for all using (public.is_admin()) with check (public.is_admin());

create policy "photos read" on public.photos for select using (true);
create policy "photos admin write" on public.photos for all using (public.is_admin()) with check (public.is_admin());

create policy "albums read" on public.albums for select using (true);
create policy "albums admin write" on public.albums for all using (public.is_admin()) with check (public.is_admin());

-- Photo storage bucket (public read, admin-only upload/delete).
insert into storage.buckets (id, name, public) values ('gallery', 'gallery', true)
on conflict (id) do nothing;

create policy "gallery read" on storage.objects for select using (bucket_id = 'gallery');
create policy "gallery admin insert" on storage.objects for insert with check (bucket_id = 'gallery' and public.is_admin());
create policy "gallery admin update" on storage.objects for update using (bucket_id = 'gallery' and public.is_admin());
create policy "gallery admin delete" on storage.objects for delete using (bucket_id = 'gallery' and public.is_admin());
