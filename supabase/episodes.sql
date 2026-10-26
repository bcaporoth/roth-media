-- Story lines: the film plus episodes (mini-series). Each line has its own arc.
alter table public.projects add column if not exists arcs jsonb not null default '[]'::jsonb;
alter table public.scenes add column if not exists line_id text not null default '';
