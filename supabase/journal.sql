-- Project journal: Brandon's dated notes while a documentary takes shape —
-- what happened today, who said what, how the story's changing. Pin the
-- entries that are the working outline. Run once in the Supabase SQL editor.
create table if not exists public.project_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  body text not null,
  pinned boolean not null default false,
  entry_date date not null default (now() at time zone 'America/New_York')::date
);
create index if not exists project_entries_project_idx on public.project_entries(project_id, pinned desc, entry_date desc, created_at desc);
alter table public.project_entries enable row level security;
