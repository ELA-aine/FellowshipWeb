-- Weekly poster for the Welcome page. Run once in Supabase > SQL Editor (after setup.sql).
-- Safe to re-run.
create table if not exists public.posters (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  url text not null,
  week_of date not null,            -- the Friday this poster is for
  created_at timestamptz not null default now()
);

alter table public.posters enable row level security;

drop policy if exists "posters read" on public.posters;
create policy "posters read" on public.posters for select using (true);

drop policy if exists "posters admin write" on public.posters;
create policy "posters admin write" on public.posters for all
  using (public.is_admin()) with check (public.is_admin());
