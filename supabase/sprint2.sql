-- Sprint 2 — the day machine. Run once in the Supabase SQL editor.
-- Call sheets on the shoot, scene strips, and the media chain (cards → rolls → drives).
alter table public.shoots add column if not exists callsheet jsonb not null default '{}'::jsonb;
  -- { version, issued_at, general_call, wrap_est, crew: [{staff_id, name, position, call, note, confirmed_at}],
  --   cast: [{person_id, name, call, note}], meals, notes, advance, parking, walkie, production_phone }
alter table public.shoots add column if not exists scene_ids uuid[] not null default '{}';
alter table public.shoots add column if not exists weather jsonb not null default '{}'::jsonb; -- cached Open-Meteo snapshot
alter table public.projects add column if not exists production_phone text not null default '';

create table if not exists public.media_cards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,                 -- A01
  camera text not null default 'A',    -- A|B|C|D(drone)|AU(audio)
  capacity_gb integer not null default 0,
  notes text not null default '',
  retired boolean not null default false
);
create index if not exists media_cards_project_idx on public.media_cards(project_id, label);

create table if not exists public.drives (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,                 -- STMARY-WORK-01
  role text not null default 'working' check (role in ('working', 'mirror', 'offsite', 'archive', 'shuttle')),
  capacity_tb numeric not null default 0,
  used_tb numeric not null default 0,
  location text not null default '',
  last_verified date,
  notes text not null default ''
);
create index if not exists drives_project_idx on public.drives(project_id);

-- One roll = one card's worth of footage from one shoot. Status can't pass
-- cleared_to_format until two verified copies exist (enforced in the API).
create table if not exists public.rolls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  shoot_id uuid,
  card_id uuid references public.media_cards(id) on delete set null,
  camera text not null default 'A',
  roll_name text not null,             -- STMARY_261103_A01_R01
  shot_by text not null default '',
  used_gb numeric not null default 0,
  clip_count integer not null default 0,
  offloaded_at timestamptz, offload_tool text not null default '',
  checksum text not null default 'xxhash64', checksum_verified boolean not null default false,
  copy1_drive_id uuid, copy1_verified_at timestamptz,
  copy2_drive_id uuid, copy2_verified_at timestamptz,
  cloud_at timestamptz,
  status text not null default 'in_camera' check (status in ('in_camera', 'offloading', 'copy1', 'copy2', 'cleared', 'formatted')),
  notes text not null default ''
);
create index if not exists rolls_project_idx on public.rolls(project_id, created_at desc);
alter table public.media_cards enable row level security;
alter table public.drives enable row level security;
alter table public.rolls enable row level security;
