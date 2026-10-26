-- Sprint 4 — footage → edit. Clips (the log), proxies on R2, transcripts,
-- selects (bites/b-roll that become the stringout), cuts and screening notes.
create table if not exists public.clips (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  shoot_id uuid,
  roll_id uuid,
  scene_id uuid,
  person_id uuid,
  filename text not null,
  stem text not null default '',
  camera text not null default '',
  card text not null default '',
  duration_s numeric not null default 0,
  width integer not null default 0,
  height integer not null default 0,
  fps numeric not null default 23.976,
  codec text not null default '',
  size_bytes bigint not null default 0,
  start_tc text not null default '',
  rating integer not null default 0,
  keywords text[] not null default '{}',
  notes text not null default '',
  proxy_key text not null default '',
  thumb_key text not null default '',
  transcript_status text not null default 'none' check (transcript_status in ('none', 'queued', 'processing', 'done', 'error')),
  transcript_id text not null default '',
  unique (project_id, filename)
);
create index if not exists clips_project_idx on public.clips(project_id, shoot_id);

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  clip_id uuid not null unique references public.clips(id) on delete cascade,
  source text not null default 'srt',
  text text not null default '',
  words jsonb not null default '[]'::jsonb,
  segments jsonb not null default '[]'::jsonb
);

create table if not exists public.selects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  clip_id uuid not null references public.clips(id) on delete cascade,
  scene_id uuid,
  person_id uuid,
  kind text not null default 'bite' check (kind in ('bite', 'broll', 'sound', 'archival')),
  in_s numeric not null default 0,
  out_s numeric not null default 0,
  text text not null default '',
  note text not null default '',
  rating integer not null default 3,
  sort integer not null default 0
);
create index if not exists selects_project_idx on public.selects(project_id, scene_id, sort);

create table if not exists public.cuts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage text not null default 'stringout' check (stage in ('stringout', 'assembly', 'rough', 'fine', 'lock')),
  version integer not null default 1,
  date date,
  intent text not null default '',
  thesis_v integer,
  scene_order uuid[] not null default '{}',
  runtime_s integer not null default 0,
  link text not null default '',
  notes text not null default '',
  status text not null default 'open' check (status in ('open', 'screened', 'superseded'))
);
create index if not exists cuts_project_idx on public.cuts(project_id, created_at);

create table if not exists public.screening_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  cut_id uuid not null references public.cuts(id) on delete cascade,
  at_s numeric,
  text text not null,
  who text not null default '',
  verdict text not null default '' check (verdict in ('', 'accept', 'reject', 'park')),
  scene_id uuid,
  done boolean not null default false
);
create index if not exists screening_notes_cut_idx on public.screening_notes(cut_id, at_s);

alter table public.clips enable row level security;
alter table public.transcripts enable row level security;
alter table public.selects enable row level security;
alter table public.cuts enable row level security;
alter table public.screening_notes enable row level security;
