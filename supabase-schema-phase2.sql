-- Roth Media client portal — Phase 2: hosted galleries (photos + videos)
-- Run once in the Supabase SQL Editor.

create table galleries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  title text not null,
  event_date date,
  cover_filename text,
  zip_key text,
  media_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table media (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references galleries (id) on delete cascade,
  filename text not null,
  kind text not null default 'photo' check (kind in ('photo', 'video')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table galleries enable row level security;
alter table media enable row level security;

create policy "clients read own hosted galleries" on galleries
  for select using (
    client_id in (select id from clients where email = auth.jwt() ->> 'email')
  );

create policy "clients read own media" on media
  for select using (
    gallery_id in (
      select g.id from galleries g
      join clients c on c.id = g.client_id
      where c.email = auth.jwt() ->> 'email'
    )
  );
