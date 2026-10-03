-- Studio → Playbook: Brandon's reusable lists — gear, shot lists, flows of
-- the day, poses & prompts. Run once in the Supabase SQL editor. The app
-- fills it with the starter set the first time the Playbook tab opens.
create table if not exists public.playbook (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  section text not null check (section in ('gear', 'shots', 'flow', 'poses')),
  kind text not null default 'any' check (kind in ('any', 'wedding', 'family', 'business', 'event', 'other')),
  title text not null,
  notes text not null default '',
  items jsonb not null default '[]'::jsonb,   -- [{ "text": "...", "time": "16:30" }]
  auto boolean not null default true,         -- copied onto new shoots of this kind
  sort integer not null default 0
);
create index if not exists playbook_section_idx on public.playbook(section, sort);
alter table public.playbook enable row level security; -- service role only
