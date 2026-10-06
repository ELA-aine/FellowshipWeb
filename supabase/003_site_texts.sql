-- Editable page text (admin "Edit text" mode). Run once in Supabase > SQL Editor, after setup.sql.
-- Safe to re-run. A row overrides the default text of one block on the site.
create table if not exists public.site_texts (
  key text primary key,            -- e.g. "home.you-belong-here" (matches data-edit in the HTML)
  en text,                         -- English override (null = keep default)
  zh text,                         -- Chinese override (null = keep default translation)
  updated_at timestamptz not null default now()
);

alter table public.site_texts enable row level security;

drop policy if exists "site_texts read" on public.site_texts;
create policy "site_texts read" on public.site_texts for select using (true);

drop policy if exists "site_texts admin write" on public.site_texts;
create policy "site_texts admin write" on public.site_texts for all
  using (public.is_admin()) with check (public.is_admin());
