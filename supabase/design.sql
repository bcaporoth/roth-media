-- Per-album design (fonts / mood / accent): run once in the Supabase SQL editor.

alter table public.galleries
  add column if not exists design jsonb not null default '{}'::jsonb;
