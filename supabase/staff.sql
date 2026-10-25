-- Staff: second shooters, editors, producers. A staff login sees the
-- projects they're on (planning, people, beats, journal, days) — never
-- money, the inbox, galleries or other clients. Run once.
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null unique,                 -- lowercase; matches their Supabase auth user
  name text not null,
  title text not null default '',             -- "second shooter", "editor"
  phone text not null default '',
  active boolean not null default true,
  notes text not null default ''
);
create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  role text not null default 'crew',          -- crew | lead
  added_at timestamptz not null default now(),
  primary key (project_id, staff_id)
);
alter table public.staff enable row level security;
alter table public.project_members enable row level security;
