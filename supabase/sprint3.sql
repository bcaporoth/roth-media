-- Sprint 3 — the story engine. Run once in the Supabase SQL editor.
alter table public.projects add column if not exists thesis jsonb not null default '[]'::jsonb;  -- [{v, date, text, one_line, changed}] newest last
alter table public.projects add column if not exists style jsonb not null default '{}'::jsonb;    -- the look: aspect, fps, codec, interview look, references…
alter table public.project_people add column if not exists arc_role text not null default '';     -- keeper | witness | inheritor | outsider | historian | chorus
alter table public.project_people add column if not exists eyeline text not null default '';      -- L | R
alter table public.project_people add column if not exists plan jsonb not null default '{}'::jsonb; -- interview plan: setup, look, lens, wardrobe, mics, duration, must_gets, warmup, pre_notes, energy, best_takes[], debrief

create table if not exists public.chronology (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  date_text text not null,                       -- "1962" · "Spring 1987" · "2015-03-14"
  sort_date date,                                -- for ordering, best guess
  era text not null default '',                  -- founding | growth | decline | near-closure | revival
  title text not null,
  summary text not null default '',
  significance integer not null default 3,       -- 1–5
  evidence text not null default 'single' check (evidence in ('documented', 'single', 'oral', 'disputed')),
  turning_point boolean not null default false,
  people uuid[] not null default '{}',
  source_ids uuid[] not null default '{}',
  scene_id uuid,
  notes text not null default ''
);
create index if not exists chronology_project_idx on public.chronology(project_id, sort_date);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null default 'document' check (kind in ('book', 'article', 'parish_record', 'diocesan_record', 'newspaper', 'photos', 'oral', 'web', 'document')),
  title text not null,
  holder text not null default '',               -- author / who has it
  date_text text not null default '',
  where_text text not null default '',           -- URL, shelf, file
  reliability text not null default 'secondary' check (reliability in ('primary', 'secondary', 'hearsay')),
  obtained boolean not null default false,
  notes text not null default ''
);
create index if not exists sources_project_idx on public.sources(project_id);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  theme text not null default 'general',
  text text not null,
  followups text not null default '',
  beat_index integer,
  people uuid[] not null default '{}',           -- who to ask
  priority integer not null default 2,           -- 1 must · 2 should · 3 nice
  asked jsonb not null default '{}'::jsonb,      -- { person_id: { date, quality 1-5 } }
  sort integer not null default 0
);
create index if not exists questions_project_idx on public.questions(project_id, theme, sort);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  date date, time_text text not null default '',
  recurring text not null default '',            -- "every Sunday 8 & 10:30" / "first Friday"
  location_id uuid,
  why text not null default '',                  -- story purpose
  scene_id uuid,
  access text not null default 'ask' check (access in ('ask', 'asked', 'approved', 'restricted')),
  restrictions text not null default '',
  plan text not null default '',                 -- crew/gear/positions/audio
  status text not null default 'planned' check (status in ('planned', 'shot', 'missed')),
  shoot_id uuid
);
create index if not exists events_project_idx on public.events(project_id, date);
alter table public.chronology enable row level security;
alter table public.sources enable row level security;
alter table public.questions enable row level security;
alter table public.events enable row level security;
