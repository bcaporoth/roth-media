-- "It's ready" email (Studio → Galleries → Manage → It's ready): when it was
-- last sent. Safe to re-run.
alter table public.galleries add column if not exists ready_sent_at timestamptz;
