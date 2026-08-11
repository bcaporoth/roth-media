-- Same-Night Premiere: run once in the Supabase SQL editor.

alter table public.galleries
  add column if not exists premiere_enabled boolean not null default false,
  add column if not exists reveal_at timestamptz;

create table if not exists public.premiere_leads (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  name text not null default '',
  email text not null,
  reveal_sent_at timestamptz,
  scheduled_email_id text,
  created_at timestamptz not null default now(),
  unique (gallery_id, email)
);

-- Service-role access only (no policies on purpose).
alter table public.premiere_leads enable row level security;
