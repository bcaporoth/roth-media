-- Sprint 6 — the legal layer. Clearance pass, music cues, archival items,
-- the generic legal register (permits, insurance, drone flights, contracts,
-- chain of title, fair-use memos, defamation review, credits, revocations,
-- minors, safety, permissions), release sub-types, gate overrides.
alter table public.projects add column if not exists gate_overrides jsonb not null default '{}'::jsonb;

alter table public.releases drop constraint if exists releases_kind_check;
alter table public.releases add constraint releases_kind_check
  check (kind in ('appearance', 'liability', 'location', 'minor', 'deal', 'materials', 'group', 'estate', 'clergy', 'phone', 'crowd', 'verbal'));

create table if not exists public.clearance_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null default 'person' check (kind in ('person', 'archival', 'music', 'location', 'trademark', 'claim')),
  label text not null,
  ref_id uuid,
  scene_id uuid,
  segment text not null default '',
  status text not null default 'red' check (status in ('red', 'yellow', 'green')),
  basis text not null default 'none' check (basis in ('none', 'release', 'license', 'public_domain', 'fair_use', 'permission', 'incidental', 'removed')),
  doc text not null default '',
  notes text not null default '',
  reviewer text not null default '',
  reviewed_at timestamptz
);
create index if not exists clearance_items_project_idx on public.clearance_items(project_id, kind);

create table if not exists public.music_cues (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  artist text not null default '',
  publisher text not null default '',
  source text not null default 'temp' check (source in ('temp', 'library', 'composer', 'licensed', 'hymn', 'pd')),
  usage text not null default 'bg' check (usage in ('bg', 'featured', 'theme', 'source')),
  scene_id uuid,
  in_s numeric, out_s numeric,
  sync_status text not null default 'none' check (sync_status in ('none', 'na', 'requested', 'quoted', 'licensed')),
  master_status text not null default 'none' check (master_status in ('none', 'na', 'requested', 'quoted', 'licensed')),
  license_link text not null default '',
  fee_cents integer not null default 0,
  notes text not null default '',
  sort integer not null default 0
);
create index if not exists music_cues_project_idx on public.music_cues(project_id, sort);

create table if not exists public.archival_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  kind text not null default 'photo' check (kind in ('photo', 'film', 'document', 'audio', 'newspaper', 'map', 'other')),
  lender text not null default '',
  rights_holder text not null default '',
  basis text not null default 'unknown' check (basis in ('unknown', 'license', 'public_domain', 'fair_use', 'materials_release', 'owned')),
  reasoning text not null default '',
  fee_cents integer not null default 0,
  release_id uuid,
  status text not null default 'wanted' check (status in ('wanted', 'in_hand', 'cleared', 'rejected')),
  scene_id uuid,
  source_id uuid,
  notes text not null default ''
);
create index if not exists archival_items_project_idx on public.archival_items(project_id);

create table if not exists public.legal_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null,
  title text not null,
  party text not null default '',
  status text not null default 'open',
  date date,
  expires date,
  link text not null default '',
  ref_id uuid,
  scene_id uuid,
  location_id uuid,
  notes text not null default '',
  data jsonb not null default '{}'::jsonb,
  sort integer not null default 0
);
create index if not exists legal_items_project_idx on public.legal_items(project_id, kind);

alter table public.clearance_items enable row level security;
alter table public.music_cues enable row level security;
alter table public.archival_items enable row level security;
alter table public.legal_items enable row level security;
