-- "Send it later" (Studio → Galleries → Manage → Send it later): the moment
-- the "It's ready" email should go out, and Brandon's line for it. The cron
-- /api/cron/ready (every 5 min) sends what's due and clears both. Safe to re-run.
alter table public.galleries add column if not exists ready_scheduled_at timestamptz;
alter table public.galleries add column if not exists ready_scheduled_note text;
create index if not exists galleries_ready_scheduled_idx on public.galleries (ready_scheduled_at) where ready_scheduled_at is not null;
