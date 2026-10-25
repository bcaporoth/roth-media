-- Crew link: a no-login page for a second shooter (/crew/<token>) with the
-- day's flow, shots and reminders — both of you tick the same list. Run once.
alter table public.shoots add column if not exists crew_token uuid not null default gen_random_uuid();
create unique index if not exists shoots_crew_token_idx on public.shoots(crew_token);
