-- Roth Media client portal — Phase 1 schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

create table clients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table gallery_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  title text not null,
  url text not null,
  note text,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  paid_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

-- Row-level security: each signed-in client sees only their own rows.
-- You (via the dashboard/service role) can see and edit everything.
alter table clients enable row level security;
alter table gallery_links enable row level security;
alter table payments enable row level security;

create policy "clients read own row" on clients
  for select using (email = auth.jwt() ->> 'email');

create policy "clients read own galleries" on gallery_links
  for select using (
    client_id in (select id from clients where email = auth.jwt() ->> 'email')
  );

create policy "clients read own payments" on payments
  for select using (
    client_id in (select id from clients where email = auth.jwt() ->> 'email')
  );
