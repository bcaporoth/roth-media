-- Notes with Brandon — one running thread per client, both sides write.
-- Run once in the Supabase SQL editor (safe to re-run). Server-only table.
create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  who text not null check (who in ('brandon', 'client')),
  text text not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz                       -- when the OTHER side opened the thread after this note
);
create index if not exists client_notes_client_idx on public.client_notes (client_id, created_at);
create index if not exists client_notes_unseen_idx on public.client_notes (who, seen_at) where seen_at is null;
alter table public.client_notes enable row level security;
