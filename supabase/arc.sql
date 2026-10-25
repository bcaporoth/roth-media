-- Story arc on a project: the hero's-journey beats, one text per beat.
-- { "status_quo": "...", "inciting": "...", ... } — keys in lib/story-arc.js.
alter table public.projects add column if not exists arc jsonb not null default '{}'::jsonb;
