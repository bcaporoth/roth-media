-- Shoot days + scripts — run once in the Supabase SQL editor (also safe to re-run).
-- A shoot day is one business client, one date, and a running order of
-- scripts (reels, how-tos, recipes, instruction walk-throughs, promos, photo
-- sets). Brandon edits from Studio; the client edits the same rows from
-- their portal. Server-only tables (service role) — no RLS policies needed.

create table if not exists public.shoot_days (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  shoot_id uuid,                                  -- optional link to shoots.id (the calendar entry)
  title text not null default 'Shoot day',
  date date,
  start_time text not null default '',            -- "09:30" (24h)
  location text not null default '',
  notes text not null default '',                 -- the day's plain notes, both sides edit
  status text not null default 'planning' check (status in ('planning', 'locked', 'filmed', 'delivered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shoot_days_client_idx on public.shoot_days (client_id, date desc);
alter table public.shoot_days enable row level security;

create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.shoot_days (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  position integer not null default 0,
  kind text not null default 'reel' check (kind in ('reel', 'howto', 'recipe', 'manual', 'promo', 'photos', 'other')),
  title text not null default '',
  status text not null default 'draft' check (status in ('draft', 'ready', 'filmed', 'delivered')),
  minutes integer not null default 20,            -- how long to film it, for the running order
  body jsonb not null default '{}'::jsonb,        -- see lib/scripts.js cleanBody()
  thread jsonb not null default '[]'::jsonb,      -- [{ who, text, at }] notes to each other
  rev integer not null default 1,                 -- bumps on every save; a stale save is refused
  updated_by text not null default 'brandon',     -- 'brandon' | 'client'
  created_by text not null default 'brandon',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scripts_day_idx on public.scripts (day_id, position);
alter table public.scripts enable row level security;
