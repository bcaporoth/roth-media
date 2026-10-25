-- Projects: the job above the dates. A documentary (interviews over weeks),
-- a wedding (engagement + day-of) — one record holding its shoot days, the
-- people in it, the story beats, the archive to-gets and the signed releases.
-- Run once in the Supabase SQL editor.
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  kind text not null default 'documentary',
  client_name text not null default '',
  client_email text not null default '',
  status text not null default 'planning' check (status in ('planning', 'filming', 'editing', 'delivered')),
  logline text not null default '',             -- the one-sentence story
  notes text not null default '',
  beats jsonb not null default '[]'::jsonb,       -- [{ "text", "done", "who" }] story beats, in order
  archive jsonb not null default '[]'::jsonb,     -- [{ "text", "source", "status": "wanted|requested|in_hand" }]
  arc jsonb not null default '{}'::jsonb          -- story arc beats, keys in lib/story-arc.js
);
alter table public.shoots add column if not exists project_id uuid;
create index if not exists shoots_project_idx on public.shoots(project_id);

-- The cast and the sources: who's in the film, who can get you things.
create table if not exists public.project_people (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  role text not null default '',                 -- "pastor", "parishioner since 1962", "county historian"
  kind text not null default 'interview' check (kind in ('interview', 'source', 'crew', 'contact')),
  phone text not null default '',
  email text not null default '',
  status text not null default 'to_reach' check (status in ('to_reach', 'reached', 'scheduled', 'interviewed', 'done', 'declined')),
  shoot_id uuid,                                 -- the day they're on
  scenes text not null default '',               -- which parts of the story they carry
  questions text not null default '',            -- what to ask them
  notes text not null default '',
  quotes jsonb not null default '[]'::jsonb,     -- [{ "text", "at", "when" }] what they said, clip timecode, date
  sort integer not null default 0
);
create index if not exists project_people_project_idx on public.project_people(project_id, sort);

-- Signed releases: appearance (they're in the film), liability (on-the-job),
-- location (we can film here). The signature is a PNG in R2; the exact
-- text they agreed to is stored with it, so the record stands on its own.
create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid references public.projects(id) on delete set null,
  person_id uuid references public.project_people(id) on delete set null,
  shoot_id uuid,
  kind text not null check (kind in ('appearance', 'liability', 'location', 'minor')),
  signer_name text not null,
  signer_email text not null default '',
  signer_phone text not null default '',
  signed_at timestamptz not null default now(),
  signature_key text not null,                   -- releases/<uuid>.png in R2
  text_version text not null,
  body text not null,                            -- the full text as shown at signing
  ip text not null default '',
  user_agent text not null default ''
);
create index if not exists releases_project_idx on public.releases(project_id, signed_at desc);
alter table public.projects enable row level security;
alter table public.project_people enable row level security;
alter table public.releases enable row level security;
