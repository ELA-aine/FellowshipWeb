-- Admin-uploadable photo slots (e.g. the photo on the About page). Run once in Supabase > SQL Editor.
-- Safe to re-run.
create table if not exists public.site_photos (
  key text primary key,            -- matches data-photo="..." in the HTML
  url text not null,
  path text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_photos enable row level security;

drop policy if exists "site_photos read" on public.site_photos;
create policy "site_photos read" on public.site_photos for select using (true);

drop policy if exists "site_photos admin write" on public.site_photos;
create policy "site_photos admin write" on public.site_photos for all
  using (public.is_admin()) with check (public.is_admin());
