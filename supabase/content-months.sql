-- Monthly content (the retainer) — one row per business client per month.
-- Run once in the Supabase SQL editor (safe to re-run). Server-only table.
create table if not exists public.content_months (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  month text not null,                               -- 'YYYY-MM'
  items jsonb not null default '[]'::jsonb,          -- lib/content-plan.js items, status up to 'posted'
  intro text not null default '',
  notes text not null default '',                    -- Brandon-only
  price_cents integer not null default 0,
  published_at timestamptz,                          -- on their portal once set
  day_id uuid,                                       -- the shoot day made from this month
  stripe_session_id text not null default '',
  pay_url text not null default '',
  paid_cents integer not null default 0,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, month)
);
alter table public.content_months enable row level security;
