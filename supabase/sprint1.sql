-- Sprint 1 — the production spine. Run once in the Supabase SQL editor.
-- Scenes (the hub), locations, crew deals, budget, conventions,
-- stakeholders + client-visible flags.

-- Conventions + client link on the project
alter table public.projects add column if not exists code text not null default '';            -- STMARY
alter table public.projects add column if not exists conventions jsonb not null default '{}'::jsonb; -- cameras, codec, fps, folder root…
alter table public.projects add column if not exists client_id uuid;                             -- clients.id (portal login)
alter table public.projects add column if not exists milestones jsonb not null default '[]'::jsonb; -- [{key,label,date,done,client_visible}]
alter table public.projects add column if not exists phase text not null default 'development';  -- development|preproduction|production|post|delivery|archive

-- Scenes: everything hangs off a scene
create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  number integer not null default 0,
  title text not null,
  act text not null default '1' check (act in ('1', '2', '3')),
  beat_index integer,                              -- index into projects.beats
  purpose text not null default '',                -- what it does for the argument
  kind text not null default 'interview' check (kind in ('interview', 'verite', 'archival', 'montage', 'transition')),
  people uuid[] not null default '{}',             -- project_people ids carrying it
  location_id uuid,
  est_seconds integer not null default 0,
  status text not null default 'idea' check (status in ('idea', 'planned', 'shot', 'selected', 'assembled', 'cut', 'locked')),
  tchart jsonb not null default '[]'::jsonb,       -- [{said, seen, rel: illustrates|counterpoints|reveals|transitions}]
  broll jsonb not null default '[]'::jsonb,        -- [{text, when, status: wanted|scheduled|shot}]
  notes text not null default '',
  sort integer not null default 0
);
create index if not exists scenes_project_idx on public.scenes(project_id, sort);
alter table public.scenes enable row level security;

-- Locations: every place you'll point a camera
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  kind text not null default 'interior' check (kind in ('church', 'interior', 'exterior', 'home', 'archive', 'broll', 'other')),
  address text not null default '',
  lat double precision, lng double precision,
  contact_name text not null default '', contact_phone text not null default '', contact_email text not null default '',
  authority text not null default '',              -- parish / diocese / city / private
  permit text not null default 'none' check (permit in ('none', 'needed', 'requested', 'granted')),
  coi text not null default 'none' check (coi in ('none', 'needed', 'requested', 'delivered')),
  access_hours text not null default '',
  blackout text not null default '',               -- Mass times, funerals
  parking text not null default '', power text not null default '', sound text not null default '', light text not null default '',
  hazards text not null default '', hospital text not null default '',
  notes text not null default '',
  status text not null default 'idea' check (status in ('idea', 'scouted', 'cleared', 'shot')),
  sort integer not null default 0
);
create index if not exists locations_project_idx on public.locations(project_id, sort);
alter table public.locations enable row level security;
alter table public.shoots add column if not exists location_id uuid;
alter table public.shoots add column if not exists client_visible boolean not null default true;

-- Crew deals: rates live on staff; the per-project deal is a signed release of kind 'deal'
alter table public.staff add column if not exists rate_type text not null default 'day';   -- day|half|hour|flat
alter table public.staff add column if not exists rate_cents integer not null default 0;
alter table public.staff add column if not exists kit_fee_cents integer not null default 0;
alter table public.staff add column if not exists tax_status text not null default '1099'; -- 1099|w2|corp
alter table public.staff add column if not exists emergency text not null default '';
alter table public.staff add column if not exists dietary text not null default '';
alter table public.project_members add column if not exists position text not null default '';
alter table public.project_members add column if not exists rate_cents integer;            -- overrides staff rate on this project
alter table public.project_members add column if not exists deal_release_id uuid;
alter table public.releases drop constraint if exists releases_kind_check;
alter table public.releases add constraint releases_kind_check
  check (kind in ('appearance', 'liability', 'location', 'minor', 'deal', 'materials', 'group'));

-- Budget: top sheet + actuals (owner only)
create table if not exists public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  code text not null,                              -- 2100
  section text not null default 'production',      -- atl|production|post|other
  description text not null,
  unit text not null default 'day',                -- day|week|flat|allow|each
  qty numeric not null default 1,
  rate_cents integer not null default 0,
  notes text not null default '',
  sort integer not null default 0
);
create index if not exists budget_lines_project_idx on public.budget_lines(project_id, sort);
create table if not exists public.cost_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  line_id uuid references public.budget_lines(id) on delete set null,
  shoot_id uuid,
  date date not null default (now() at time zone 'America/New_York')::date,
  vendor text not null default '',
  amount_cents integer not null default 0,
  kind text not null default 'invoice',            -- invoice|card|cash|mileage|perdiem
  paid boolean not null default false,
  notes text not null default ''
);
create index if not exists cost_entries_project_idx on public.cost_entries(project_id, date desc);
alter table public.budget_lines enable row level security;
alter table public.cost_entries enable row level security;
alter table public.projects add column if not exists contingency_pct numeric not null default 10;
alter table public.projects add column if not exists budget_locked_at timestamptz;

-- Client side: who at the client, and what they still owe us
create table if not exists public.project_stakeholders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null, role text not null default '', email text not null default '', phone text not null default '',
  portal_role text not null default 'viewer' check (portal_role in ('approver', 'reviewer', 'viewer')),
  decision_maker boolean not null default false, primary_contact boolean not null default false,
  notes text not null default '',
  sort integer not null default 0
);
create table if not exists public.client_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null, category text not null default 'access',  -- access|document|introduction|approval|scheduling|materials|payment
  due date, done_at timestamptz, note text not null default '', sort integer not null default 0
);
alter table public.project_stakeholders enable row level security;
alter table public.client_tasks enable row level security;
